import type { FingerId, HandTrackingResult, Landmark, TrackedHand } from "../types/gesture";
import { FINGER_TIPS, LM } from "../features/hand-tracking/landmarks";

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

/**
 * Tangan dengan ibu jari menyentuh jari tertentu: ujung jari itu diletakkan pada jarak
 * `ratio` × ukuran tangan dari ujung ibu jari. Ibu jari dijauhkan dari telunjuk kecuali
 * jari yang disentuh memang telunjuk.
 */
export function fingerHand(id: string, x: number, y: number, finger: FingerId | null, ratio = 0.1): TrackedHand {
  const h = hand(id, x, y, 0.9);
  if (!finger) return h;
  const lm = h.landmarks;
  const thumb = lm[LM.THUMB_TIP]!;
  const scale = (0.15 + 0.15 * 0.7) / 2;
  lm[FINGER_TIPS[finger]] = { x: thumb.x, y: thumb.y + ratio * scale, z: 0 };
  return h;
}
