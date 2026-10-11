import { DRUM_CHANNEL, drumPadAt, type DrumPad } from "../../data/drum-map";
import type { GestureEvent, GestureFrame } from "../../types/gesture";
import type { ChordType, MidiNote, NoteZone, PitchClass, PlayMode, ScaleId } from "../../types/music";
import { CC } from "../../services/audio/InstrumentEngine";
import { buildChord } from "../music-theory/chords";
import { ZoneTracker } from "../music-theory/note-layout";
import type { NoteManager } from "./note-manager";

export const MELODIC_CHANNEL = 0;
/** Lama note drum ditahan sebelum note-off (drum GM bersifat one-shot). */
export const DRUM_NOTE_MS = 150;
/** Jeda minimum antar pukulan pada pad yang sama. */
export const DRUM_PAD_COOLDOWN_MS = 70;

export interface PerformerSettings {
  mode: PlayMode;
  zones: NoteZone[];
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
}

/** Info per-tangan untuk overlay (zona yang sedang ditunjuk). */
export interface HandTarget {
  handId: string;
  zone: number;
  pad?: string;
  pinching: boolean;
}

/**
 * Menerjemahkan event gesture menjadi aksi musik melalui NoteManager.
 * Melodi/akor: pinch  = note-on di zona, lepas = note-off. Drum: pukulan/pinch  = hit pad.
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
    const modeChanged = next.mode !== this.settings.mode;
    const layoutChanged =
      next.zones.length !== this.settings.zones.length ||
      next.zones.some((z, i) => z.note !== this.settings.zones[i]?.note);
    this.settings = next;
    for (const h of this.hands.values()) h.tracker.setHysteresis(next.zoneHysteresis);
    if (modeChanged || layoutChanged) this.releaseAllHands();
  }

  handle(frame: GestureFrame): void {
    for (const e of frame.events) this.handleEvent(e);
  }

  handleEvent(e: GestureEvent): void {
    switch (e.type) {
      case "hand-found":
        this.state(e.handId);
        break;
      case "pointer-move":
        this.onMove(e.handId, e.x, e.y);
        break;
      case "pinch-start":
        this.onPinchStart(e.handId, e.x, e.y);
        break;
      case "pinch-end":
        this.onPinchEnd(e.handId);
        break;
      case "strike":
        if (this.settings.mode === "drums") this.hitPad(e.handId, e.x, e.y, e.velocity, e.timestamp);
        break;
      case "swipe":
        if (
          this.settings.swipeOctave &&
          this.settings.mode !== "drums" &&
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
    return [...this.hands].map(([handId, h]) => ({ handId, zone: h.zone, pinching: h.pinching }));
  }

  releaseAllHands(): void {
    for (const id of this.hands.keys()) this.notes.releaseOwner(id);
    for (const h of this.hands.values()) {
      h.pinching = false;
      h.tracker.reset();
      h.zone = -1;
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
      s = { tracker: new ZoneTracker(this.settings.zoneHysteresis), zone: -1, pinching: false };
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
    if (!pad) return;
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
