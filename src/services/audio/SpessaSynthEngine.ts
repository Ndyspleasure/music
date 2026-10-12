import type { MIDIController } from "spessasynth_core";
import type { WorkletSynthesizer } from "spessasynth_lib";
import type { PresetInfo } from "../../types/instrument";
import type { MidiChannel, MidiNote, MidiPatch } from "../../types/music";
import { fetchWithProgress } from "../../utils/fetch-with-progress";
import {
  CC,
  DEFAULT_EFFECTS,
  type EffectSettings,
  type EngineSnapshot,
  type InstrumentEngine,
  type SoundBankLoadOptions,
} from "./InstrumentEngine";

export interface SpessaSynthEngineOptions {
  /** URL AudioWorklet processor SpessaSynth (disalin ke public/vendor saat build). */
  workletUrl: string;
}

/** Rentang cutoff filter low-pass (Hz) untuk nilai 0..1. */
const FILTER_MIN_HZ = 200;
const FILTER_MAX_HZ = 20000;

/**
 * Adapter InstrumentEngine berbasis spessasynth_lib (AudioWorklet).
 * Graf audio: synth → low-pass → (dry + delay) → master gain → analyser → output.
 */
export class SpessaSynthEngine implements InstrumentEngine {
  private ctx: AudioContext | null = null;
  private synth: WorkletSynthesizer | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private delay: DelayNode | null = null;
  private delaySend: GainNode | null = null;
  private delayFeedback: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private levelBuffer: Float32Array<ArrayBuffer> | null = null;
  private initPromise: Promise<void> | null = null;
  private volume = 0.8;
  private effects: EffectSettings = DEFAULT_EFFECTS;
  private snapshot: EngineSnapshot = { status: "idle", banks: {} };
  private listeners = new Set<(s: EngineSnapshot) => void>();
  private readonly options: SpessaSynthEngineOptions;

  constructor(options: SpessaSynthEngineOptions) {
    this.options = options;
  }

  initialize(): Promise<void> {
    if (this.snapshot.status === "ready") return this.resume();
    this.initPromise ??= this.doInitialize().catch((err: unknown) => {
      this.initPromise = null;
      this.update({ status: "error", error: describeError(err, "Audio engine gagal diinisialisasi") });
      throw err;
    });
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    if (typeof AudioContext === "undefined" || typeof AudioWorkletNode === "undefined") {
      throw new Error("Browser ini tidak mendukung Web Audio API / AudioWorklet.");
    }
    this.update({ status: "initializing", error: undefined });
    // AudioContext dibuat sekali (di dalam interaksi pengguna) dan dipakai selama sesi.
    const ctx = new AudioContext({ latencyHint: "interactive" });
    this.ctx = ctx;
    void ctx.resume();
    // Library synth (±400 kB) dimuat lazy: bundle awal tetap kecil.
    const [{ WorkletSynthesizer }] = await Promise.all([
      import("spessasynth_lib"),
      ctx.audioWorklet.addModule(this.options.workletUrl),
    ]);
    const synth = new WorkletSynthesizer(ctx);
    this.synth = synth;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.7;
    const master = ctx.createGain();
    const delay = ctx.createDelay(1.5);
    const delaySend = ctx.createGain();
    const delayFeedback = ctx.createGain();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;

    synth.connect(filter);
    filter.connect(master);
    filter.connect(delaySend);
    delaySend.connect(delay);
    delay.connect(delayFeedback);
    delayFeedback.connect(delay);
    delay.connect(master);
    master.connect(analyser);
    analyser.connect(ctx.destination);

    Object.assign(this, { filter, master, delay, delaySend, delayFeedback, analyser });
    this.levelBuffer = new Float32Array(analyser.fftSize);

    await synth.isReady;
    this.applyVolume();
    this.applyEffects();
    this.update({ status: "ready" });
  }

  async resume(): Promise<void> {
    if (this.ctx && this.ctx.state !== "running") await this.ctx.resume();
  }

  async loadSoundBank(opts: SoundBankLoadOptions): Promise<PresetInfo[]> {
    const synth = this.requireSynth();
    this.setBank(opts.id, { status: "loading", progress: 0 });
    try {
      let buffer: ArrayBuffer;
      if (opts.source.kind === "url") {
        buffer = await fetchWithProgress(opts.source.url, {
          signal: opts.signal,
          onProgress: (p) => {
            this.setBank(opts.id, { status: "loading", progress: p * 0.9 });
            opts.onProgress?.(p * 0.9);
          },
        });
      } else {
        buffer = opts.source.buffer;
      }
      const before = new Set(synth.presetList.map(presetKey));
      await synth.soundBankManager.addSoundBank(buffer, opts.id, opts.bankOffset ?? 0);
      await synth.isReady;
      const added = synth.presetList.filter((p) => !before.has(presetKey(p))).map(toPresetInfo);
      this.setBank(opts.id, { status: "ready", progress: 1 });
      opts.onProgress?.(1);
      return added;
    } catch (err) {
      const message = describeError(err, "Sound bank gagal dimuat");
      this.setBank(opts.id, { status: "error", progress: 0, error: message });
      throw new Error(message, { cause: err });
    }
  }

  async removeSoundBank(id: string): Promise<void> {
    if (!this.synth) return;
    this.allNotesOff();
    await this.synth.soundBankManager.deleteSoundBank(id);
    const banks = { ...this.snapshot.banks };
    delete banks[id];
    this.update({ banks });
  }

  getPresets(): PresetInfo[] {
    return this.synth?.presetList.map(toPresetInfo) ?? [];
  }

  selectPatch(channel: MidiChannel, patch: MidiPatch): void {
    const synth = this.synth;
    if (!synth) return;
    synth.controllerChange(channel, CC.BANK_SELECT_MSB as MIDIController, clamp7(patch.bankMSB));
    synth.controllerChange(channel, CC.BANK_SELECT_LSB as MIDIController, clamp7(patch.bankLSB));
    synth.programChange(channel, clamp7(patch.program));
  }

  setChannelIsDrum(channel: MidiChannel, isDrum: boolean): void {
    this.synth?.midiChannels[channel]?.setDrums(isDrum);
  }

  noteOn(channel: MidiChannel, note: MidiNote, velocity: number, time?: number): void {
    this.synth?.noteOn(channel, clamp7(note), Math.max(1, clamp7(velocity)), timeOpt(time));
  }

  noteOff(channel: MidiChannel, note: MidiNote, time?: number): void {
    this.synth?.noteOff(channel, clamp7(note), timeOpt(time));
  }

  controlChange(channel: MidiChannel, controller: number, value: number, time?: number): void {
    this.synth?.controllerChange(channel, clamp7(controller) as MIDIController, clamp7(value), timeOpt(time));
  }

  setVolume(value: number): void {
    this.volume = Math.min(1, Math.max(0, value));
    this.applyVolume();
  }

  setEffects(effects: EffectSettings): void {
    this.effects = effects;
    this.applyEffects();
  }

  channelNotesOff(channel: MidiChannel, time?: number): void {
    if (!this.synth) return;
    this.synth.controllerChange(channel, CC.SUSTAIN as MIDIController, 0, timeOpt(time));
    this.synth.controllerChange(channel, CC.ALL_NOTES_OFF as MIDIController, 0, timeOpt(time));
  }

  allNotesOff(): void {
    if (!this.synth) return;
    for (let ch = 0; ch < 16; ch++) this.synth.controllerChange(ch, CC.SUSTAIN as MIDIController, 0);
    this.synth.stopAll(false);
  }

  currentTime(): number {
    return this.ctx?.currentTime ?? 0;
  }

  getOutputLevel(): number {
    if (!this.analyser || !this.levelBuffer) return 0;
    this.analyser.getFloatTimeDomainData(this.levelBuffer);
    let sum = 0;
    for (const v of this.levelBuffer) sum += v * v;
    return Math.sqrt(sum / this.levelBuffer.length);
  }

  getSnapshot(): EngineSnapshot {
    return this.snapshot;
  }

  subscribe(listener: (s: EngineSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async dispose(): Promise<void> {
    try {
      this.synth?.stopAll(true);
      this.synth?.destroy();
    } catch {
      // abaikan: synth mungkin sudah rusak bila inisialisasi gagal
    }
    this.synth = null;
    const ctx = this.ctx;
    this.ctx = null;
    this.initPromise = null;
    if (ctx && ctx.state !== "closed") await ctx.close();
    this.update({ status: "disposed", banks: {} });
  }

  private applyVolume(): void {
    if (this.master && this.ctx) {
      // Kurva kuadrat terasa lebih natural untuk slider volume.
      this.master.gain.setTargetAtTime(this.volume * this.volume, this.ctx.currentTime, 0.02);
    }
  }

  private applyEffects(): void {
    const e = this.effects;
    if (this.synth) {
      this.synth.setSystemParameter("reverbGain", clamp01(e.reverb) * 1.5);
      this.synth.setSystemParameter("chorusGain", clamp01(e.chorus) * 1.5);
    }
    if (this.ctx && this.filter && this.delay && this.delaySend && this.delayFeedback) {
      const t = this.ctx.currentTime;
      const hz = FILTER_MIN_HZ * (FILTER_MAX_HZ / FILTER_MIN_HZ) ** clamp01(e.filter);
      this.filter.frequency.setTargetAtTime(hz, t, 0.03);
      this.delay.delayTime.setTargetAtTime(Math.min(1, Math.max(0.05, e.delayTime)), t, 0.05);
      this.delaySend.gain.setTargetAtTime(clamp01(e.delayMix), t, 0.03);
      this.delayFeedback.gain.setTargetAtTime(Math.min(0.85, Math.max(0, e.delayFeedback)), t, 0.03);
    }
  }

  private requireSynth(): WorkletSynthesizer {
    if (!this.synth) throw new Error("Audio engine belum diinisialisasi.");
    return this.synth;
  }

  private setBank(id: string, state: EngineSnapshot["banks"][string]): void {
    this.update({ banks: { ...this.snapshot.banks, [id]: state } });
  }

  private update(patch: Partial<EngineSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const l of this.listeners) l(this.snapshot);
  }
}

interface RawPreset {
  name: string;
  program: number;
  bankMSB: number;
  bankLSB: number;
  isDrum: boolean;
}

function toPresetInfo(p: RawPreset): PresetInfo {
  return { name: p.name, program: p.program, bankMSB: p.bankMSB, bankLSB: p.bankLSB, isDrum: p.isDrum };
}

function presetKey(p: RawPreset): string {
  return `${p.isDrum ? "d" : "m"}:${p.bankMSB}:${p.bankLSB}:${p.program}`;
}

function timeOpt(time?: number): { time: number } | undefined {
  return time === undefined ? undefined : { time };
}

function clamp7(v: number): number {
  return Math.min(127, Math.max(0, Math.round(v)));
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export function describeError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  return fallback;
}
