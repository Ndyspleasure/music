/** Titik landmark ternormalisasi (0..1 relatif terhadap frame video). */
export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export type HandSide = "left" | "right" | "unknown";

/** Tangan hasil tracking dalam bentuk internal aplikasi (bukan objek MediaPipe). */
export interface TrackedHand {
  /** ID stabil selama tangan terlihat, mis. "hand-right". */
  id: string;
  side: HandSide;
  /** Skor keyakinan handedness/presence 0..1. */
  score: number;
  /** 21 landmark mengikuti topologi MediaPipe Hands. */
  landmarks: Landmark[];
}

export interface HandTrackingResult {
  /** Timestamp milidetik (performance.now()). */
  timestamp: number;
  hands: TrackedHand[];
}

export type SwipeDirection = "left" | "right" | "up" | "down";

/** Event gesture ternormalisasi. Koordinat x/y sudah dalam ruang tampilan (sudah di-mirror bila perlu). */
export type GestureEvent =
  | { type: "hand-found"; handId: string; timestamp: number }
  | { type: "pointer-move"; handId: string; x: number; y: number; confidence: number; timestamp: number }
  | { type: "pinch-start"; handId: string; x: number; y: number; confidence: number; timestamp: number }
  | { type: "pinch-end"; handId: string; timestamp: number }
  | { type: "strike"; handId: string; x: number; y: number; velocity: number; timestamp: number }
  | { type: "swipe"; handId: string; direction: SwipeDirection; velocity: number; timestamp: number }
  | { type: "hand-lost"; handId: string; timestamp: number };

/** Snapshot per-frame untuk overlay visual (tidak disimpan di state React). */
export interface HandFrameState {
  handId: string;
  side: HandSide;
  /** Titik kontrol (ujung telunjuk) setelah smoothing, ruang tampilan 0..1. */
  x: number;
  y: number;
  /** Rasio jarak ibu jari–telunjuk terhadap ukuran tangan. */
  pinchRatio: number;
  pinching: boolean;
  /** Landmark mentah dalam ruang tampilan (untuk menggambar kerangka tangan). */
  landmarks: Landmark[];
}

export interface GestureFrame {
  timestamp: number;
  events: GestureEvent[];
  hands: HandFrameState[];
}
