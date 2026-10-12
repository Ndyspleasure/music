import { useEffect, useRef } from "react";
import { useApp, useController } from "../../app/context";
import { DRUM_GRID, DRUM_PADS, fingerDrumPad } from "../../data/drum-map";
import { FINGER_TIPS, HAND_CONNECTIONS } from "../../features/hand-tracking/landmarks";
import { FINGER_SLOT_COUNT, fingerSlot } from "../../features/music-theory/note-layout";
import { formatNoteName, type NoteNameOptions } from "../../features/music-theory/note-naming";
import type { FrameSnapshot } from "../../features/performance/performance-controller";
import { FINGERS } from "../../types/gesture";

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
  const fingers = useApp((s) => s.settings.noteInput === "fingers");
  const preferFlats = useApp((s) => s.settings.preferFlats);
  const naming = useApp((s) => s.settings.noteNaming);
  const root = useApp((s) => s.settings.root);
  const startOctave = useApp((s) => s.settings.startOctave);
  const showLandmarks = useApp((s) => s.settings.showLandmarks);
  const showNoteNames = useApp((s) => s.settings.showNoteNames);
  const activeNotes = useApp((s) => s.activeNotes);
  const opts = useRef({
    mode,
    fingers,
    preferFlats,
    naming,
    root,
    startOctave,
    showLandmarks,
    showNoteNames,
    activeNotes,
  });
  useEffect(() => {
    opts.current = { mode, fingers, preferFlats, naming, root, startOctave, showLandmarks, showNoteNames, activeNotes };
  }, [mode, fingers, preferFlats, naming, root, startOctave, showLandmarks, showNoteNames, activeNotes]);

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
      const names: NoteNameOptions = {
        naming: o.naming,
        root: o.root,
        startOctave: o.startOctave,
        preferFlats: o.preferFlats,
      };
      const labels = slotLabels(snap, o.mode === "drums", names);
      if (o.fingers) drawFingerLegend(ctx, w, h, dpr, snap, labels, o.mode === "drums", o.activeNotes, padFlash, now);
      else if (o.mode === "drums") drawPads(ctx, w, h, dpr, padFlash, now, snap);
      else drawZones(ctx, w, h, dpr, snap, o.activeNotes, o.showNoteNames, names);
      if (snap) drawHands(ctx, w, h, dpr, snap, o.showLandmarks, !o.fingers);
      if (snap && o.fingers && o.showNoteNames) drawFingerLabels(ctx, w, h, dpr, snap, labels);
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
  names: NoteNameOptions,
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
      ctx.fillText(formatNoteName(z.note, names), x + zw / 2, h - 12 * dpr);
    }
  });
}

/** Label per slot jari: nama nada (melodi/akor) atau nama pad (drum). */
function slotLabels(snap: FrameSnapshot | null, drums: boolean, names: NoteNameOptions): string[] {
  return Array.from({ length: FINGER_SLOT_COUNT }, (_, slot) => {
    if (drums) return fingerDrumPad(slot)?.label ?? "";
    const note = snap?.fingerNotes[slot];
    return note === undefined ? "" : formatNoteName(note, names);
  });
}

/** Bilah legenda di bawah: 4 slot tangan kiri | 4 slot tangan kanan. */
function drawFingerLegend(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dpr: number,
  snap: FrameSnapshot | null,
  labels: string[],
  drums: boolean,
  activeNotes: readonly number[],
  flash: Map<string, number>,
  now: number,
) {
  const active = new Set(activeNotes);
  const pressed = new Set((snap?.targets ?? []).map((t) => t.slot).filter((s) => s >= 0));
  const gap = 10 * dpr;
  const pad = 8 * dpr;
  const cellH = 34 * dpr;
  const cellW = (w - pad * 2 - gap) / FINGER_SLOT_COUNT;
  const y = h - cellH - pad;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${Math.max(10, Math.min(14, cellW / (drums ? 7 : 3) / dpr)) * dpr}px ui-sans-serif, system-ui`;
  for (let slot = 0; slot < FINGER_SLOT_COUNT; slot++) {
    const x = pad + slot * cellW + (slot >= FINGERS.length ? gap : 0);
    const color = slot < FINGERS.length ? GLOW : ROSE;
    let lit = pressed.has(slot);
    if (drums) {
      const p = fingerDrumPad(slot);
      const age = now - (flash.get(p?.id ?? "") ?? -Infinity);
      lit = lit || age < FLASH_MS;
    } else {
      const note = snap?.fingerNotes[slot];
      lit = lit && note !== undefined && active.has(note);
    }
    ctx.fillStyle = lit ? `rgba(${SPOT}, 0.55)` : `rgba(${color}, 0.12)`;
    roundRect(ctx, x + 2 * dpr, y, cellW - 4 * dpr, cellH, 8 * dpr);
    ctx.fill();
    ctx.fillStyle = lit ? "#fff" : "rgba(238,241,248,0.85)";
    ctx.fillText(labels[slot] ?? "", x + cellW / 2, y + cellH / 2);
  }
  ctx.textBaseline = "alphabetic";
}

/** Nama nada/pad ditulis tepat di ujung tiap jari yang dapat dimainkan. */
function drawFingerLabels(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dpr: number,
  snap: FrameSnapshot,
  labels: string[],
) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${11 * dpr}px ui-sans-serif, system-ui`;
  for (const hand of snap.frame.hands) {
    for (const finger of FINGERS) {
      const tip = hand.landmarks[FINGER_TIPS[finger]];
      if (!tip) continue;
      const label = labels[fingerSlot(hand.side, finger)] ?? "";
      const on = hand.finger === finger;
      const x = tip.x * w;
      const y = tip.y * h - 16 * dpr;
      const tw = Math.max(22 * dpr, ctx.measureText(label).width + 10 * dpr);
      ctx.fillStyle = on ? `rgb(${SPOT})` : "rgba(10,12,20,0.7)";
      roundRect(ctx, x - tw / 2, y - 9 * dpr, tw, 18 * dpr, 9 * dpr);
      ctx.fill();
      ctx.fillStyle = on ? "#111" : "rgba(238,241,248,0.95)";
      ctx.fillText(label, x, y);
      // Bilah kedekatan: penuh = menempel; garis tengah = ambang terdeteksi.
      const score = hand.fingerScores[FINGERS.indexOf(finger)] ?? Infinity;
      const fill = Math.min(1, Math.max(0, 1.5 - score));
      const bw = 26 * dpr;
      const bh = 4 * dpr;
      const by = y + 12 * dpr;
      ctx.fillStyle = "rgba(10,12,20,0.75)";
      ctx.fillRect(x - bw / 2, by, bw, bh);
      ctx.fillStyle = on ? `rgb(${SPOT})` : score < 1 ? `rgba(${SPOT},0.75)` : "rgba(238,241,248,0.6)";
      ctx.fillRect(x - bw / 2, by, bw * fill, bh);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillRect(x - dpr / 2, by - dpr, dpr, bh + 2 * dpr);
    }
  }
  ctx.textBaseline = "alphabetic";
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
  pointer: boolean,
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
    if (!pointer) continue;
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
