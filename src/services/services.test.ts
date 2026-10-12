import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, sanitizeSettings } from "../config/app-settings";
import { GESTURE_PRESETS, sanitizeGestureConfig } from "../config/gesture-config";
import { toCameraError } from "./camera/camera-errors";
import { memoryStore } from "./storage/local-store";
import { SettingsStorage } from "./storage/settings-storage";
import { toTrackingResult } from "./tracking/mediapipe-adapter";

describe("sanitizeSettings", () => {
  it("data kosong/rusak → default", () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings("junk")).toEqual(DEFAULT_SETTINGS);
  });

  it("nilai di luar rentang di-clamp, tipe salah diabaikan", () => {
    const s = sanitizeSettings({
      mode: "laser",
      root: 99,
      scale: "nope",
      volume: 7,
      velocity: -3,
      startOctave: 7,
      octaveCount: 4,
      maxHands: 5,
      effects: { reverb: "loud", delayFeedback: 3 },
      metronome: { bpm: 1000 },
      gesture: { pinchStart: 0.6, pinchRelease: 0.2, evil: 1 },
    });
    expect(s.mode).toBe("melodic");
    expect(s.root).toBe(11);
    expect(s.scale).toBe("major");
    expect(s.volume).toBe(1);
    expect(s.velocity).toBe(1);
    expect(s.octaveCount).toBe(2); // C7 + 2 oktaf = batas aman MIDI
    expect(s.maxHands).toBe(2);
    expect(s.effects.reverb).toBe(DEFAULT_SETTINGS.effects.reverb);
    expect(s.effects.delayFeedback).toBe(0.85);
    expect(s.metronome.bpm).toBe(220);
    expect(s.gesture.pinchRelease).toBeGreaterThan(s.gesture.pinchStart);
    expect(s.gesture).not.toHaveProperty("evil");
  });

  it("konfigurasi gesture selalu punya hysteresis pinch positif", () => {
    const c = sanitizeGestureConfig({ ...GESTURE_PRESETS.normal, pinchStart: 0.5, pinchRelease: 0.4 });
    expect(c.pinchRelease).toBeGreaterThan(c.pinchStart);
  });
});

describe("SettingsStorage", () => {
  it("menyimpan, memuat, dan menghapus preset", () => {
    const store = new SettingsStorage(memoryStore());
    store.saveSettings({ ...DEFAULT_SETTINGS, scale: "blues" });
    expect(store.loadSettings().scale).toBe("blues");
    const list = store.savePreset("  Jazz  ", { ...DEFAULT_SETTINGS, root: 5 });
    expect(list[0]).toMatchObject({ name: "Jazz" });
    expect(store.loadPresets()[0]?.settings.root).toBe(5);
    // Nama sama menimpa preset lama.
    expect(store.savePreset("Jazz", DEFAULT_SETTINGS)).toHaveLength(1);
    expect(store.deletePreset(list[0]!.id)).toHaveLength(1);
  });

  it("tahan terhadap JSON rusak", () => {
    const kv = memoryStore();
    kv.set("gestura.settings.v1", "{oops");
    kv.set("gestura.presets.v1", '[{"id":1},{"id":"a","name":"ok","settings":{}}]');
    const s = new SettingsStorage(kv);
    expect(s.loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(s.loadPresets().map((p) => p.name)).toEqual(["ok"]);
  });
});

describe("toCameraError", () => {
  it.each([
    ["NotAllowedError", "permission-denied"],
    ["NotFoundError", "not-found"],
    ["NotReadableError", "in-use"],
    ["OverconstrainedError", "overconstrained"],
    ["Weird", "unknown"],
  ])("%s → %s", (name, kind) => {
    const err = toCameraError(Object.assign(new Error("x"), { name }));
    expect(err.kind).toBe(kind);
    expect(err.message.length).toBeGreaterThan(10);
  });
});

describe("toTrackingResult", () => {
  it("membalik label handedness MediaPipe (input tidak di-mirror) dan memberi ID unik", () => {
    const lm = [Array.from({ length: 21 }, () => ({ x: 0.1, y: 0.2, z: 0 }))];
    const r = toTrackingResult(
      {
        landmarks: [lm[0]!, lm[0]!],
        handedness: [[{ categoryName: "Left", score: 0.9 }], [{ categoryName: "Left", score: 0.8 }]],
      },
      42,
    );
    expect(r.timestamp).toBe(42);
    expect(r.hands.map((h) => [h.id, h.side, h.score])).toEqual([
      ["hand-right", "right", 0.9],
      ["hand-right-2", "right", 0.8],
    ]);
  });
});
