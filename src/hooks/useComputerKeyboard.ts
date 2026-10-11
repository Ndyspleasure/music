import { useEffect } from "react";
import { useController } from "../app/context";
import { DRUM_PADS } from "../data/drum-map";
import { layoutRange } from "../features/music-theory/note-layout";

/** Tata letak keyboard komputer → offset semiton (gaya piano: baris tengah = tuts putih). */
export const PIANO_KEY_CODES: readonly string[] = [
  "KeyA",
  "KeyW",
  "KeyS",
  "KeyE",
  "KeyD",
  "KeyF",
  "KeyT",
  "KeyG",
  "KeyY",
  "KeyH",
  "KeyU",
  "KeyJ",
  "KeyK",
  "KeyO",
  "KeyL",
  "KeyP",
  "Semicolon",
  "Quote",
];

export function keyCodeLabel(code: string): string {
  if (code === "Semicolon") return ";";
  if (code === "Quote") return "'";
  return code.replace("Key", "");
}

const DRUM_KEY_CODES = new Map(DRUM_PADS.map((p) => [`Key${p.key.toUpperCase()}`, p.id]));

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/**
 * Kontrol keyboard komputer sebagai fallback/aksesibilitas:
 * A W S E D F T G Y H U J K … = nada, Z/X = oktaf turun/naik, Spasi = sustain, Esc = hentikan semua bunyi.
 * Mode drum: Q W E R / A S D F = pad.
 */
export function useComputerKeyboard(): void {
  const controller = useController();

  useEffect(() => {
    const held = new Set<string>();
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      const s = controller.settings;
      if (e.code === "Escape") {
        controller.panic();
        return;
      }
      if (e.code === "Space") {
        if ((e.target as HTMLElement | null)?.closest?.("button")) return;
        e.preventDefault();
        controller.setSustain(true);
        return;
      }
      if (s.mode === "drums") {
        const pad = DRUM_KEY_CODES.get(e.code);
        if (pad) {
          e.preventDefault();
          controller.hitDrumPad(pad, s.velocity, "key");
        }
        return;
      }
      if (e.code === "KeyZ" || e.code === "KeyX") {
        e.preventDefault();
        controller.shiftOctave(e.code === "KeyX" ? 1 : -1);
        return;
      }
      const offset = PIANO_KEY_CODES.indexOf(e.code);
      if (offset < 0) return;
      e.preventDefault();
      const { low } = layoutRange(s);
      held.add(e.code);
      controller.manualNoteOn(`key:${e.code}`, low + offset);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        controller.setSustain(false);
        return;
      }
      if (held.delete(e.code)) controller.manualNoteOff(`key:${e.code}`);
    };
    const releaseAll = () => {
      for (const code of held) controller.manualNoteOff(`key:${code}`);
      held.clear();
      controller.setSustain(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", releaseAll);
    return () => {
      releaseAll();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", releaseAll);
    };
  }, [controller]);
}
