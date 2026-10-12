import type { HandSide, HandTrackingResult, TrackedHand } from "../../types/gesture";

/** Bentuk minimal hasil MediaPipe yang kita baca (agar tipe MediaPipe tidak menyebar). */
export interface RawHandResult {
  landmarks: { x: number; y: number; z: number }[][];
  handedness?: { categoryName: string; score: number }[][];
  handednesses?: { categoryName: string; score: number }[][];
}

/**
 * Konversi hasil MediaPipe ke tipe internal.
 * MediaPipe menganggap input sudah di-mirror (kamera selfie). Frame webcam yang kita
 * kirim TIDAK di-mirror, sehingga label "Left" MediaPipe = tangan kanan pengguna.
 */
export function toTrackingResult(raw: RawHandResult, timestamp: number): HandTrackingResult {
  const handedness = raw.handedness ?? raw.handednesses ?? [];
  const used = new Set<string>();
  const hands: TrackedHand[] = raw.landmarks.map((lm, i) => {
    const cat = handedness[i]?.[0];
    const side: HandSide = cat?.categoryName === "Left" ? "right" : cat?.categoryName === "Right" ? "left" : "unknown";
    let id = `hand-${side}`;
    if (used.has(id)) id = `${id}-2`;
    used.add(id);
    return {
      id,
      side,
      score: cat?.score ?? 1,
      landmarks: lm.map((p) => ({ x: p.x, y: p.y, z: p.z })),
    };
  });
  return { timestamp, hands };
}
