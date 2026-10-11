/** Nomor note MIDI 0–127. Middle C (C4) = 60. */
export type MidiNote = number;

/** Kelas nada 0–11 (0 = C). */
export type PitchClass = number;

/** Kanal MIDI 0–15. Kanal 9 (0-based) adalah kanal perkusi GM. */
export type MidiChannel = number;

export type ScaleId =
  | "chromatic"
  | "major"
  | "natural-minor"
  | "harmonic-minor"
  | "major-pentatonic"
  | "minor-pentatonic"
  | "blues"
  | "dorian"
  | "mixolydian";

export type PlayMode = "melodic" | "chord" | "drums";

export type ChordType = "triad" | "seventh" | "power";

/** Patch yang dapat dipilih di synthesizer: program 0–127 + bank select. */
export interface MidiPatch {
  program: number;
  bankMSB: number;
  bankLSB: number;
}

/** Satu zona nada di area bermain (sumbu horizontal). */
export interface NoteZone {
  index: number;
  note: MidiNote;
  label: string;
  inScale: boolean;
  isRoot: boolean;
}
