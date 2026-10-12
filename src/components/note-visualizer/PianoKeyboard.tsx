import { useMemo, useRef } from "react";
import { useApp, useController } from "../../app/context";
import { layoutRange } from "../../features/music-theory/note-layout";
import { midiToNoteName, pitchClassOf } from "../../features/music-theory/notes";
import { isInScale } from "../../features/music-theory/scales";
import { keyCodeLabel, PIANO_KEY_CODES } from "../../hooks/useComputerKeyboard";
import { cx } from "../../utils/cx";

const BLACK = new Set([1, 3, 6, 8, 10]);

/** Keyboard piano di layar untuk mouse/sentuh. Mendukung glissando (geser sambil menekan) dan multi-touch. */
export function PianoKeyboard() {
  const controller = useController();
  const startOctave = useApp((s) => s.settings.startOctave);
  const octaveCount = useApp((s) => s.settings.octaveCount);
  const root = useApp((s) => s.settings.root);
  const scale = useApp((s) => s.settings.scale);
  const preferFlats = useApp((s) => s.settings.preferFlats);
  const active = useApp((s) => s.activeNotes);
  const pointerNotes = useRef(new Map<number, number>());

  const { low, high } = layoutRange({ startOctave, octaveCount });
  const keys = useMemo(() => {
    const list: { note: number; black: boolean; whiteIndex: number }[] = [];
    let whiteIndex = -1;
    for (let n = low; n <= high; n++) {
      const black = BLACK.has(pitchClassOf(n));
      if (!black) whiteIndex++;
      list.push({ note: n, black, whiteIndex });
    }
    return list;
  }, [low, high]);
  const whiteCount = keys.filter((k) => !k.black).length;
  const activeSet = new Set(active);

  const press = (pointerId: number, note: number) => {
    if (pointerNotes.current.get(pointerId) === note) return;
    controller.manualNoteOff(`pointer:${pointerId}`);
    pointerNotes.current.set(pointerId, note);
    controller.manualNoteOn(`pointer:${pointerId}`, note);
  };
  const release = (pointerId: number) => {
    pointerNotes.current.delete(pointerId);
    controller.manualNoteOff(`pointer:${pointerId}`);
  };

  return (
    <div
      className="relative h-36 w-full touch-none select-none sm:h-40"
      role="group"
      aria-label={`Keyboard piano ${midiToNoteName(low, preferFlats)} sampai ${midiToNoteName(high, preferFlats)}`}
      onPointerUp={(e) => release(e.pointerId)}
      onPointerCancel={(e) => release(e.pointerId)}
      onPointerLeave={(e) => release(e.pointerId)}
    >
      {keys.map((k) => {
        const offset = k.note - low;
        const code = PIANO_KEY_CODES[offset];
        const inScale = isInScale(k.note, root, scale);
        const isActive = activeSet.has(k.note);
        const isRoot = pitchClassOf(k.note) === root;
        const name = midiToNoteName(k.note, preferFlats);
        const style = k.black
          ? {
              left: `${((k.whiteIndex + 1) / whiteCount) * 100}%`,
              width: `${(0.62 / whiteCount) * 100}%`,
              transform: "translateX(-50%)",
            }
          : { left: `${(k.whiteIndex / whiteCount) * 100}%`, width: `${(1 / whiteCount) * 100}%` };
        return (
          <button
            key={k.note}
            type="button"
            tabIndex={-1}
            aria-label={`${name}${code ? `, tombol ${keyCodeLabel(code)}` : ""}${inScale ? "" : " (di luar skala)"}`}
            aria-pressed={isActive}
            style={style}
            onPointerDown={(e) => {
              // Lepas capture implisit (sentuh) agar glissando ke tuts lain terdeteksi.
              if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
              press(e.pointerId, k.note);
            }}
            onPointerEnter={(e) => {
              if (e.buttons & 1 || e.pointerType === "touch") {
                if (pointerNotes.current.has(e.pointerId)) press(e.pointerId, k.note);
              }
            }}
            className={cx(
              "absolute top-0 flex flex-col items-center justify-end pb-2 transition-colors",
              k.black
                ? "z-10 h-[60%] rounded-b-md border border-stage-950 text-[10px]"
                : "h-full rounded-b-lg border border-stage-950/70 text-[11px]",
              k.black
                ? isActive
                  ? "bg-spot text-stage-950"
                  : inScale
                    ? "bg-stage-700 text-ink-muted hover:bg-stage-600"
                    : "bg-stage-900 text-ink-faint"
                : isActive
                  ? "bg-spot text-stage-950"
                  : inScale
                    ? "bg-ink text-stage-800 hover:bg-white"
                    : "bg-ink-muted/70 text-stage-700",
            )}
          >
            {code && (
              <span className={cx("font-mono", k.black ? "text-ink-muted" : "opacity-70")}>{keyCodeLabel(code)}</span>
            )}
            {!k.black && <span className={cx("font-semibold", isRoot && !isActive && "text-spot")}>{name}</span>}
          </button>
        );
      })}
    </div>
  );
}
