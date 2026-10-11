import { useEffect, useState } from "react";
import { useApp, useController } from "../../app/context";
import { DRUM_PADS } from "../../data/drum-map";
import { cx } from "../../utils/cx";

/** Pad drum di layar (mouse/sentuh/keyboard). Menyala saat dipukul dari sumber mana pun. */
export function DrumPads() {
  const controller = useController();
  const velocity = useApp((s) => s.settings.velocity);
  const [flash, setFlash] = useState<Record<string, number>>({});

  useEffect(
    () => controller.onDrumHit((pad) => setFlash((f) => ({ ...f, [pad.id]: (f[pad.id] ?? 0) + 1 }))),
    [controller],
  );

  return (
    <div className="grid grid-cols-4 gap-2" role="group" aria-label="Pad drum">
      {DRUM_PADS.map((pad) => (
        <button
          key={`${pad.id}-${flash[pad.id] ?? 0}`}
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            controller.hitDrumPad(pad.id, velocity, "pointer");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") controller.hitDrumPad(pad.id, velocity, "pointer");
          }}
          style={{
            ["--pad-color" as string]: `hsl(${pad.hue} 80% 60% / 0.6)`,
            borderColor: `hsl(${pad.hue} 70% 55% / 0.55)`,
          }}
          className={cx(
            "flex h-16 touch-none flex-col items-center justify-center rounded-xl border bg-stage-800 text-sm font-semibold text-ink select-none hover:bg-stage-700 sm:h-20",
            Boolean(flash[pad.id]) && "animate-pad-flash",
          )}
        >
          {pad.label}
          <span className="font-mono text-[11px] font-normal text-ink-faint">{pad.key.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}
