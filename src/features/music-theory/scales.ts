import type { MidiNote, PitchClass, ScaleId } from "../../types/music";
import { mod, pitchClassOf } from "./notes";

export interface ScaleDefinition {
  id: ScaleId;
  label: string;
  /** Interval semiton dari root, menaik, dimulai dari 0. */
  intervals: readonly number[];
}

export const SCALES: Record<ScaleId, ScaleDefinition> = {
  chromatic: { id: "chromatic", label: "Kromatis", intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  major: { id: "major", label: "Mayor", intervals: [0, 2, 4, 5, 7, 9, 11] },
  "natural-minor": { id: "natural-minor", label: "Minor natural", intervals: [0, 2, 3, 5, 7, 8, 10] },
  "harmonic-minor": { id: "harmonic-minor", label: "Minor harmonik", intervals: [0, 2, 3, 5, 7, 8, 11] },
  "major-pentatonic": { id: "major-pentatonic", label: "Pentatonik mayor", intervals: [0, 2, 4, 7, 9] },
  "minor-pentatonic": { id: "minor-pentatonic", label: "Pentatonik minor", intervals: [0, 3, 5, 7, 10] },
  blues: { id: "blues", label: "Blues", intervals: [0, 3, 5, 6, 7, 10] },
  dorian: { id: "dorian", label: "Dorian", intervals: [0, 2, 3, 5, 7, 9, 10] },
  mixolydian: { id: "mixolydian", label: "Mixolydian", intervals: [0, 2, 4, 5, 7, 9, 10] },
};

export const SCALE_IDS = Object.keys(SCALES) as ScaleId[];

export function isScaleId(value: unknown): value is ScaleId {
  return typeof value === "string" && value in SCALES;
}

export function isInScale(note: MidiNote, root: PitchClass, scale: ScaleId): boolean {
  const degree = mod(pitchClassOf(note) - root, 12);
  return SCALES[scale].intervals.includes(degree);
}

/** Semua note dalam skala pada rentang [low, high] inklusif, menaik. */
export function scaleNotesInRange(root: PitchClass, scale: ScaleId, low: MidiNote, high: MidiNote): MidiNote[] {
  const notes: MidiNote[] = [];
  for (let n = low; n <= high; n++) {
    if (isInScale(n, root, scale)) notes.push(n);
  }
  return notes;
}

/**
 * Kuantisasi ke note terdekat dalam skala. Bila jaraknya sama ke atas dan ke bawah,
 * pilih yang lebih rendah agar hasilnya deterministik.
 */
export function quantizeToScale(note: MidiNote, root: PitchClass, scale: ScaleId): MidiNote {
  if (isInScale(note, root, scale)) return note;
  for (let d = 1; d <= 6; d++) {
    if (isInScale(note - d, root, scale)) return note - d;
    if (isInScale(note + d, root, scale)) return note + d;
  }
  return note;
}
