import type { NoteInput } from "../../config/app-settings";
import { DRUM_CHANNEL, drumPadAt, fingerDrumPad, type DrumPad } from "../../data/drum-map";
import type { FingerId, GestureEvent, GestureFrame, HandSide } from "../../types/gesture";
import type { ChordType, MidiNote, NoteZone, PitchClass, PlayMode, ScaleId } from "../../types/music";
import { CC } from "../../services/audio/InstrumentEngine";
import { buildChord } from "../music-theory/chords";
import { fingerSlot, ZoneTracker } from "../music-theory/note-layout";
import type { NoteManager } from "./note-manager";

export const MELODIC_CHANNEL = 0;
/** Lama note drum ditahan sebelum note-off (drum GM bersifat one-shot). */
export const DRUM_NOTE_MS = 150;
/** Jeda minimum antar pukulan pada pad yang sama. */
export const DRUM_PAD_COOLDOWN_MS = 70;

export interface PerformerSettings {
  mode: PlayMode;
  noteInput: NoteInput;
  zones: NoteZone[];
  /** Nada per slot jari (lihat `fingerSlot`), dipakai saat noteInput = "fingers". */
  fingerNotes: MidiNote[];
  root: PitchClass;
  scale: ScaleId;
  chordType: ChordType;
  velocity: number;
  expression: boolean;
  glide: "retrigger" | "hold";
  swipeOctave: boolean;
  zoneHysteresis: number;
}

export interface PerformerCallbacks {
  controlChange(channel: number, controller: number, value: number): void;
  onOctaveShift?(delta: 1 | -1): void;
  onDrumHit?(pad: DrumPad, velocity: number): void;
  /** Dipanggil saat sebuah gesture pertama kali menghasilkan note (untuk tutorial). */
  onGestureNote?(): void;
}

interface HandPlayState {
  tracker: ZoneTracker;
  zone: number;
  pinching: boolean;
  /** Slot jari yang sedang ditekan (mode input "Jari"), -1 bila tidak ada. */
  slot: number;
}

/** Info per-tangan untuk overlay (zona/slot jari yang sedang aktif). */
export interface HandTarget {
  handId: string;
  zone: number;
  slot: number;
  pad?: string;
  pinching: boolean;
}

/**
 * Menerjemahkan event gesture menjadi aksi musik melalui NoteManager.
 * Input "Jari": sentuhan ibu jari ke telunjuk/tengah/manis/kelingking = note-on slot jari itu,
 * lepas = note-off; drum: tiap jari = satu pad. Input "Posisi": pinch = note-on di zona,
 * lepas = note-off; drum: pukulan/pinch = hit pad di posisi tangan.
 */
export class GesturePerformer {
  private hands = new Map<string, HandPlayState>();
  private lastExpression = -1;
  private drumTimers = new Set<ReturnType<typeof setTimeout>>();
  private lastPadHit = new Map<string, number>();
  private notes: NoteManager;
  private settings: PerformerSettings;
  private callbacks: PerformerCallbacks;

  constructor(notes: NoteManager, settings: PerformerSettings, callbacks: PerformerCallbacks) {
    this.notes = notes;
    this.settings = settings;
    this.callbacks = callbacks;
  }

  updateSettings(next: PerformerSettings): void {
    const modeChanged = next.mode !== this.settings.mode || next.noteInput !== this.settings.noteInput;
    const layoutChanged =
      next.zones.length !== this.settings.zones.length ||
      next.zones.some((z, i) => z.note !== this.settings.zones[i]?.note) ||
      next.fingerNotes.some((n, i) => n !== this.settings.fingerNotes[i]);
    this.settings = next;
    for (const h of this.hands.values()) h.tracker.setHysteresis(next.zoneHysteresis);
    if (modeChanged || layoutChanged) this.releaseAllHands();
  }

  handle(frame: GestureFrame): void {
    for (const e of frame.events) this.handleEvent(e);
  }

  handleEvent(e: GestureEvent): void {
    const fingers = this.settings.noteInput === "fingers";
    switch (e.type) {
      case "hand-found":
        this.state(e.handId);
        break;
      case "pointer-move":
        if (fingers) this.onFingerMove(e.handId, e.y);
        else this.onMove(e.handId, e.x, e.y);
        break;
      case "pinch-start":
        if (!fingers) this.onPinchStart(e.handId, e.x, e.y);
        break;
      case "pinch-end":
        if (!fingers) this.onPinchEnd(e.handId);
        break;
      case "finger-down":
        if (fingers) this.onFingerDown(e.handId, e.side, e.finger, e.timestamp);
        break;
      case "finger-up":
        if (fingers) this.onFingerUp(e.handId);
        break;
      case "strike":
        if (this.settings.mode === "drums" && !fingers) this.hitPad(e.handId, e.x, e.y, e.velocity, e.timestamp);
        break;
      case "swipe":
        if (
          this.settings.swipeOctave &&
          this.settings.mode !== "drums" &&
          (this.hands.get(e.handId)?.slot ?? -1) < 0 &&
          (e.direction === "left" || e.direction === "right")
        ) {
          this.callbacks.onOctaveShift?.(e.direction === "right" ? 1 : -1);
        }
        break;
      case "hand-lost":
        this.notes.releaseOwner(e.handId);
        this.hands.delete(e.handId);
        break;
    }
  }

  /** Zona/pad yang sedang ditunjuk tiap tangan (untuk visual). */
  targets(): HandTarget[] {
    return [...this.hands].map(([handId, h]) => ({ handId, zone: h.zone, slot: h.slot, pinching: h.pinching }));
  }

  releaseAllHands(): void {
    for (const id of this.hands.keys()) this.notes.releaseOwner(id);
    for (const h of this.hands.values()) {
      h.pinching = false;
      h.tracker.reset();
      h.zone = -1;
      h.slot = -1;
    }
  }

  dispose(): void {
    this.releaseAllHands();
    this.hands.clear();
    for (const t of this.drumTimers) clearTimeout(t);
    this.drumTimers.clear();
    this.notes.releaseOwnersWithPrefix("drum:");
  }

  private state(handId: string): HandPlayState {
    let s = this.hands.get(handId);
    if (!s) {
      s = { tracker: new ZoneTracker(this.settings.zoneHysteresis), zone: -1, pinching: false, slot: -1 };
      this.hands.set(handId, s);
    }
    return s;
  }

  private onMove(handId: string, x: number, y: number): void {
    const s = this.state(handId);
    if (this.settings.mode === "drums") return;
    const zone = s.tracker.resolve(x, this.settings.zones.length);
    if (s.pinching && zone !== s.zone && this.settings.glide === "retrigger") {
      this.notes.releaseOwner(handId);
      s.zone = zone;
      this.playZone(handId, zone);
    } else if (!s.pinching) {
      s.zone = zone;
    }
    if (s.pinching && this.settings.expression) this.sendExpression(y);
  }

  private onFingerDown(handId: string, side: HandSide, finger: FingerId, now: number): void {
    const s = this.state(handId);
    const slot = fingerSlot(side, finger);
    s.slot = slot;
    if (this.settings.mode === "drums") {
      const pad = fingerDrumPad(slot);
      if (pad) this.hitDrum(handId, pad, this.settings.velocity, now);
      return;
    }
    // Ganti jari tanpa membuka tangan: lepas nada sebelumnya dulu (legato).
    this.notes.releaseOwner(handId);
    const note = this.settings.fingerNotes[slot];
    if (note === undefined) return;
    let played = false;
    for (const n of this.notesForZone(note))
      played = this.notes.noteOn(handId, MELODIC_CHANNEL, n, this.settings.velocity) || played;
    if (played) this.callbacks.onGestureNote?.();
  }

  private onFingerUp(handId: string): void {
    const s = this.hands.get(handId);
    if (s) s.slot = -1;
    if (this.settings.mode !== "drums") this.notes.releaseOwner(handId);
  }

  private onFingerMove(handId: string, y: number): void {
    const s = this.state(handId);
    if (s.slot >= 0 && this.settings.mode !== "drums" && this.settings.expression) this.sendExpression(y);
  }

  private onPinchStart(handId: string, x: number, y: number): void {
    const s = this.state(handId);
    s.pinching = true;
    if (this.settings.mode === "drums") {
      this.hitPad(handId, x, y, this.settings.velocity, performance.now());
      return;
    }
    s.zone = s.tracker.resolve(x, this.settings.zones.length);
    if (this.settings.expression) this.sendExpression(y);
    this.playZone(handId, s.zone);
  }

  private onPinchEnd(handId: string): void {
    const s = this.hands.get(handId);
    if (s) s.pinching = false;
    this.notes.releaseOwner(handId);
  }

  private playZone(handId: string, zoneIndex: number): void {
    const zone = this.settings.zones[zoneIndex];
    if (!zone) return;
    const notes = this.notesForZone(zone.note);
    let played = false;
    for (const n of notes) played = this.notes.noteOn(handId, MELODIC_CHANNEL, n, this.settings.velocity) || played;
    if (played) this.callbacks.onGestureNote?.();
  }

  notesForZone(note: MidiNote): MidiNote[] {
    const { mode, chordType, root, scale } = this.settings;
    return mode === "chord" ? buildChord(note, chordType, root, scale) : [note];
  }

  private hitPad(handId: string, x: number, y: number, velocity: number, now: number): void {
    const pad = drumPadAt(x, y);
    if (pad) this.hitDrum(handId, pad, velocity, now);
  }

  private hitDrum(handId: string, pad: DrumPad, velocity: number, now: number): void {
    const last = this.lastPadHit.get(pad.id) ?? -Infinity;
    if (now - last < DRUM_PAD_COOLDOWN_MS) return;
    this.lastPadHit.set(pad.id, now);
    triggerDrum(this.notes, `drum:${handId}:${pad.id}`, pad.note, velocity, this.drumTimers);
    this.callbacks.onDrumHit?.(pad, velocity);
    this.callbacks.onGestureNote?.();
  }

  private sendExpression(y: number): void {
    // Atas layar = ekspresi penuh, bawah = lembut.
    const value = Math.round(40 + (1 - Math.min(1, Math.max(0, y))) * 87);
    if (Math.abs(value - this.lastExpression) < 2) return;
    this.lastExpression = value;
    this.callbacks.controlChange(MELODIC_CHANNEL, CC.EXPRESSION, value);
  }
}

/** Pukul drum one-shot: note-on lalu note-off otomatis. */
export function triggerDrum(
  notes: NoteManager,
  owner: string,
  note: MidiNote,
  velocity: number,
  timers: Set<ReturnType<typeof setTimeout>>,
): void {
  // Pukulan beruntun pada pad yang sama: lepas yang lama dulu agar terdengar retrigger.
  notes.releaseOwner(owner);
  notes.noteOn(owner, DRUM_CHANNEL, note, velocity);
  const t = setTimeout(() => {
    timers.delete(t);
    notes.noteOff(owner, DRUM_CHANNEL, note);
  }, DRUM_NOTE_MS);
  timers.add(t);
}
