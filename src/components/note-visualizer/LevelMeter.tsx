import { useEffect, useRef } from "react";
import { useController } from "../../app/context";

/** Meter level output audio (polling analyser via rAF, tanpa re-render React). */
export function LevelMeter() {
  const controller = useController();
  const barRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let smoothed = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const level = controller.getOutputLevel();
      smoothed = Math.max(level, smoothed * 0.9);
      const pct = Math.min(100, Math.sqrt(smoothed) * 160);
      if (barRef.current) barRef.current.style.width = `${pct}%`;
      // Atribut data dipakai e2e test untuk memverifikasi suara benar-benar keluar.
      if (wrapRef.current) wrapRef.current.dataset.level = level.toFixed(4);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [controller]);

  return (
    <div
      ref={wrapRef}
      data-testid="level-meter"
      className="h-1.5 w-full overflow-hidden rounded-full bg-stage-700"
      aria-hidden
    >
      <div ref={barRef} className="h-full w-0 rounded-full bg-gradient-to-r from-glow via-spot to-rose" />
    </div>
  );
}
