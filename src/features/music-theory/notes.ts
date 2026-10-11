import type { MidiNote, PitchClass } from "../../types/music";

export const MIDI_MIN = 0;
export const MIDI_MAX = 127;

const SHARP_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"] as const;
const FLAT_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"] as const;

/** Nama kelas nada untuk ditampilkan di UI (mis. root/key picker). */
export function pitchClassName(pc: PitchClass, preferFlats = false): string {
  const names = preferFlats ? FLAT_NAMES : SHARP_NAMES;
  return names[mod(pc, 12)] ?? "?";
}

export function pitchClassOf(note: MidiNote): PitchClass {
  return mod(note, 12);
}

/** Oktaf ilmiah: MIDI 60  = C4. */
export function octaveOf(note: MidiNote): number {
  return Math.floor(note / 12) - 1;
}

/** "C4", "F♯3", ... */
export function midiToNoteName(note: MidiNote, preferFlats = false): string {
  return `${pitchClassName(pitchClassOf(note), preferFlats)}${octaveOf(note)}`;
}

/** Nomor MIDI untuk kelas nada + oktaf (C4 = 60). */
export function noteNumber(pc: PitchClass, octave: number): MidiNote {
  return (octave + 1) * 12 + mod(pc, 12);
}

export function clampMidi(value: number): MidiNote {
  return Math.min(MIDI_MAX, Math.max(MIDI_MIN, Math.round(value)));
}

export function isValidMidiNote(value: number): boolean {
  return Number.isInteger(value) && value >= MIDI_MIN && value <= MIDI_MAX;
}

export function midiToFrequency(note: MidiNote): number {
  return 440 * 2 ** ((note - 69) / 12);
}

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}
