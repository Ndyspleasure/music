import type { ChordType, MidiNote, PitchClass, ScaleId } from "../../types/music";
import { MIDI_MAX } from "./notes";
import { isInScale, quantizeToScale } from "./scales";

export const CHORD_TYPES: { id: ChordType; label: string }[] = [
  { id: "triad", label: "Triad" },
  { id: "seventh", label: "Septim" },
  { id: "power", label: "Power (1-5-8)" },
];

/**
 * Bangun akor dengan root di `note`.
 * - Skala diatonis: akor disusun dari nada skala (tumpukan terts) sehingga selalu cocok dengan key.
 * - Kromatis: akor mayor (triad) / dominan 7 (septim).
 * - Power: root + kuint + oktaf.
 */
export function buildChord(note: MidiNote, type: ChordType, root: PitchClass, scale: ScaleId): MidiNote[] {
  let notes: MidiNote[];
  if (type === "power") {
    notes = [note, note + 7, note + 12];
  } else if (scale === "chromatic") {
    notes = type === "seventh" ? [note, note + 4, note + 7, note + 10] : [note, note + 4, note + 7];
  } else {
    const base = isInScale(note, root, scale) ? note : quantizeToScale(note, root, scale);
    const steps = type === "seventh" ? 4 : 3;
    notes = [base];
    let candidate = base;
    while (notes.length < steps) {
      // Lompati satu nada skala (terts diatonis).
      let skipped = 0;
      while (skipped < 2 && candidate < MIDI_MAX) {
        candidate++;
        if (isInScale(candidate, root, scale)) skipped++;
      }
      if (skipped < 2) break;
      notes.push(candidate);
    }
  }
  return notes.filter((n) => n >= 0 && n <= MIDI_MAX);
}
