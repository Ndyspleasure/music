import { useEffect, useState } from "react";
import { useController } from "../../app/context";
import type { FingerId } from "../../types/gesture";

export interface LiveFingers {
  left: FingerId | null;
  right: FingerId | null;
}

/** Jari aktif per sisi dari data per-frame controller, tanpa re-render tiap frame. */
export function useLiveFingers(enabled: boolean): LiveFingers | null {
  const controller = useController();
  const [live, setLive] = useState<LiveFingers | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let key = "";
    const off = controller.onFrame(({ frame }) => {
      let next: LiveFingers | null = null;
      if (frame.hands.length > 0) {
        next = { left: null, right: null };
        for (const h of frame.hands) next[h.side === "right" ? "right" : "left"] = h.finger;
      }
      const k = next ? `${next.left}|${next.right}` : "";
      if (k === key) return;
      key = k;
      setLive(next);
    });
    return () => {
      off();
      setLive(null);
    };
  }, [controller, enabled]);
  return live;
}
