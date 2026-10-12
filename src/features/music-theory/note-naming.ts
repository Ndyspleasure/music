import type { MidiNote, PitchClass } from "../../types/music";
import { midiToNoteName, mod, noteNumber } from "./notes";

/**
 * Cara menulis nama nada:
 * - "letter": huruf + oktaf ilmiah (C4, F♯3).
 * - "solfege": solmisasi do-re-mi relatif terhadap nada dasar (do = key yang dipilih).
 * - "number": not angka 1–7 relatif terhadap nada dasar.
 */
export type NoteNaming = "letter" | "solfege" | "number";

export const NOTE_NAMINGS: readonly NoteNaming[] = ["letter", "solfege", "number"];

/** Solmisasi per jarak semiton dari do; nada kromatis memakai bentuk "naik" (di, ri, fi, sel, le). */
const SOLFEGE = ["do", "di", "re", "ri", "mi", "fa", "fi", "sol", "sel", "la", "le", "si"] as const;
/** Not angka per jarak semiton dari 1; nada kromatis memakai tanda kres (#). */
const NUMBER = ["1", "#1", "2", "#2", "3", "4", "#4", "5", "#5", "6", "#6", "7"] as const;

const DOT_ABOVE = "̇";
const DOT_BELOW = "̣";

export interface NoteNameOptions {
  naming: NoteNaming;
  /** Nada dasar (do / 1). */
  root: PitchClass;
  /** Oktaf tempat do / 1 tanpa tanda oktaf berada. */
  startOctave: number;
  preferFlats?: boolean;
}

/**
 * Nama nada sesuai format pilihan. Pada solmisasi/angka, oktaf ditandai relatif terhadap
 * do di oktaf awal: solmisasi memakai ' (atas) dan , (bawah), angka memakai titik di atas
 * atau di bawah angka seperti penulisan not angka.
 */
export function formatNoteName(note: MidiNote, opts: NoteNameOptions): string {
  if (opts.naming === "letter") return midiToNoteName(note, opts.preferFlats);
  const rel = note - noteNumber(opts.root, opts.startOctave);
  const degree = mod(rel, 12);
  const octave = Math.floor(rel / 12);
  if (opts.naming === "solfege") {
    return `${SOLFEGE[degree]}${octave > 0 ? "'".repeat(octave) : ",".repeat(-octave)}`;
  }
  return `${NUMBER[degree]}${(octave > 0 ? DOT_ABOVE : DOT_BELOW).repeat(Math.abs(octave))}`;
}
