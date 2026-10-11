import { DEFAULT_GESTURE_CONFIG, sanitizeGestureConfig, type GestureConfig } from "../../config/gesture-config";
import type {
  GestureEvent,
  GestureFrame,
  HandFrameState,
  HandSide,
  HandTrackingResult,
  TrackedHand,
} from "../../types/gesture";
import { LM, mirrorLandmarks, pinchRatio } from "./landmarks";
import { OneEuroFilter } from "./one-euro-filter";

interface HandState {
  id: string;
  side: HandSide;
  fx: OneEuroFilter;
  fy: OneEuroFilter;
  x: number;
  y: number;
  /** Kecepatan (satuan/detik), sudah di-smoothing. */
  vx: number;
  vy: number;
  lastSeen: number;
  lastSample: number;
  pinching: boolean;
  strikeArmed: boolean;
  lastStrikeAt: number;
  lastSwipeAt: number;
}

export interface GestureInterpreterOptions {
  config?: GestureConfig;
  /** Mirror koordinat ke ruang tampilan selfie. */
  mirror?: boolean;
  /** Jumlah tangan maksimum yang diproses. */
  maxHands?: number;
}

/** Bobot EMA untuk estimasi kecepatan. */
const VELOCITY_SMOOTHING = 0.5;

/**
 * Mengubah hasil hand tracking menjadi event gesture ternormalisasi.
 * Tidak tahu apa-apa soal suara/instrumen — hanya geometri dan waktu.
 */
export class GestureInterpreter {
  private config: GestureConfig;
  private mirror: boolean;
  private maxHands: number;
  private hands = new Map<string, HandState>();

  constructor(opts: GestureInterpreterOptions = {}) {
    this.config = sanitizeGestureConfig(opts.config ?? DEFAULT_GESTURE_CONFIG);
    this.mirror = opts.mirror ?? true;
    this.maxHands = opts.maxHands ?? 2;
  }

  setConfig(config: GestureConfig): void {
    this.config = sanitizeGestureConfig(config);
    for (const h of this.hands.values()) {
      h.fx.minCutoff = h.fy.minCutoff = this.config.smoothingMinCutoff;
      h.fx.beta = h.fy.beta = this.config.smoothingBeta;
    }
  }

  setMirror(mirror: boolean): void {
    this.mirror = mirror;
  }

  setMaxHands(n: number): void {
    this.maxHands = Math.max(1, Math.min(2, Math.round(n)));
  }

  get activeHandIds(): string[] {
    return [...this.hands.keys()];
  }

  /** Lepaskan semua tangan (mis. saat sesi berhenti). Mengembalikan event hand-lost/pinch-end. */
  reset(timestamp: number): GestureEvent[] {
    const events: GestureEvent[] = [];
    for (const h of this.hands.values()) this.loseHand(h, timestamp, events);
    this.hands.clear();
    return events;
  }

  process(result: HandTrackingResult): GestureFrame {
    const now = result.timestamp;
    const events: GestureEvent[] = [];
    const frames: HandFrameState[] = [];
    const cfg = this.config;

    const visible = result.hands
      .filter((h) => h.score >= cfg.minConfidence && h.landmarks.length >= 21)
      .toSorted((a, b) => b.score - a.score)
      .slice(0, this.maxHands);

    const seen = new Set<string>();
    for (const hand of visible) {
      seen.add(hand.id);
      frames.push(this.updateHand(hand, now, events));
    }

    for (const [id, h] of this.hands) {
      if (seen.has(id)) continue;
      if (now - h.lastSeen > cfg.handLostGraceMs) {
        this.loseHand(h, now, events);
        this.hands.delete(id);
      }
    }

    return { timestamp: now, events, hands: frames };
  }

  private updateHand(hand: TrackedHand, now: number, events: GestureEvent[]): HandFrameState {
    const cfg = this.config;
    const lm = mirrorLandmarks(hand.landmarks, this.mirror);
    const tip = lm[LM.INDEX_TIP] ?? { x: 0.5, y: 0.5, z: 0 };

    let state = this.hands.get(hand.id);
    const isNew = !state;
    if (!state) {
      state = {
        id: hand.id,
        side: hand.side,
        fx: new OneEuroFilter(cfg.smoothingMinCutoff, cfg.smoothingBeta),
        fy: new OneEuroFilter(cfg.smoothingMinCutoff, cfg.smoothingBeta),
        x: tip.x,
        y: tip.y,
        vx: 0,
        vy: 0,
        lastSeen: now,
        lastSample: now,
        pinching: false,
        strikeArmed: true,
        lastStrikeAt: -Infinity,
        lastSwipeAt: -Infinity,
      };
      this.hands.set(hand.id, state);
      events.push({ type: "hand-found", handId: hand.id, timestamp: now });
    }

    const x = state.fx.filter(tip.x, now);
    const y = state.fy.filter(tip.y, now);
    const dt = (now - state.lastSample) / 1000;
    if (!isNew && dt > 0) {
      const vx = (x - state.x) / dt;
      const vy = (y - state.y) / dt;
      state.vx = state.vx + (vx - state.vx) * VELOCITY_SMOOTHING;
      state.vy = state.vy + (vy - state.vy) * VELOCITY_SMOOTHING;
    }
    state.x = x;
    state.y = y;
    state.lastSample = now;
    state.lastSeen = now;
    state.side = hand.side;

    const confidence = hand.score;
    events.push({ type: "pointer-move", handId: hand.id, x, y, confidence, timestamp: now });

    // Pinch dengan hysteresis.
    const ratio = pinchRatio(lm);
    if (!state.pinching && ratio < cfg.pinchStart) {
      state.pinching = true;
      events.push({ type: "pinch-start", handId: hand.id, x, y, confidence, timestamp: now });
    } else if (state.pinching && ratio > cfg.pinchRelease) {
      state.pinching = false;
      events.push({ type: "pinch-end", handId: hand.id, timestamp: now });
    }

    // Pukulan (gerak turun cepat) dengan re-arm + cooldown.
    if (state.strikeArmed && state.vy > cfg.strikeVelocity && now - state.lastStrikeAt >= cfg.strikeCooldownMs) {
      state.strikeArmed = false;
      state.lastStrikeAt = now;
      events.push({
        type: "strike",
        handId: hand.id,
        x,
        y,
        velocity: strikeVelocityToMidi(state.vy, cfg.strikeVelocity),
        timestamp: now,
      });
    } else if (!state.strikeArmed && state.vy < cfg.strikeRearmVelocity) {
      state.strikeArmed = true;
    }

    // Swipe horizontal (hanya saat tidak pinch, agar tidak bentrok dengan bermain nada).
    if (
      !state.pinching &&
      Math.abs(state.vx) > cfg.swipeVelocity &&
      Math.abs(state.vx) > 2 * Math.abs(state.vy) &&
      now - state.lastSwipeAt >= cfg.swipeCooldownMs
    ) {
      state.lastSwipeAt = now;
      events.push({
        type: "swipe",
        handId: hand.id,
        direction: state.vx > 0 ? "right" : "left",
        velocity: Math.abs(state.vx),
        timestamp: now,
      });
    }

    return { handId: hand.id, side: state.side, x, y, pinchRatio: ratio, pinching: state.pinching, landmarks: lm };
  }

  private loseHand(h: HandState, now: number, events: GestureEvent[]): void {
    if (h.pinching) events.push({ type: "pinch-end", handId: h.id, timestamp: now });
    events.push({ type: "hand-lost", handId: h.id, timestamp: now });
  }
}

/** Petakan kecepatan pukulan ke velocity MIDI 40..127. */
export function strikeVelocityToMidi(speed: number, threshold: number): number {
  const t = Math.min(1, Math.max(0, (speed - threshold) / (threshold * 2)));
  return Math.round(40 + t * 87);
}
