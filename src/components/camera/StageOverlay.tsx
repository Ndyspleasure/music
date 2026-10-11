import { useEffect, useRef } from "react";
import { useApp, useController } from "../../app/context";
import { DRUM_GRID, DRUM_PADS } from "../../data/drum-map";
import { HAND_CONNECTIONS } from "../../features/hand-tracking/landmarks";
import type { FrameSnapshot } from "../../features/performance/performance-controller";

const SPOT = "246, 183, 60";
const GLOW = "79, 214, 200";
const ROSE = "240, 87, 122";
const FLASH_MS = 260;

/**
 * Canvas overlay di atas video: zona nada / pad drum, kerangka tangan, dan pointer.
 * Digambar lewat requestAnimationFrame dari data per-frame controller (tanpa re-render React).
 */
export function StageOverlay() {
  const controller = useController();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mode = useApp((s) => s.settings.mode);
  const showLandmarks = useApp((s) => s.settings.showLandmarks);
  const showNoteNames = useApp((s) => s.settings.showNoteNames);
  const activeNotes = useApp((s) => s.activeNotes);
  const opts = useRef({ mode, showLandmarks, showNoteNames, activeNotes });
  useEffect(() => {
    opts.current = { mode, showLandmarks, showNoteNames, activeNotes };
  }, [mode, showLandmarks, showNoteNames, activeNotes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let latest: FrameSnapshot | null = null;
    let dirty = true;
    const padFlash = new Map<string, number>();
    const offFrame = controller.onFrame((s) => {
      latest = s;
      dirty = true;
    });
    const offHit = controller.onDrumHit((pad) => {
      padFlash.set(pad.id, performance.now());
      dirty = true;
    });
    const resize = new ResizeObserver(() => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      dirty = true;
    });
    resize.observe(canvas);

    let raf = 0;
    let lastOpts = opts.current;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const now = performance.now();
      const flashing = [...padFlash.values()].some((t) => now - t < FLASH_MS);
      if (!dirty && !flashing && lastOpts === opts.current) return;
      dirty = false;
      lastOpts = opts.current;
      const { width: w, height: h } = canvas;
      const dpr = w / Math.max(1, canvas.clientWidth);
      ctx.clearRect(0, 0, w, h);
      const o = opts.current;
      const snap = latest;
      if (o.mode === "drums") drawPads(ctx, w, h, dpr, padFlash, now, snap);
      else drawZones(ctx, w, h, dpr, snap, o.activeNotes, o.showNoteNames);
      if (snap) drawHands(ctx, w, h, dpr, snap, o.showLandmarks);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      offFrame();
      offHit();
    };
  }, [controller]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />;
}

function drawZones(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dpr: number,
  snap: FrameSnapshot | null,
  activeNotes: readonly number[],
  showNames: boolean,
) {
  const zones = snap?.zones ?? [];
  if (zones.length === 0) return;
  const zw = w / zones.length;
  const hovered = new Map<number, boolean>();
  for (const t of snap?.targets ?? []) if (t.zone >= 0) hovered.set(t.zone, t.pinching || hovered.get(t.zone) === true);
  const active = new Set(activeNotes);
  ctx.font = `${600} ${Math.max(10, Math.min(14, zw / 4)) * dpr}px ui-sans-serif, system-ui`;
  ctx.textAlign = "center";
  zones.forEach((z, i) => {
    const x = i * zw;
    const isActive = active.has(z.note);
    const hover = hovered.get(i);
    let fill = z.inScale ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.25)";
    if (z.isRoot) fill = `rgba(${SPOT}, 0.08)`;
    if (hover !== undefined) fill = `rgba(${GLOW}, ${hover ? 0.22 : 0.12})`;
    if (isActive) fill = `rgba(${SPOT}, 0.32)`;
    ctx.fillStyle = fill;
    ctx.fillRect(x, 0, zw, h);
    if (i > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(x, 0, Math.max(1, dpr), h);
    }
    if (showNames && zw > 18 * dpr) {
      ctx.fillStyle = isActive ? `rgb(${SPOT})` : z.isRoot ? `rgba(${SPOT},0.9)` : "rgba(238,241,248,0.75)";
      ctx.fillText(z.label, x + zw / 2, h - 12 * dpr);
    }
  });
}

function drawPads(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dpr: number,
  flash: Map<string, number>,
  now: number,
  snap: FrameSnapshot | null,
) {
  const cw = w / DRUM_GRID.columns;
  const ch = h / DRUM_GRID.rows;
  const pointers = snap?.frame.hands ?? [];
  ctx.textAlign = "center";
  ctx.font = `600 ${13 * dpr}px ui-sans-serif, system-ui`;
  DRUM_PADS.forEach((pad, i) => {
    const col = i % DRUM_GRID.columns;
    const row = Math.floor(i / DRUM_GRID.columns);
    const x = col * cw;
    const y = row * ch;
    const age = now - (flash.get(pad.id) ?? -Infinity);
    const flashAmt = age < FLASH_MS ? 1 - age / FLASH_MS : 0;
    const hover = pointers.some(
      (p) => Math.floor(p.x * DRUM_GRID.columns) === col && Math.floor(p.y * DRUM_GRID.rows) === row,
    );
    ctx.fillStyle = `hsla(${pad.hue}, 80%, 60%, ${0.07 + (hover ? 0.1 : 0) + flashAmt * 0.45})`;
    const inset = 6 * dpr;
    roundRect(ctx, x + inset, y + inset, cw - inset * 2, ch - inset * 2, 14 * dpr);
    ctx.fill();
    ctx.strokeStyle = `hsla(${pad.hue}, 80%, 65%, ${0.35 + flashAmt * 0.6})`;
    ctx.lineWidth = 1.5 * dpr;
    ctx.stroke();
    ctx.fillStyle = "rgba(238,241,248,0.85)";
    ctx.fillText(pad.label, x + cw / 2, y + ch - 16 * dpr);
  });
}

function drawHands(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dpr: number,
  snap: FrameSnapshot,
  skeleton: boolean,
) {
  for (const hand of snap.frame.hands) {
    const color = hand.side === "left" ? GLOW : ROSE;
    if (skeleton) {
      ctx.strokeStyle = `rgba(${color}, 0.7)`;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      for (const [a, b] of HAND_CONNECTIONS) {
        const pa = hand.landmarks[a];
        const pb = hand.landmarks[b];
        if (!pa || !pb) continue;
        ctx.moveTo(pa.x * w, pa.y * h);
        ctx.lineTo(pb.x * w, pb.y * h);
      }
      ctx.stroke();
      ctx.fillStyle = `rgba(${color}, 0.9)`;
      for (const p of hand.landmarks) {
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 2.5 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Pointer: cincin mengecil saat jari mendekat; terisi saat pinch.
    const x = hand.x * w;
    const y = hand.y * h;
    const r = (10 + Math.min(1.2, hand.pinchRatio) * 18) * dpr;
    ctx.lineWidth = 3 * dpr;
    ctx.strokeStyle = hand.pinching ? `rgb(${SPOT})` : `rgba(${color}, 0.95)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    if (hand.pinching) {
      ctx.fillStyle = `rgba(${SPOT}, 0.55)`;
      ctx.fill();
    }
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x, y, 3.5 * dpr, 0, Math.PI * 2);
    ctx.fill();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
