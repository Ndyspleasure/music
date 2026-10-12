import type { HandTrackingResult } from "../../types/gesture";

export type TrackerStatus = "idle" | "loading" | "ready" | "running" | "error";

export interface HandTrackingService {
  initialize(): Promise<void>;
  start(video: HTMLVideoElement): void;
  stop(): void;
  dispose(): void;
  setNumHands(n: number): Promise<void>;
  onResults(callback: (result: HandTrackingResult) => void): () => void;
  /** Frame per detik inferensi aktual (untuk panel status). */
  readonly fps: number;
}
