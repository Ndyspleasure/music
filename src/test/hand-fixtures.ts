import type { HandTrackingResult, Landmark, TrackedHand } from "../types/gesture";

/**
 * Buat 21 landmark sintetis. (x,y) = posisi ujung telunjuk.
 * Ukuran tangan ±0.15; `pinch` = jarak ibu jari–telunjuk relatif ukuran tangan.
 */
export function syntheticLandmarks(x: number, y: number, pinch = 0.8): Landmark[] {
  const size = 0.15;
  const lm: Landmark[] = Array.from({ length: 21 }, () => ({ x, y: y + size, z: 0 }));
  lm[0] = { x, y: y + size * 1.6, z: 0 }; // wrist
  lm[5] = { x: x - size * 0.35, y: y + size * 0.6, z: 0 }; // index mcp
  lm[9] = { x, y: y + size * 0.6, z: 0 }; // middle mcp
  lm[17] = { x: x + size * 0.35, y: y + size * 0.6, z: 0 }; // pinky mcp
  lm[8] = { x, y, z: 0 }; // index tip
  // handScale = (|wrist-middle| + |indexMcp-pinkyMcp|)/2 = (0.15 + 0.105)/2
  const scale = (size + size * 0.7) / 2;
  lm[4] = { x: x - pinch * scale, y, z: 0 }; // thumb tip
  return lm;
}

export function hand(id: string, x: number, y: number, pinch = 0.8, score = 0.95): TrackedHand {
  return { id, side: id.includes("left") ? "left" : "right", score, landmarks: syntheticLandmarks(x, y, pinch) };
}

export function frame(timestamp: number, ...hands: TrackedHand[]): HandTrackingResult {
  return { timestamp, hands };
}
