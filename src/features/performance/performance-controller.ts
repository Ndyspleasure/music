import { sanitizeSettings, type AppSettings } from "../../config/app-settings";
import { USER_PACK_BANK_OFFSET, USER_PACK_EXTENSIONS, USER_PACK_MAX_BYTES } from "../../config/assets";
import { GESTURE_PRESETS } from "../../config/gesture-config";
import { DRUM_CHANNEL, DRUM_PADS, METRONOME_CHANNEL, type DrumPad } from "../../data/drum-map";
import { describeError } from "../../services/audio/SpessaSynthEngine";
import { CC, type InstrumentEngine } from "../../services/audio/InstrumentEngine";
import { toCameraError } from "../../services/camera/camera-errors";
import { CameraService } from "../../services/camera/CameraService";
import type { SettingsStorage } from "../../services/storage/settings-storage";
import type { HandTrackingService } from "../../services/tracking/HandTrackingService";
import type { AppState, Toast } from "../../state/app-state";
import type { Store } from "../../state/create-store";
import type { GestureFrame, HandTrackingResult } from "../../types/gesture";
import type { PresetInfo } from "../../types/instrument";
import type { MidiNote, NoteZone } from "../../types/music";
import { GestureInterpreter } from "../hand-tracking/gesture-interpreter";
import { buildCatalog, instrumentPatch, MAIN_BANK_ID, USER_BANK_ID } from "../instruments/catalog";
import { buildNoteLayout } from "../music-theory/note-layout";
import { Looper } from "../recording/looper";
import { Metronome } from "../recording/metronome";
import { exportLoopToMidi } from "../recording/midi-export";
import { GesturePerformer, MELODIC_CHANNEL, triggerDrum, type HandTarget } from "./gesture-performer";
import { NoteManager } from "./note-manager";

export interface ControllerDeps {
  store: Store<AppState>;
  engine: InstrumentEngine;
  camera: CameraService;
  /** Factory agar MediaPipe hanya dimuat saat sesi kamera dimulai. */
  createTracker: () => HandTrackingService;
  storage: SettingsStorage;
  soundFontUrl: string;
  /** Unduh file (diinjeksi agar dapat diuji). */
  download?: (data: Uint8Array, filename: string, mime: string) => void;
}

export interface FrameSnapshot {
  frame: GestureFrame;
  targets: HandTarget[];
  zones: NoteZone[];
}

const TRANSPORT_INTERVAL_MS = 25;
const SAVE_DEBOUNCE_MS = 400;

/**
 * Orkestrator aplikasi (di luar React):
 * Kamera → Hand tracking → GestureInterpreter → GesturePerformer → NoteManager → InstrumentEngine.
 * React hanya membaca state tingkat rendah-frekuensi dari store; data per-frame dikirim
 * langsung ke listener overlay (canvas) tanpa re-render.
 */
export class PerformanceController {
  readonly notes: NoteManager;
  private readonly store: Store<AppState>;
  private readonly engine: InstrumentEngine;
  private readonly camera: CameraService;
  private readonly createTracker: () => HandTrackingService;
  private readonly storage: SettingsStorage;
  private readonly soundFontUrl: string;
  private readonly download: NonNullable<ControllerDeps["download"]>;

  private tracker: HandTrackingService | null = null;
  private unsubscribeTracker: (() => void) | null = null;
  private interpreter: GestureInterpreter;
  private performer: GesturePerformer;
  private metronome: Metronome;
  private looper: Looper;
  private zones: NoteZone[] = [];
  private video: HTMLVideoElement | null = null;
  private frameListeners = new Set<(s: FrameSnapshot) => void>();
  private drumHitListeners = new Set<(pad: DrumPad, velocity: number) => void>();
  private drumTimers = new Set<ReturnType<typeof setTimeout>>();
  private audioPromise: Promise<void> | null = null;
  private mainPresets: PresetInfo[] = [];
  private userPresets: PresetInfo[] = [];
  private transportTimer: ReturnType<typeof setInterval> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private toastId = 0;
  private cleanups: (() => void)[] = [];
  private sessionToken = 0;

  constructor(deps: ControllerDeps) {
    this.store = deps.store;
    this.engine = deps.engine;
    this.camera = deps.camera;
    this.createTracker = deps.createTracker;
    this.storage = deps.storage;
    this.soundFontUrl = deps.soundFontUrl;
    this.download = deps.download ?? downloadBlob;

    const settings = this.storage.loadSettings();
    this.store.setState({ settings, presets: this.storage.loadPresets(), tutorialOpen: !settings.tutorialDone });

    this.notes = new NoteManager(this.engine);
    this.interpreter = new GestureInterpreter({
      config: settings.gesture,
      mirror: settings.mirror,
      maxHands: settings.maxHands,
    });
    this.zones = this.computeZones(settings);
    this.performer = new GesturePerformer(this.notes, this.performerSettings(settings), {
      controlChange: (ch, cc, v) => this.engine.controlChange(ch, cc, v),
      onOctaveShift: (d) => this.shiftOctave(d),
      onDrumHit: (pad, v) => this.emitDrumHit(pad, v),
      onGestureNote: () => this.markTutorial("noteFromGesture"),
    });
    this.metronome = new Metronome(this.engine, METRONOME_CHANNEL, settings.metronome);
    this.looper = new Looper(this.engine, () => this.engine.currentTime(), this.metronome, {
      metronomeEnabled: () => this.settings.metronome.enabled,
      countIn: () => this.settings.metronome.countIn,
      quantize: () => this.settings.metronome.quantizeLoop,
    });

    this.cleanups.push(
      this.notes.onNote((e) => this.looper.capture(e)),
      this.notes.onChange(() => this.publishActiveNotes()),
      this.looper.subscribe((snap) => {
        this.store.setState({ looper: snap });
        this.syncTransportTimer();
      }),
      this.engine.subscribe((snap) => {
        const main = snap.banks[MAIN_BANK_ID];
        const user = snap.banks[USER_BANK_ID];
        this.store.setState((s) => ({
          audio: { status: snap.status, error: snap.error },
          bank: main ? { status: main.status, progress: main.progress, error: main.error } : s.bank,
          userPack: user ? { ...s.userPack, status: user.status, error: user.error } : s.userPack,
        }));
      }),
      this.camera.onEnded(() => {
        this.toast("Kamera terputus atau izinnya dicabut. Sesi dihentikan.", "warning");
        void this.stopSession({ status: "error", error: "Kamera terputus." });
      }),
    );
  }

  get settings(): AppSettings {
    return this.store.getState().settings;
  }

  // ───────────────────────────── Audio ─────────────────────────────

  /**
   * Aktifkan audio. Harus dipicu oleh interaksi pengguna. Memuat SoundFont utama
   * (lazy, sekali saja) lalu menerapkan instrumen/efek yang dipilih.
   */
  ensureAudio(): Promise<void> {
    if (this.audioPromise) {
      void this.engine.resume();
      return this.audioPromise;
    }
    this.audioPromise = (async () => {
      await this.engine.initialize();
      this.applyAudioSettings();
      await this.loadMainBank();
    })().catch((err: unknown) => {
      this.audioPromise = null;
      this.toast(describeError(err, "Audio gagal diaktifkan."), "error");
      throw err;
    });
    return this.audioPromise;
  }

  async retrySoundBank(): Promise<void> {
    if (this.store.getState().audio.status !== "ready") {
      this.audioPromise = null;
      await this.ensureAudio().catch(() => undefined);
      return;
    }
    await this.loadMainBank().catch(() => undefined);
  }

  private async loadMainBank(): Promise<void> {
    if (this.mainPresets.length > 0) return;
    try {
      this.mainPresets = await this.engine.loadSoundBank({
        id: MAIN_BANK_ID,
        source: { kind: "url", url: this.soundFontUrl },
      });
    } catch (err) {
      this.toast(
        `SoundFont gagal dimuat: ${describeError(err, "kesalahan jaringan")}. Coba lagi dari panel status.`,
        "error",
      );
      throw err;
    }
    this.rebuildCatalog();
    this.applyAudioSettings();
  }

  private applyAudioSettings(): void {
    const s = this.settings;
    this.engine.setVolume(s.volume);
    this.engine.setEffects(s.effects);
    this.engine.setChannelIsDrum(DRUM_CHANNEL, true);
    this.engine.setChannelIsDrum(METRONOME_CHANNEL, true);
    this.engine.selectPatch(METRONOME_CHANNEL, { program: 0, bankMSB: 0, bankLSB: 0 });
    this.applyInstrument();
    this.applyDrumKit();
  }

  private applyInstrument(): void {
    const inst = this.currentInstrument();
    if (!inst) return;
    this.engine.setChannelIsDrum(MELODIC_CHANNEL, false);
    this.engine.selectPatch(MELODIC_CHANNEL, instrumentPatch(inst));
  }

  private applyDrumKit(): void {
    this.engine.selectPatch(DRUM_CHANNEL, { program: this.settings.drumKitProgram, bankMSB: 0, bankLSB: 0 });
  }

  currentInstrument() {
    const { catalog, settings } = this.store.getState();
    return catalog.instruments.find((i) => i.id === settings.instrumentId) ?? catalog.instruments[0];
  }

  getOutputLevel(): number {
    return this.engine.getOutputLevel();
  }

  // ───────────────────────────── Sesi kamera ─────────────────────────────

  async startSession(video: HTMLVideoElement): Promise<void> {
    const state = this.store.getState();
    if (state.session === "running" || state.session === "starting") return;
    const token = ++this.sessionToken;
    this.video = video;
    this.store.setState({ session: "starting", camera: { status: "requesting" }, tracker: { status: "loading" } });

    // Audio diinisialisasi di dalam handler klik yang sama (kebijakan autoplay).
    const audio = this.ensureAudio().catch(() => undefined);

    try {
      await this.camera.start(video, { deviceId: state.camera.deviceId });
    } catch (err) {
      const camErr = toCameraError(err);
      if (token !== this.sessionToken) return;
      this.store.setState({
        session: "idle",
        camera: { status: "error", error: camErr.message, errorKind: camErr.kind },
        tracker: { status: "idle" },
      });
      this.toast(camErr.message, "error");
      return;
    }
    if (token !== this.sessionToken) {
      this.camera.stop();
      return;
    }
    this.store.setState((s) => ({ camera: { ...s.camera, status: "active", error: undefined, errorKind: undefined } }));
    void this.refreshCameraDevices();

    try {
      this.tracker ??= this.createTracker();
      await this.tracker.initialize();
      await this.tracker.setNumHands(this.settings.maxHands);
    } catch (err) {
      if (token !== this.sessionToken) return;
      const message = `Model hand tracking gagal dimuat: ${describeError(err, "kesalahan tidak diketahui")}`;
      this.store.setState({ tracker: { status: "error", error: message } });
      this.toast(message, "error");
      await this.stopSession({ status: "off" }, { keepTrackerError: true });
      return;
    }
    if (token !== this.sessionToken) return;

    this.unsubscribeTracker?.();
    this.unsubscribeTracker = this.tracker.onResults((r) => this.handleTracking(r));
    this.tracker.start(video);
    this.store.setState({ session: "running", tracker: { status: "ready" } });
    await audio;
  }

  async stopSession(
    camera: AppState["camera"] = { status: "off" },
    opts: { keepTrackerError?: boolean } = {},
  ): Promise<void> {
    this.sessionToken++;
    this.store.setState({ session: "stopping" });
    this.tracker?.stop();
    this.unsubscribeTracker?.();
    this.unsubscribeTracker = null;
    this.performer.handle({
      timestamp: performance.now(),
      events: this.interpreter.reset(performance.now()),
      hands: [],
    });
    this.performer.releaseAllHands();
    this.notes.releaseOwnersWithPrefix("hand-");
    this.notes.releaseOwnersWithPrefix("drum:hand-");
    this.camera.stop();
    this.camera.detach(this.video);
    this.emitFrame({ timestamp: performance.now(), events: [], hands: [] });
    this.store.setState((s) => ({
      session: "idle",
      camera: { ...camera, deviceId: s.camera.deviceId },
      tracker: opts.keepTrackerError ? s.tracker : { status: this.tracker ? "ready" : "idle" },
      handsDetected: 0,
    }));
  }

  async selectCamera(deviceId: string): Promise<void> {
    this.store.setState((s) => ({ camera: { ...s.camera, deviceId } }));
    if (this.store.getState().session === "running" && this.video) {
      const video = this.video;
      await this.stopSession();
      await this.startSession(video);
    }
  }

  private async refreshCameraDevices(): Promise<void> {
    try {
      const devices = await CameraService.listDevices();
      this.store.setState({
        cameraDevices: devices.map((d, i) => ({ id: d.deviceId, label: d.label || `Kamera ${i + 1}` })),
      });
    } catch {
      // Daftar kamera bersifat opsional.
    }
  }

  /** Jalur utama per-frame. Juga dipakai e2e test (mode debug) untuk menyuntikkan landmark sintetis. */
  handleTracking(result: HandTrackingResult): void {
    const frame = this.interpreter.process(result);
    this.performer.handle(frame);
    if (frame.hands.length !== this.store.getState().handsDetected) {
      this.store.setState({ handsDetected: frame.hands.length });
    }
    if (frame.hands.length > 0) this.markTutorial("handSeen");
    if (frame.events.some((e) => e.type === "pinch-start")) this.markTutorial("pinched");
    this.emitFrame(frame);
  }

  onFrame(listener: (s: FrameSnapshot) => void): () => void {
    this.frameListeners.add(listener);
    return () => this.frameListeners.delete(listener);
  }

  onDrumHit(listener: (pad: DrumPad, velocity: number) => void): () => void {
    this.drumHitListeners.add(listener);
    return () => this.drumHitListeners.delete(listener);
  }

  get trackerFps(): number {
    return this.tracker?.fps ?? 0;
  }

  get noteZones(): NoteZone[] {
    return this.zones;
  }

  private emitFrame(frame: GestureFrame): void {
    const snap: FrameSnapshot = { frame, targets: this.performer.targets(), zones: this.zones };
    for (const l of this.frameListeners) l(snap);
  }

  private emitDrumHit(pad: DrumPad, velocity: number): void {
    for (const l of this.drumHitListeners) l(pad, velocity);
  }

  // ───────────────────────────── Input manual (mouse/keyboard) ─────────────────────────────

  manualNoteOn(owner: string, note: MidiNote, velocity = this.settings.velocity): void {
    void this.ensureAudio().catch(() => undefined);
    for (const n of this.performer.notesForZone(note)) this.notes.noteOn(owner, MELODIC_CHANNEL, n, velocity);
  }

  manualNoteOff(owner: string): void {
    this.notes.releaseOwner(owner);
  }

  hitDrumPad(padId: string, velocity = this.settings.velocity, owner = "manual"): void {
    const pad = DRUM_PADS.find((p) => p.id === padId);
    if (!pad) return;
    void this.ensureAudio().catch(() => undefined);
    triggerDrum(this.notes, `drum:${owner}:${pad.id}`, pad.note, velocity, this.drumTimers);
    this.emitDrumHit(pad, velocity);
  }

  setSustain(on: boolean): void {
    this.engine.controlChange(MELODIC_CHANNEL, CC.SUSTAIN, on ? 127 : 0);
  }

  /** Tombol panik: hentikan semua bunyi. */
  panic(): void {
    this.performer.releaseAllHands();
    this.notes.releaseAll();
    this.engine.allNotesOff();
  }

  // ───────────────────────────── Setelan ─────────────────────────────

  updateSettings(patch: Partial<AppSettings>): void {
    const prev = this.settings;
    let merged: AppSettings = { ...prev, ...patch };
    if (patch.sensitivity && patch.sensitivity !== "custom") merged.gesture = GESTURE_PRESETS[patch.sensitivity];
    if (patch.gesture && !patch.sensitivity) merged.sensitivity = "custom";
    merged = sanitizeSettings(merged);
    this.store.setState({ settings: merged });
    this.scheduleSave();

    if (merged.volume !== prev.volume) this.engine.setVolume(merged.volume);
    if (merged.effects !== prev.effects) this.engine.setEffects(merged.effects);
    if (merged.gesture !== prev.gesture) this.interpreter.setConfig(merged.gesture);
    if (merged.mirror !== prev.mirror) this.interpreter.setMirror(merged.mirror);
    if (merged.maxHands !== prev.maxHands) {
      this.interpreter.setMaxHands(merged.maxHands);
      void this.tracker?.setNumHands(merged.maxHands).catch(() => undefined);
    }
    if (merged.instrumentId !== prev.instrumentId) {
      // Lepas note di kanal melodi sebelum ganti program agar tidak ada note tersangkut.
      this.notes.releaseChannel(MELODIC_CHANNEL);
      this.applyInstrument();
      const inst = this.currentInstrument();
      if (inst && !inst.available && this.mainPresets.length > 0) {
        this.toast(`"${inst.name}" tidak ada di sound bank aktif — synthesizer memakai preset terdekat.`, "warning");
      }
    }
    if (merged.drumKitProgram !== prev.drumKitProgram) {
      this.notes.releaseChannel(DRUM_CHANNEL);
      this.applyDrumKit();
    }
    if (merged.mode !== prev.mode) this.notes.releaseChannel(MELODIC_CHANNEL);
    if (merged.metronome !== prev.metronome) this.applyMetronome(prev);

    this.zones = this.computeZones(merged);
    this.performer.updateSettings(this.performerSettings(merged));
  }

  selectInstrument(id: string): void {
    this.updateSettings({ instrumentId: id });
  }

  shiftOctave(delta: 1 | -1): void {
    const s = this.settings;
    this.updateSettings({ startOctave: s.startOctave + delta });
  }

  private computeZones(s: AppSettings): NoteZone[] {
    return buildNoteLayout({
      root: s.root,
      scale: s.scale,
      quantize: s.quantize,
      startOctave: s.startOctave,
      octaveCount: s.octaveCount,
      preferFlats: s.preferFlats,
    });
  }

  private performerSettings(s: AppSettings) {
    return {
      mode: s.mode,
      zones: this.zones,
      root: s.root,
      scale: s.scale,
      chordType: s.chordType,
      velocity: s.velocity,
      expression: s.expression,
      glide: s.glide,
      swipeOctave: s.swipeOctave,
      zoneHysteresis: s.gesture.zoneHysteresis,
    };
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.storage.saveSettings(this.settings);
    }, SAVE_DEBOUNCE_MS);
  }

  flushSettings(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.storage.saveSettings(this.settings);
  }

  // ───────────────────────────── Preset pengguna ─────────────────────────────

  savePreset(name: string): void {
    this.store.setState({ presets: this.storage.savePreset(name, this.settings) });
    this.toast(`Preset "${name.trim() || "Preset tanpa nama"}" disimpan.`, "success");
  }

  loadPreset(id: string): void {
    const preset = this.store.getState().presets.find((p) => p.id === id);
    if (!preset) return;
    this.updateSettings({ ...preset.settings, tutorialDone: this.settings.tutorialDone });
    this.toast(`Preset "${preset.name}" dimuat.`, "info");
  }

  deletePreset(id: string): void {
    this.store.setState({ presets: this.storage.deletePreset(id) });
  }

  // ───────────────────────────── Sound pack pengguna ─────────────────────────────

  async loadUserPack(file: File): Promise<void> {
    const lower = file.name.toLowerCase();
    if (!USER_PACK_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      this.toast("Format tidak didukung. Gunakan file .sf2, .sf3, .sf4, atau .dls.", "error");
      return;
    }
    if (file.size > USER_PACK_MAX_BYTES) {
      this.toast("File terlalu besar (maksimum 128 MB).", "error");
      return;
    }
    try {
      await this.ensureAudio();
      await this.removeUserPack({ silent: true });
      this.store.setState({ userPack: { status: "loading", name: file.name, presetCount: 0 } });
      const buffer = await file.arrayBuffer();
      this.userPresets = await this.engine.loadSoundBank({
        id: USER_BANK_ID,
        source: { kind: "buffer", buffer },
        bankOffset: USER_PACK_BANK_OFFSET,
      });
      this.store.setState({
        userPack: { status: "ready", name: file.name, presetCount: this.userPresets.filter((p) => !p.isDrum).length },
      });
      this.rebuildCatalog();
      this.toast(
        `Sound pack "${file.name}" dimuat (${this.userPresets.length} preset). File hanya dipakai di browser ini.`,
        "success",
      );
    } catch (err) {
      const message = describeError(err, "File sound pack tidak dapat dibaca.");
      this.userPresets = [];
      this.store.setState({ userPack: { status: "error", name: file.name, presetCount: 0, error: message } });
      this.toast(`Sound pack gagal dimuat: ${message}`, "error");
    }
  }

  async removeUserPack(opts: { silent?: boolean } = {}): Promise<void> {
    if (this.userPresets.length === 0 && this.store.getState().userPack.status === "none") return;
    const usingUser = this.currentInstrument()?.source === "custom-pack";
    this.notes.releaseChannel(MELODIC_CHANNEL);
    await this.engine.removeSoundBank(USER_BANK_ID).catch(() => undefined);
    this.userPresets = [];
    this.store.setState({ userPack: { status: "none", presetCount: 0 } });
    this.rebuildCatalog();
    if (usingUser) this.updateSettings({ instrumentId: "gm-0" });
    if (!opts.silent) this.toast("Sound pack dilepas.", "info");
  }

  private rebuildCatalog(): void {
    const catalog = buildCatalog({
      mainPresets: this.mainPresets,
      userPresets: this.userPresets,
      userPackName: this.store.getState().userPack.name,
    });
    this.store.setState({ catalog });
    const s = this.settings;
    if (!catalog.instruments.some((i) => i.id === s.instrumentId)) this.updateSettings({ instrumentId: "gm-0" });
    if (catalog.drumKits.length > 0 && !catalog.drumKits.some((k) => k.programNumber === s.drumKitProgram)) {
      this.updateSettings({ drumKitProgram: catalog.drumKits[0]?.programNumber ?? 0 });
    }
  }

  // ───────────────────────────── Metronom & looper ─────────────────────────────

  private applyMetronome(prev: AppSettings): void {
    const m = this.settings.metronome;
    this.metronome.setConfig(m);
    if (m.enabled !== prev.metronome.enabled) {
      const looping = this.looper.transportState === "playing" || this.looper.transportState === "overdubbing";
      if (m.enabled) {
        void this.ensureAudio().catch(() => undefined);
        if (!looping) this.metronome.start(this.engine.currentTime() + 0.1);
      } else {
        this.metronome.stop();
      }
      this.syncTransportTimer();
    }
  }

  recordToggle(): void {
    const state = this.looper.transportState;
    if (state === "recording" || state === "overdubbing" || state === "count-in") {
      this.looper.stopRecording();
      return;
    }
    void this.ensureAudio()
      .then(() => {
        const inst = this.currentInstrument();
        this.looper.record({
          patch: inst ? instrumentPatch(inst) : { program: 0, bankMSB: 0, bankLSB: 0 },
          instrumentName: inst?.name ?? "Instrumen",
          drumKit: this.settings.drumKitProgram,
          melodicChannel: MELODIC_CHANNEL,
          drumChannel: DRUM_CHANNEL,
        });
        this.syncTransportTimer();
      })
      .catch(() => undefined);
  }

  playLoop(): void {
    void this.ensureAudio()
      .then(() => this.looper.play())
      .catch(() => undefined);
  }

  stopLoop(): void {
    this.looper.stop();
    if (this.settings.metronome.enabled) this.metronome.start(this.engine.currentTime() + 0.1);
    this.syncTransportTimer();
  }

  clearLoop(): void {
    this.looper.clear();
    if (this.settings.metronome.enabled) this.metronome.start(this.engine.currentTime() + 0.1);
    this.syncTransportTimer();
  }

  toggleLayerMute(id: string): void {
    this.looper.toggleMute(id);
  }

  deleteLayer(id: string): void {
    this.looper.deleteLayer(id);
  }

  loopPhase(): number {
    return this.looper.phase();
  }

  exportMidi(repeats = 2): void {
    const snap = this.looper.snapshot();
    if (!snap.loopLength || snap.layers.length === 0) {
      this.toast("Belum ada loop untuk diekspor.", "warning");
      return;
    }
    const m = this.settings.metronome;
    const data = exportLoopToMidi(snap.layers, {
      bpm: m.bpm,
      beatsPerBar: m.beatsPerBar,
      loopLength: snap.loopLength,
      repeats,
    });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    this.download(data, `gestura-loop-${stamp}.mid`, "audio/midi");
    this.toast("File MIDI diekspor.", "success");
  }

  private syncTransportTimer(): void {
    const looperActive = this.looper.transportState !== "idle" && this.looper.transportState !== "stopped";
    const needed = looperActive || this.metronome.isRunning;
    if (needed && !this.transportTimer) {
      this.transportTimer = setInterval(() => {
        const now = this.engine.currentTime();
        this.metronome.tick(now);
        this.looper.tick();
      }, TRANSPORT_INTERVAL_MS);
    } else if (!needed && this.transportTimer) {
      clearInterval(this.transportTimer);
      this.transportTimer = null;
    }
  }

  // ───────────────────────────── UI helpers ─────────────────────────────

  toast(message: string, kind: Toast["kind"] = "info"): void {
    const id = ++this.toastId;
    this.store.setState((s) => ({ toasts: [...s.toasts.slice(-3), { id, message, kind }] }));
    setTimeout(() => this.dismissToast(id), kind === "error" ? 9000 : 5000);
  }

  dismissToast(id: number): void {
    this.store.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  }

  openTutorial(open: boolean): void {
    this.store.setState({ tutorialOpen: open });
    if (!open && !this.settings.tutorialDone) this.updateSettings({ tutorialDone: true });
  }

  openAbout(open: boolean): void {
    this.store.setState({ aboutOpen: open });
  }

  private markTutorial(key: keyof AppState["tutorialProgress"]): void {
    const p = this.store.getState().tutorialProgress;
    if (!p[key]) this.store.setState({ tutorialProgress: { ...p, [key]: true } });
  }

  private publishActiveNotes(): void {
    const melodic: number[] = [];
    const drums: number[] = [];
    for (const n of this.notes.activeNotes()) {
      if (n.channel === MELODIC_CHANNEL) melodic.push(n.note);
      else if (n.channel === DRUM_CHANNEL) drums.push(n.note);
    }
    melodic.sort((a, b) => a - b);
    const s = this.store.getState();
    if (!sameArray(s.activeNotes, melodic)) this.store.setState({ activeNotes: melodic });
    if (!sameArray(s.activeDrumNotes, drums)) this.store.setState({ activeDrumNotes: drums });
  }

  /** Pause/hidden tab: lepaskan note milik tangan (loop tracking juga berhenti saat tab tersembunyi). */
  handleVisibilityHidden(): void {
    this.performer.releaseAllHands();
    this.notes.releaseOwnersWithPrefix("hand-");
  }

  async dispose(): Promise<void> {
    await this.stopSession();
    this.flushSettings();
    this.looper.clear();
    this.metronome.stop();
    this.syncTransportTimer();
    this.performer.dispose();
    for (const t of this.drumTimers) clearTimeout(t);
    this.notes.releaseAll();
    for (const c of this.cleanups) c();
    this.tracker?.dispose();
    this.tracker = null;
    await this.engine.dispose();
    this.audioPromise = null;
  }
}

function sameArray(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function downloadBlob(data: Uint8Array, filename: string, mime: string): void {
  const blob = new Blob([data.slice().buffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
