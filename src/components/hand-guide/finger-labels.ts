import type { AppSettings } from "../../config/app-settings";
import { fingerDrumPad } from "../../data/drum-map";
import { buildFingerNotes, FINGER_SLOT_COUNT } from "../../features/music-theory/note-layout";
import { midiToNoteName } from "../../features/music-theory/notes";

/** Label tiap slot jari (0–3 tangan kiri, 4–7 tangan kanan): nama nada, atau nama pad di mode drum. */
export function fingerSlotLabels(
  s: Pick<AppSettings, "mode" | "root" | "scale" | "startOctave" | "preferFlats">,
): string[] {
  if (s.mode === "drums") {
    return Array.from({ length: FINGER_SLOT_COUNT }, (_, slot) => fingerDrumPad(slot)?.label ?? "");
  }
  return buildFingerNotes(s).map((n) => midiToNoteName(n, s.preferFlats));
}
