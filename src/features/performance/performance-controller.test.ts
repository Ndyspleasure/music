import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockInstrumentEngine } from "../../services/audio/MockInstrumentEngine";
import type { CameraService } from "../../services/camera/CameraService";
import { CameraError } from "../../services/camera/camera-errors";
import { memoryStore } from "../../services/storage/local-store";
import { SettingsStorage } from "../../services/storage/settings-storage";
import type { HandTrackingService } from "../../services/tracking/HandTrackingService";
import { initialAppState, type AppState } from "../../state/app-state";
import { createStore } from "../../state/create-store";
import { frame, hand } from "../../test/hand-fixtures";
import type { HandTrackingResult } from "../../types/gesture";
import type { PresetInfo } from "../../types/instrument";
import { PerformanceController } from "./performance-controller";

class FakeCamera {
  fail: Error | null = null;
  started = 0;
  stopped = 0;
  private ended = new Set<() => void>();
  async start() {
    if (this.fail) throw this.fail;
    this.started++;
    return {} as MediaStream;
  }
  stop() {
    this.stopped++;
  }
  detach() {}
  onEnded(l: () => void) {
    this.ended.add(l);
    return () => this.ended.delete(l);
  }
  fireEnded() {
    for (const l of this.ended) l();
  }
}

class FakeTracker implements HandTrackingService {
  fps = 30;
  running = false;
  cb: ((r: HandTrackingResult) => void) | null = null;
  async initialize() {}
  start() {
    this.running = true;
  }
  stop() {
    this.running = false;
  }
  dispose() {}
  async setNumHands() {}
  onResults(cb: (r: HandTrackingResult) => void) {
    this.cb = cb;
    return () => {
      this.cb = null;
    };
  }
}

const presets: PresetInfo[] = [
  ...Array.from({ length: 128 }, (_, p) => ({ program: p, bankMSB: 0, bankLSB: 0, name: `P${p}`, isDrum: false })),
  { program: 0, bankMSB: 0, bankLSB: 0, name: "Standard", isDrum: true },
];

function setup() {
  const store = createStore<AppState>(initialAppState());
  const engine = new MockInstrumentEngine();
  engine.presets = presets;
  const camera = new FakeCamera();
  const tracker = new FakeTracker();
  const controller = new PerformanceController({
    store,
    engine,
    camera: camera as unknown as CameraService,
    createTracker: () => tracker,
    storage: new SettingsStorage(memoryStore()),
    soundFontUrl: "/sf.sf3",
    download: vi.fn(),
  });
  return { store, engine, camera, tracker, controller, video: {} as HTMLVideoElement };
}

describe("PerformanceController", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] }));
  afterEach(() => vi.useRealTimers());

  it("audio: memuat bank, membangun katalog, dan memilih patch awal", async () => {
    const { controller, store, engine } = setup();
    await controller.ensureAudio();
    expect(store.getState().catalog.instruments.filter((i) => i.available)).toHaveLength(128);
    expect(engine.calls).toContainEqual({ fn: "patch", channel: 0, patch: { program: 0, bankMSB: 0, bankLSB: 0 } });
    expect(engine.calls).toContainEqual({ fn: "drum", channel: 9, isDrum: true });
  });

  it("ganti instrumen melepas note aktif dulu lalu mengirim program yang benar", async () => {
    const { controller, engine } = setup();
    await controller.ensureAudio();
    controller.manualNoteOn("key:A", 60);
    controller.selectInstrument("gm-40");
    expect(engine.soundingNotes()).toEqual([]);
    expect(engine.calls.at(-1)).toEqual({ fn: "patch", channel: 0, patch: { program: 40, bankMSB: 0, bankLSB: 0 } });
  });

  it("sesi kamera: start → frame tangan memainkan note → stop melepas note & kamera", async () => {
    const { controller, store, engine, camera, tracker, video } = setup();
    await controller.startSession(video);
    expect(store.getState().session).toBe("running");
    expect(tracker.running).toBe(true);
    // Zona 0 (C4) di ruang tampilan x≈0.06 → kamera x≈0.94 karena mirror.
    tracker.cb?.(frame(0, hand("hand-right", 0.94, 0.5, 0.9)));
    tracker.cb?.(frame(33, hand("hand-right", 0.94, 0.5, 0.1)));
    expect(store.getState().activeNotes).toEqual([60]);
    expect(store.getState().handsDetected).toBe(1);
    await controller.stopSession();
    expect(engine.soundingNotes()).toEqual([]);
    expect(camera.stopped).toBeGreaterThan(0);
    expect(tracker.running).toBe(false);
    expect(store.getState()).toMatchObject({ session: "idle", handsDetected: 0, activeNotes: [] });
  });

  it("izin kamera ditolak → status error yang jelas, sesi tidak berjalan", async () => {
    const { controller, store, camera, video } = setup();
    camera.fail = Object.assign(new Error("denied"), { name: "NotAllowedError" });
    await controller.startSession(video);
    expect(store.getState().session).toBe("idle");
    expect(store.getState().camera).toMatchObject({ status: "error", errorKind: "permission-denied" });
    expect(store.getState().toasts.at(-1)?.kind).toBe("error");
  });

  it("kamera terputus saat sesi → note dilepas dan sesi berhenti", async () => {
    const { controller, store, engine, camera, tracker, video } = setup();
    await controller.startSession(video);
    tracker.cb?.(frame(0, hand("hand-right", 0.5, 0.5, 0.9)));
    tracker.cb?.(frame(33, hand("hand-right", 0.5, 0.5, 0.1)));
    expect(engine.soundingNotes()).toHaveLength(1);
    camera.fireEnded();
    await vi.runAllTimersAsync();
    expect(engine.soundingNotes()).toEqual([]);
    expect(store.getState().session).toBe("idle");
  });

  it("panic menghentikan semua bunyi", async () => {
    const { controller, engine } = setup();
    await controller.ensureAudio();
    controller.manualNoteOn("a", 60);
    controller.hitDrumPad("snare");
    controller.panic();
    expect(engine.soundingNotes()).toEqual([]);
  });

  it("mode akor lewat keyboard memainkan triad", async () => {
    const { controller, store } = setup();
    await controller.ensureAudio();
    controller.updateSettings({ mode: "chord" });
    controller.manualNoteOn("key:A", 60);
    expect(store.getState().activeNotes).toEqual([60, 64, 67]);
    controller.manualNoteOff("key:A");
    expect(store.getState().activeNotes).toEqual([]);
  });

  it("CameraError dipakai apa adanya", () => {
    expect(new CameraError("not-found", "x").kind).toBe("not-found");
  });
});
