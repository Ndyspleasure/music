/**
 * Semua parameter tuning gesture terpusat di sini (bukan magic number tersebar).
 * Unit kecepatan: satuan layar ternormalisasi per detik (1.0  = lebar/tinggi frame per detik).
 */
export interface GestureConfig {
  /** Tangan dengan skor di bawah ini diabaikan. */
  minConfidence: number;
  /** Pinch dimulai bila rasio jarak ibu jari–telunjuk / ukuran tangan < nilai ini. */
  pinchStart: number;
  /** Pinch dilepas bila rasio > nilai ini (harus > pinchStart → hysteresis). */
  pinchRelease: number;
  /** One Euro Filter: cutoff minimum (Hz). Lebih kecil  = lebih halus tapi lebih lambat. */
  smoothingMinCutoff: number;
  /** One Euro Filter: beta (respons terhadap kecepatan). */
  smoothingBeta: number;
  /** Lama tangan boleh hilang sebelum dianggap "hand-lost" (ms). */
  handLostGraceMs: number;
  /** Kecepatan turun minimum untuk memicu pukulan drum. */
  strikeVelocity: number;
  /** Pukulan berikutnya baru bisa dipicu setelah kecepatan turun di bawah ini (re-arm). */
  strikeRearmVelocity: number;
  /** Jeda minimum antar pukulan per tangan (ms). */
  strikeCooldownMs: number;
  /** Kecepatan horizontal minimum untuk swipe. */
  swipeVelocity: number;
  swipeCooldownMs: number;
  /** Hysteresis batas zona nada (fraksi lebar zona). */
  zoneHysteresis: number;
}

export type SensitivityPreset = "sensitive" | "normal" | "steady";

export const GESTURE_PRESETS: Record<SensitivityPreset, GestureConfig> = {
  sensitive: {
    minConfidence: 0.5,
    pinchStart: 0.42,
    pinchRelease: 0.55,
    smoothingMinCutoff: 2.0,
    smoothingBeta: 0.02,
    handLostGraceMs: 150,
    strikeVelocity: 1.2,
    strikeRearmVelocity: 0.3,
    strikeCooldownMs: 90,
    swipeVelocity: 2.2,
    swipeCooldownMs: 500,
    zoneHysteresis: 0.12,
  },
  normal: {
    minConfidence: 0.6,
    pinchStart: 0.35,
    pinchRelease: 0.5,
    smoothingMinCutoff: 1.2,
    smoothingBeta: 0.015,
    handLostGraceMs: 180,
    strikeVelocity: 1.6,
    strikeRearmVelocity: 0.25,
    strikeCooldownMs: 120,
    swipeVelocity: 2.8,
    swipeCooldownMs: 600,
    zoneHysteresis: 0.18,
  },
  steady: {
    minConfidence: 0.7,
    pinchStart: 0.3,
    pinchRelease: 0.48,
    smoothingMinCutoff: 0.7,
    smoothingBeta: 0.008,
    handLostGraceMs: 220,
    strikeVelocity: 2.1,
    strikeRearmVelocity: 0.2,
    strikeCooldownMs: 160,
    swipeVelocity: 3.4,
    swipeCooldownMs: 700,
    zoneHysteresis: 0.25,
  },
};

export const DEFAULT_GESTURE_CONFIG: GestureConfig = GESTURE_PRESETS.normal;

/** Pastikan konfigurasi konsisten (mis. hysteresis pinch selalu positif). */
export function sanitizeGestureConfig(c: GestureConfig): GestureConfig {
  const pinchStart = clamp(c.pinchStart, 0.1, 0.8);
  return {
    ...c,
    minConfidence: clamp(c.minConfidence, 0, 1),
    pinchStart,
    pinchRelease: clamp(Math.max(c.pinchRelease, pinchStart + 0.05), 0.15, 1),
    smoothingMinCutoff: clamp(c.smoothingMinCutoff, 0.05, 10),
    smoothingBeta: clamp(c.smoothingBeta, 0, 1),
    handLostGraceMs: clamp(c.handLostGraceMs, 0, 2000),
    strikeVelocity: clamp(c.strikeVelocity, 0.2, 10),
    strikeRearmVelocity: clamp(Math.min(c.strikeRearmVelocity, c.strikeVelocity * 0.8), 0, 10),
    strikeCooldownMs: clamp(c.strikeCooldownMs, 0, 2000),
    swipeVelocity: clamp(c.swipeVelocity, 0.5, 20),
    swipeCooldownMs: clamp(c.swipeCooldownMs, 0, 5000),
    zoneHysteresis: clamp(c.zoneHysteresis, 0, 0.45),
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;
}
