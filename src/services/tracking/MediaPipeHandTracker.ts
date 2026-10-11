import type { HandLandmarker } from "@mediapipe/tasks-vision";
import type { HandTrackingResult } from "../../types/gesture";
import type { HandTrackingService } from "./HandTrackingService";
import { toTrackingResult } from "./mediapipe-adapter";

export interface MediaPipeTrackerOptions {
  /** Folder berisi file WASM MediaPipe (disajikan sebagai aset statis). */
  wasmBasePath: string;
  modelAssetPath: string;
  numHands?: number;
}

/**
 * Hand tracking berbasis MediaPipe Tasks Vision. Semua inferensi berjalan lokal di browser;
 * frame kamera tidak pernah dikirim ke server.
 * Loop tracking berjalan di luar React (requestVideoFrameCallback / rAF).
 */
export class MediaPipeHandTracker implements HandTrackingService {
  private landmarker: HandLandmarker | null = null;
  private initPromise: Promise<void> | null = null;
  private callbacks = new Set<(r: HandTrackingResult) => void>();
  private video: HTMLVideoElement | null = null;
  private running = false;
  private rafId = 0;
  private vfcId = 0;
  private lastVideoTime = -1;
  private frameTimes: number[] = [];
  private fpsValue = 0;
  private readonly opts: MediaPipeTrackerOptions;

  constructor(opts: MediaPipeTrackerOptions) {
    this.opts = opts;
  }

  get fps(): number {
    return this.fpsValue;
  }

  initialize(): Promise<void> {
    this.initPromise ??= this.load().catch((err: unknown) => {
      this.initPromise = null;
      throw err;
    });
    return this.initPromise;
  }

  private async load(): Promise<void> {
    // Import dinamis: bundle MediaPipe hanya diunduh ketika sesi kamera dimulai.
    const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks(this.opts.wasmBasePath);
    const base = {
      runningMode: "VIDEO" as const,
      numHands: this.opts.numHands ?? 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    };
    try {
      this.landmarker = await HandLandmarker.createFromOptions(fileset, {
        ...base,
        baseOptions: { modelAssetPath: this.opts.modelAssetPath, delegate: "GPU" },
      });
    } catch (gpuErr) {
      console.warn("Delegate GPU MediaPipe gagal, beralih ke CPU.", gpuErr);
      this.landmarker = await HandLandmarker.createFromOptions(fileset, {
        ...base,
        baseOptions: { modelAssetPath: this.opts.modelAssetPath, delegate: "CPU" },
      });
    }
  }

  async setNumHands(n: number): Promise<void> {
    await this.landmarker?.setOptions({ numHands: n });
  }

  start(video: HTMLVideoElement): void {
    if (!this.landmarker) throw new Error("Model hand tracking belum dimuat.");
    this.video = video;
    this.running = true;
    this.lastVideoTime = -1;
    this.frameTimes = [];
    this.schedule();
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.vfcId && this.video && "cancelVideoFrameCallback" in this.video) {
      this.video.cancelVideoFrameCallback(this.vfcId);
    }
    this.rafId = 0;
    this.vfcId = 0;
    this.fpsValue = 0;
    this.video = null;
  }

  dispose(): void {
    this.stop();
    this.landmarker?.close();
    this.landmarker = null;
    this.initPromise = null;
    this.callbacks.clear();
  }

  onResults(callback: (r: HandTrackingResult) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private schedule(): void {
    if (!this.running || !this.video) return;
    const video = this.video;
    if ("requestVideoFrameCallback" in video) {
      this.vfcId = video.requestVideoFrameCallback(() => this.tick());
    } else {
      this.rafId = requestAnimationFrame(() => this.tick());
    }
  }

  private tick(): void {
    const video = this.video;
    const landmarker = this.landmarker;
    if (!this.running || !video || !landmarker) return;
    // Proses hanya bila ada frame video baru.
    if (video.readyState >= 2 && video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = video.currentTime;
      const now = performance.now();
      try {
        const raw = landmarker.detectForVideo(video, now);
        this.trackFps(now);
        const result = toTrackingResult(raw, now);
        for (const cb of this.callbacks) cb(result);
      } catch (err) {
        console.error("Inferensi hand tracking gagal", err);
      }
    }
    this.schedule();
  }

  private trackFps(now: number): void {
    this.frameTimes.push(now);
    while (this.frameTimes.length > 0 && now - (this.frameTimes[0] ?? now) > 1000) this.frameTimes.shift();
    this.fpsValue = this.frameTimes.length;
  }
}
