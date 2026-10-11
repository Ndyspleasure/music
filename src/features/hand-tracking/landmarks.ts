import type { Landmark } from "../../types/gesture";

/** Indeks landmark MediaPipe Hands. */
export const LM = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  PINKY_MCP: 17,
} as const;

/** Pasangan landmark untuk menggambar kerangka tangan. */
export const HAND_CONNECTIONS: readonly [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
];

export function distance2d(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Ukuran tangan sebagai pembanding jarak pinch, sehingga ambang tidak tergantung
 * jarak tangan ke kamera. Memakai pergelangan→pangkal jari tengah dan lebar telapak.
 */
export function handScale(lm: Landmark[]): number {
  const wrist = lm[LM.WRIST];
  const middle = lm[LM.MIDDLE_MCP];
  const indexMcp = lm[LM.INDEX_MCP];
  const pinkyMcp = lm[LM.PINKY_MCP];
  if (!wrist || !middle || !indexMcp || !pinkyMcp) return 1;
  return Math.max(1e-4, (distance2d(wrist, middle) + distance2d(indexMcp, pinkyMcp)) / 2);
}

/** Rasio pinch: jarak ujung ibu jari–telunjuk dibagi ukuran tangan. */
export function pinchRatio(lm: Landmark[]): number {
  const thumb = lm[LM.THUMB_TIP];
  const index = lm[LM.INDEX_TIP];
  if (!thumb || !index) return Number.POSITIVE_INFINITY;
  return distance2d(thumb, index) / handScale(lm);
}

/** Mirror horizontal ke ruang tampilan selfie. */
export function mirrorLandmarks(lm: Landmark[], mirror: boolean): Landmark[] {
  return mirror ? lm.map((p) => ({ x: 1 - p.x, y: p.y, z: p.z })) : lm;
}
