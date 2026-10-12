import { useEffect, useState } from "react";
import { useApp } from "../../app/context";
import { FINGERS, type FingerId } from "../../types/gesture";
import { cx } from "../../utils/cx";
import { fingerSlotLabels } from "./finger-labels";
import { HandSvg, PositionSvg } from "./HandSvg";
import type { LiveFingers } from "./use-live-fingers";

/** Jeda per langkah animasi demo (ms). */
const DEMO_STEP_MS = 900;
/** 8 slot jari + 1 langkah jeda (tangan terbuka). */
const DEMO_STEPS = FINGERS.length * 2 + 1;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Langkah demo yang berputar: 0–3 tangan kiri, 4–7 tangan kanan, 8 = jeda. */
function useDemoStep(enabled: boolean): number {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!enabled || prefersReducedMotion()) return;
    const id = setInterval(() => setStep((s) => (s + 1) % DEMO_STEPS), DEMO_STEP_MS);
    return () => clearInterval(id);
  }, [enabled]);
  return step;
}

/**
 * Panduan bergambar cara memainkan nada. Input "Jari": dua tangan SVG dengan label nada/pad
 * per jari; tanpa tangan terdeteksi, ibu jari bergiliran menyentuh tiap jari (demo). Bila
 * `live` diberikan dan ada tangan, gambar mengikuti jari yang sedang disentuh pengguna.
 */
export function HandGuide({ live, compact = false }: { live?: LiveFingers | null; compact?: boolean }) {
  const s = useApp((st) => st.settings);
  const fingers = s.noteInput === "fingers";
  const demoing = fingers && !live;
  const step = useDemoStep(demoing);
  const labels = fingerSlotLabels(s);
  const drums = s.mode === "drums";

  if (!fingers) {
    return (
      <figure className="flex flex-col items-center gap-2">
        <PositionSvg drums={drums} className={cx("w-full", compact ? "max-w-[220px]" : "max-w-[300px]")} />
        <figcaption className="text-center text-xs text-ink-muted">
          {drums
            ? "Arahkan tangan ke pad, lalu ayunkan cepat ke bawah — atau cubit untuk mengetuk."
            : "Cubit ibu jari + telunjuk untuk bunyi, geser kiri–kanan untuk ganti nada."}
        </figcaption>
      </figure>
    );
  }

  const demoSlot = step < FINGERS.length * 2 ? step : -1;
  const activeFor = (side: "left" | "right"): FingerId | null => {
    if (live) return live[side];
    const base = side === "left" ? 0 : FINGERS.length;
    return demoSlot >= base && demoSlot < base + FINGERS.length ? (FINGERS[demoSlot - base] ?? null) : null;
  };

  return (
    <figure className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {(["left", "right"] as const).map((side) => (
          <div key={side} className="flex flex-col items-center">
            <HandSvg
              side={side}
              labels={labels.slice(side === "left" ? 0 : 4, side === "left" ? 4 : 8)}
              active={activeFor(side)}
              className={cx("w-full", compact ? "max-w-[130px]" : "max-w-[170px]")}
            />
            <span className={cx("text-[11px] font-semibold", side === "left" ? "text-glow" : "text-rose")}>
              Tangan {side === "left" ? "kiri" : "kanan"}
            </span>
          </div>
        ))}
      </div>
      <figcaption className="text-center text-xs text-ink-muted">
        Tempelkan <strong className="text-ink">ujung ibu jari</strong> ke ujung jari lain —{" "}
        {drums ? "tiap jari memukul satu pad." : "tiap jari satu nada."} Tangan tidak perlu berpindah. Buka jari untuk
        berhenti.
      </figcaption>
    </figure>
  );
}
