import { describe, expect, it } from "vitest";
import { GESTURE_PRESETS } from "../../config/gesture-config";
import { frame, hand } from "../../test/hand-fixtures";
import type { GestureEvent } from "../../types/gesture";
import { GestureInterpreter, strikeVelocityToMidi } from "./gesture-interpreter";
import { OneEuroFilter } from "./one-euro-filter";
import { pinchRatio } from "./landmarks";
import { syntheticLandmarks } from "../../test/hand-fixtures";

const cfg = { ...GESTURE_PRESETS.normal, smoothingMinCutoff: 1000, smoothingBeta: 0 }; // smoothing ~nonaktif
const types = (events: GestureEvent[]) => events.map((e) => e.type);

describe("fixture", () => {
  it("rasio pinch sintetis sesuai parameter", () => {
    expect(pinchRatio(syntheticLandmarks(0.5, 0.5, 0.2))).toBeCloseTo(0.2);
  });
});

describe("GestureInterpreter", () => {
  it("hand-found + pointer-move dalam ruang tampilan ter-mirror", () => {
    const gi = new GestureInterpreter({ config: cfg, mirror: true });
    const f = gi.process(frame(0, hand("hand-right", 0.2, 0.4)));
    expect(types(f.events)).toEqual(["hand-found", "pointer-move"]);
    const move = f.events[1]!;
    expect(move.type === "pointer-move" && move.x).toBeCloseTo(0.8);
    expect(f.hands[0]).toMatchObject({ handId: "hand-right", pinching: false });
  });

  it("pinch memakai hysteresis: tidak berkedip di dekat ambang", () => {
    const gi = new GestureInterpreter({ config: cfg, mirror: false });
    let t = 0;
    const step = (pinch: number) => types(gi.process(frame((t += 33), hand("hand-right", 0.5, 0.5, pinch))).events);
    step(0.8);
    expect(step(0.3)).toContain("pinch-start");
    // Antara pinchStart (0.35) dan pinchRelease (0.5): tetap pinch, tanpa event baru.
    for (const p of [0.4, 0.45, 0.38, 0.49]) expect(step(p)).not.toContain("pinch-end");
    expect(step(0.6)).toContain("pinch-end");
    expect(step(0.4)).not.toContain("pinch-start");
  });

  it("mengabaikan tangan dengan confidence rendah", () => {
    const gi = new GestureInterpreter({ config: cfg });
    const f = gi.process(frame(0, hand("hand-right", 0.5, 0.5, 0.8, 0.2)));
    expect(f.events).toHaveLength(0);
  });

  it("hand-lost setelah grace period, disertai pinch-end bila sedang pinch", () => {
    const gi = new GestureInterpreter({ config: cfg });
    gi.process(frame(0, hand("hand-right", 0.5, 0.5, 0.8)));
    gi.process(frame(30, hand("hand-right", 0.5, 0.5, 0.1)));
    expect(types(gi.process(frame(100)).events)).toEqual([]); // masih dalam grace 180ms
    expect(types(gi.process(frame(300)).events)).toEqual(["pinch-end", "hand-lost"]);
    expect(gi.activeHandIds).toEqual([]);
  });

  it("membatasi jumlah tangan", () => {
    const gi = new GestureInterpreter({ config: cfg, maxHands: 1 });
    const f = gi.process(frame(0, hand("hand-right", 0.3, 0.5, 0.8, 0.9), hand("hand-left", 0.7, 0.5, 0.8, 0.99)));
    expect(f.hands.map((h) => h.handId)).toEqual(["hand-left"]);
  });

  it("pukulan turun cepat memicu satu strike, lalu re-arm", () => {
    const gi = new GestureInterpreter({ config: cfg, mirror: false });
    const strikes: GestureEvent[] = [];
    let t = 0;
    let y = 0.2;
    const push = (dy: number) => {
      y += dy;
      t += 33;
      strikes.push(...gi.process(frame(t, hand("hand-right", 0.5, y))).events.filter((e) => e.type === "strike"));
    };
    push(0);
    for (let i = 0; i < 6; i++) push(0.1); // ~3 unit/detik turun
    expect(strikes).toHaveLength(1);
    for (let i = 0; i < 6; i++) push(-0.05); // naik → re-arm
    for (let i = 0; i < 6; i++) push(0.1);
    expect(strikes).toHaveLength(2);
    const s = strikes[0]!;
    expect(s.type === "strike" && s.velocity).toBeGreaterThanOrEqual(40);
  });

  it("swipe horizontal saat tidak pinch", () => {
    const gi = new GestureInterpreter({ config: cfg, mirror: false });
    let t = 0;
    const evs: GestureEvent[] = [];
    for (let i = 0; i < 6; i++)
      evs.push(...gi.process(frame((t += 33), hand("hand-right", 0.1 + i * 0.15, 0.5))).events);
    const swipes = evs.filter((e) => e.type === "swipe");
    expect(swipes).toHaveLength(1);
    expect(swipes[0]!.type === "swipe" && swipes[0]!.direction).toBe("right");
  });

  it("reset melepaskan semua tangan", () => {
    const gi = new GestureInterpreter({ config: cfg });
    gi.process(frame(0, hand("hand-right", 0.5, 0.5, 0.1)));
    expect(types(gi.reset(10))).toEqual(["pinch-end", "hand-lost"]);
  });
});

describe("helpers", () => {
  it("velocity pukulan dalam 40..127", () => {
    expect(strikeVelocityToMidi(1, 1)).toBe(40);
    expect(strikeVelocityToMidi(100, 1)).toBe(127);
  });

  it("One Euro Filter meredam jitter tapi mengikuti perubahan besar", () => {
    const f = new OneEuroFilter(1, 0.01);
    let out = 0;
    for (let i = 0; i < 30; i++) out = f.filter(0.5 + (i % 2 ? 0.01 : -0.01), i * 33);
    expect(Math.abs(out - 0.5)).toBeLessThan(0.006);
    for (let i = 30; i < 90; i++) out = f.filter(0.9, i * 33);
    expect(out).toBeCloseTo(0.9, 2);
  });
});
