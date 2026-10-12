import { isScaleId } from "../features/music-theory/scales";
import type { ChordType, PlayMode, ScaleId } from "../types/music";
import { DEFAULT_EFFECTS, type EffectSettings } from "../services/audio/InstrumentEngine";
import { GESTURE_PRESETS, sanitizeGestureConfig, type GestureConfig, type SensitivityPreset } from "./gesture-config";

export type GlideMode = "retrigger" | "hold";

/**
 * Cara memilih nada lewat kamera:
 * - "fingers": tiap jari yang disentuhkan ke ibu jari = nada berbeda, posisi tangan bebas.
 * - "position": posisi horizontal tangan memilih zona nada, cubit untuk membunyikan.
 */
export type NoteInput = "fingers" | "position";

export interface MetronomeSettings {
  enabled: boolean;
  bpm: number;
  beatsPerBar: number;
  /** Volume klik 0..1. */
  volume: number;
  /** Hitungan 1 bar sebelum merekam. */
  countIn: boolean;
  /** Bulatkan panjang loop ke kelipatan bar. */
  quantizeLoop: boolean;
}

export interface AppSettings {
  mode: PlayMode;
  noteInput: NoteInput;
  instrumentId: string;
  drumKitProgram: number;
  root: number;
  scale: ScaleId;
  quantize: boolean;
  startOctave: number;
  octaveCount: number;
  chordType: ChordType;
  /** Velocity default untuk pinch/keyboard 1..127. */
  velocity: number;
  /** Posisi vertikal tangan mengatur ekspresi (CC11). */
  expression: boolean;
  glide: GlideMode;
  maxHands: 1 | 2;
  swipeOctave: boolean;
  volume: number;
  effects: EffectSettings;
  sensitivity: SensitivityPreset | "custom";
  gesture: GestureConfig;
  mirror: boolean;
  showLandmarks: boolean;
  showNoteNames: boolean;
  preferFlats: boolean;
  metronome: MetronomeSettings;
  tutorialDone: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  mode: "melodic",
  noteInput: "fingers",
  instrumentId: "gm-0",
  drumKitProgram: 0,
  root: 0,
  scale: "major",
  quantize: true,
  startOctave: 4,
  octaveCount: 1,
  chordType: "triad",
  velocity: 96,
  expression: false,
  glide: "retrigger",
  maxHands: 2,
  swipeOctave: false,
  volume: 0.8,
  effects: DEFAULT_EFFECTS,
  sensitivity: "normal",
  gesture: GESTURE_PRESETS.normal,
  mirror: true,
  showLandmarks: true,
  showNoteNames: true,
  preferFlats: false,
  metronome: { enabled: false, bpm: 100, beatsPerBar: 4, volume: 0.7, countIn: true, quantizeLoop: true },
  tutorialDone: false,
};

export const OCTAVE_LIMITS = { minStart: 1, maxStart: 7, minCount: 1, maxCount: 4 } as const;

const PLAY_MODES: PlayMode[] = ["melodic", "chord", "drums"];
const CHORD_TYPES: ChordType[] = ["triad", "seventh", "power"];

/** Validasi data dari localStorage/preset (bisa rusak atau versi lama). */
export function sanitizeSettings(input: unknown): AppSettings {
  const d = DEFAULT_SETTINGS;
  const s = isRecord(input) ? input : {};
  const effects = isRecord(s.effects) ? s.effects : {};
  const metro = isRecord(s.metronome) ? s.metronome : {};
  const gesture = isRecord(s.gesture) ? s.gesture : {};
  const sensitivity = s.sensitivity;
  const startOctave = int(s.startOctave, d.startOctave, OCTAVE_LIMITS.minStart, OCTAVE_LIMITS.maxStart);
  return {
    mode: PLAY_MODES.includes(s.mode as PlayMode) ? (s.mode as PlayMode) : d.mode,
    noteInput: s.noteInput === "fingers" || s.noteInput === "position" ? s.noteInput : d.noteInput,
    instrumentId: typeof s.instrumentId === "string" && s.instrumentId.length < 80 ? s.instrumentId : d.instrumentId,
    drumKitProgram: int(s.drumKitProgram, d.drumKitProgram, 0, 127),
    root: int(s.root, d.root, 0, 11),
    scale: isScaleId(s.scale) ? s.scale : d.scale,
    quantize: bool(s.quantize, d.quantize),
    startOctave,
    octaveCount: int(
      s.octaveCount,
      d.octaveCount,
      OCTAVE_LIMITS.minCount,
      Math.min(OCTAVE_LIMITS.maxCount, 9 - startOctave),
    ),
    chordType: CHORD_TYPES.includes(s.chordType as ChordType) ? (s.chordType as ChordType) : d.chordType,
    velocity: int(s.velocity, d.velocity, 1, 127),
    expression: bool(s.expression, d.expression),
    glide: s.glide === "hold" || s.glide === "retrigger" ? s.glide : d.glide,
    maxHands: s.maxHands === 1 ? 1 : 2,
    swipeOctave: bool(s.swipeOctave, d.swipeOctave),
    volume: num(s.volume, d.volume, 0, 1),
    effects: {
      reverb: num(effects.reverb, d.effects.reverb, 0, 1),
      chorus: num(effects.chorus, d.effects.chorus, 0, 1),
      delayMix: num(effects.delayMix, d.effects.delayMix, 0, 1),
      delayTime: num(effects.delayTime, d.effects.delayTime, 0.05, 1),
      delayFeedback: num(effects.delayFeedback, d.effects.delayFeedback, 0, 0.85),
      filter: num(effects.filter, d.effects.filter, 0, 1),
    },
    sensitivity:
      sensitivity === "custom" || (typeof sensitivity === "string" && sensitivity in GESTURE_PRESETS)
        ? (sensitivity as AppSettings["sensitivity"])
        : d.sensitivity,
    gesture: sanitizeGestureConfig({
      ...d.gesture,
      ...Object.fromEntries(
        Object.entries(gesture).filter(([k, v]) => k in d.gesture && typeof v === "number" && Number.isFinite(v)),
      ),
    }),
    mirror: bool(s.mirror, d.mirror),
    showLandmarks: bool(s.showLandmarks, d.showLandmarks),
    showNoteNames: bool(s.showNoteNames, d.showNoteNames),
    preferFlats: bool(s.preferFlats, d.preferFlats),
    metronome: {
      enabled: bool(metro.enabled, d.metronome.enabled),
      bpm: int(metro.bpm, d.metronome.bpm, 40, 220),
      beatsPerBar: int(metro.beatsPerBar, d.metronome.beatsPerBar, 2, 7),
      volume: num(metro.volume, d.metronome.volume, 0, 1),
      countIn: bool(metro.countIn, d.metronome.countIn),
      quantizeLoop: bool(metro.quantizeLoop, d.metronome.quantizeLoop),
    },
    tutorialDone: bool(s.tutorialDone, d.tutorialDone),
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}
function num(v: unknown, fallback: number, lo: number, hi: number): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
}
function int(v: unknown, fallback: number, lo: number, hi: number): number {
  return Math.round(num(v, fallback, lo, hi));
}
