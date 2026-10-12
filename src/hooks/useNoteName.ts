import { useCallback } from "react";
import { useApp } from "../app/context";
import { formatNoteName } from "../features/music-theory/note-naming";
import type { MidiNote } from "../types/music";

/** Fungsi pemformat nama nada sesuai setelan "Nama nada" (huruf / solmisasi / angka). */
export function useNoteName(): (note: MidiNote) => string {
  const naming = useApp((s) => s.settings.noteNaming);
  const root = useApp((s) => s.settings.root);
  const startOctave = useApp((s) => s.settings.startOctave);
  const preferFlats = useApp((s) => s.settings.preferFlats);
  return useCallback(
    (note: MidiNote) => formatNoteName(note, { naming, root, startOctave, preferFlats }),
    [naming, root, startOctave, preferFlats],
  );
}
