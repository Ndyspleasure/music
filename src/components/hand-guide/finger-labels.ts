import type { AppSettings } from "../../config/app-settings";
import { fingerDrumPad } from "../../data/drum-map";
import { buildFingerNotes, FINGER_SLOT_COUNT } from "../../features/music-theory/note-layout";
import { formatNoteName } from "../../features/music-theory/note-naming";

/** Label tiap slot jari (0–3 tangan kiri, 4–7 tangan kanan): nama nada, atau nama pad di mode drum. */
export function fingerSlotLabels(
  s: Pick<AppSettings, "mode" | "root" | "scale" | "startOctave" | "preferFlats" | "noteNaming">,
): string[] {
  if (s.mode === "drums") {
    return Array.from({ length: FINGER_SLOT_COUNT }, (_, slot) => fingerDrumPad(slot)?.label ?? "");
  }
  return buildFingerNotes(s).map((n) => formatNoteName(n, { ...s, naming: s.noteNaming }));
}
