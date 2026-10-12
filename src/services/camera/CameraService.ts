import { CameraError, cameraErrorMessage, toCameraError } from "./camera-errors";

export interface CameraStartOptions {
  deviceId?: string;
  width?: number;
  height?: number;
  frameRate?: number;
}

/** Mengelola lifecycle kamera: izin, stream ke <video>, dan penghentian semua track. */
export class CameraService {
  private stream: MediaStream | null = null;
  private endedListeners = new Set<() => void>();

  get active(): boolean {
    return this.stream?.getVideoTracks().some((t) => t.readyState === "live") ?? false;
  }

  async start(video: HTMLVideoElement, opts: CameraStartOptions = {}): Promise<MediaStream> {
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      throw new CameraError("insecure-context", cameraErrorMessage("insecure-context"));
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new CameraError("unsupported", cameraErrorMessage("unsupported"));
    }
    this.stop();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          deviceId: opts.deviceId ? { exact: opts.deviceId } : undefined,
          facingMode: opts.deviceId ? undefined : "user",
          width: { ideal: opts.width ?? 640 },
          height: { ideal: opts.height ?? 480 },
          frameRate: { ideal: opts.frameRate ?? 30, max: 60 },
        },
      });
    } catch (err) {
      throw toCameraError(err);
    }
    this.stream = stream;
    for (const track of stream.getVideoTracks()) {
      // Kamera dicabut / izin dicabut / device terputus saat sesi berjalan.
      track.addEventListener("ended", () => {
        if (this.stream === stream) {
          this.stop();
          for (const l of this.endedListeners) l();
        }
      });
    }
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    try {
      await video.play();
    } catch (err) {
      this.stop();
      throw toCameraError(err);
    }
    return stream;
  }

  stop(): void {
    if (this.stream) {
      for (const t of this.stream.getTracks()) t.stop();
      this.stream = null;
    }
  }

  detach(video: HTMLVideoElement | null): void {
    if (video) {
      video.pause();
      video.srcObject = null;
    }
  }

  onEnded(listener: () => void): () => void {
    this.endedListeners.add(listener);
    return () => this.endedListeners.delete(listener);
  }

  static async listDevices(): Promise<MediaDeviceInfo[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const all = await navigator.mediaDevices.enumerateDevices();
    return all.filter((d) => d.kind === "videoinput");
  }
}
