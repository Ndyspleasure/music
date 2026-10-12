import { Camera, CameraOff, Hand, Loader2, ShieldCheck, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp, useController } from "../../app/context";
import { cx } from "../../utils/cx";
import { HandGuide } from "../hand-guide/HandGuide";
import { useLiveFingers } from "../hand-guide/use-live-fingers";
import { Button } from "../ui/primitives";
import { StageOverlay } from "./StageOverlay";

export function StagePanel() {
  const controller = useController();
  const videoRef = useRef<HTMLVideoElement>(null);
  const session = useApp((s) => s.session);
  const camera = useApp((s) => s.camera);
  const tracker = useApp((s) => s.tracker);
  const hands = useApp((s) => s.handsDetected);
  const mirror = useApp((s) => s.settings.mirror);
  const mode = useApp((s) => s.settings.mode);
  const noteInput = useApp((s) => s.settings.noteInput);
  const showGuide = useApp((s) => s.settings.showHandGuide);
  const [aspect, setAspect] = useState(4 / 3);
  const [fps, setFps] = useState(0);

  const running = session === "running";
  const busy = session === "starting" || session === "stopping";
  const live = useLiveFingers(running && showGuide);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setFps(controller.trackerFps), 1000);
    return () => clearInterval(id);
  }, [running, controller]);

  const start = () => {
    const video = videoRef.current;
    if (video) void controller.startSession(video);
  };

  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-2xl border border-stage-700 bg-stage-900",
        // Saat idle, tinggi mengikuti konten agar ajakan mulai tidak terpotong di layar sempit.
        !running && "flex min-h-[360px] items-center justify-center sm:aspect-[4/3] sm:min-h-0",
      )}
      style={running ? { aspectRatio: aspect } : undefined}
    >
      <video
        ref={videoRef}
        className={cx("absolute inset-0 h-full w-full object-fill", mirror && "-scale-x-100", !running && "invisible")}
        playsInline
        muted
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (v.videoWidth && v.videoHeight) setAspect(v.videoWidth / v.videoHeight);
        }}
        aria-label="Pratinjau kamera (diproses lokal di perangkat)"
      />
      {running && <div className="absolute inset-0 bg-stage-950/35" aria-hidden />}
      {running && <StageOverlay />}

      {running && (
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-stage-950/80 px-3 py-1 text-xs font-medium text-ink">
            <span className="h-2 w-2 animate-pulse rounded-full bg-bad" aria-hidden />
            Kamera aktif
          </span>
          <span className="rounded-full bg-stage-950/80 px-3 py-1 font-mono text-xs text-ink-muted tabular-nums">
            {fps} fps
          </span>
          <span
            className={cx(
              "inline-flex items-center gap-1.5 rounded-full bg-stage-950/80 px-3 py-1 text-xs",
              hands > 0 ? "text-ok" : "text-ink-muted",
            )}
            role="status"
          >
            <Hand className="h-3.5 w-3.5" aria-hidden />
            {hands > 0 ? `${hands} tangan terdeteksi` : "Tangan tidak terdeteksi"}
          </span>
        </div>
      )}
      {running && (
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <Button
            size="sm"
            variant={showGuide ? "primary" : "secondary"}
            aria-pressed={showGuide}
            onClick={() => controller.updateSettings({ showHandGuide: !showGuide })}
            title="Tampilkan/sembunyikan panduan tangan"
          >
            <Hand className="h-3.5 w-3.5" aria-hidden /> Panduan
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void controller.stopSession()}
            aria-label="Hentikan kamera"
          >
            <Square className="h-3.5 w-3.5" aria-hidden /> Stop
          </Button>
        </div>
      )}
      {running && showGuide && (
        <section
          aria-label="Panduan tangan"
          className="absolute top-14 right-3 w-[min(320px,calc(100%-1.5rem))] rounded-2xl border border-stage-600 bg-stage-950/85 p-3 shadow-xl backdrop-blur"
        >
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-semibold text-ink">{live ? "Jari Anda sekarang" : "Cara bermain"}</p>
            <button
              type="button"
              onClick={() => controller.updateSettings({ showHandGuide: false })}
              className="rounded-lg p-1 text-ink-muted hover:bg-stage-800 hover:text-ink"
              aria-label="Tutup panduan tangan"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <HandGuide live={live} compact />
        </section>
      )}
      {running && hands === 0 && !showGuide && (
        <p className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto max-w-sm -translate-y-1/2 rounded-xl bg-stage-950/75 px-4 py-3 text-center text-sm text-ink-muted">
          Angkat satu tangan ke depan kamera, telapak menghadap kamera. Pastikan pencahayaan cukup dan seluruh tangan
          terlihat.
        </p>
      )}

      {!running && (
        <div className="relative flex flex-col items-center justify-center gap-4 px-5 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stage-800 text-spot">
            {camera.status === "error" ? (
              <CameraOff className="h-7 w-7" aria-hidden />
            ) : (
              <Camera className="h-7 w-7" aria-hidden />
            )}
          </div>
          {camera.status !== "error" && (
            <div className="w-full max-w-sm">
              <HandGuide compact />
            </div>
          )}
          <div className="max-w-md space-y-2">
            <h2 className="text-lg font-semibold text-ink sm:text-xl">
              {camera.status === "error" ? "Kamera belum bisa dipakai" : "Ubah ruang di depan kamera jadi instrumen"}
            </h2>
            <p className="text-sm text-ink-muted">
              {camera.status === "error"
                ? camera.error
                : noteInput === "fingers"
                  ? "Angkat tangan ke depan kamera, lalu sentuhkan ibu jari ke jari lain seperti gambar di atas."
                  : mode === "drums"
                    ? "Ayunkan tangan ke bawah dengan cepat di atas pad untuk memukul drum, atau cubit untuk mengetuk."
                    : "Gerakkan telunjuk ke kiri–kanan untuk memilih nada, lalu cubit ibu jari dan telunjuk untuk membunyikannya."}
            </p>
            {tracker.status === "error" && <p className="text-sm text-bad">{tracker.error}</p>}
          </div>
          <Button variant="primary" size="lg" onClick={start} disabled={busy}>
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <Camera className="h-5 w-5" aria-hidden />
            )}
            {busy
              ? camera.status === "requesting"
                ? "Meminta izin kamera…"
                : "Memuat model tangan…"
              : camera.status === "error"
                ? "Coba lagi"
                : "Mulai Bermain"}
          </Button>
          <p className="flex items-center gap-1.5 text-xs text-ink-faint">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Video diproses lokal di browser Anda — tidak pernah diunggah.
          </p>
          <p className="text-xs text-ink-faint">Tanpa kamera? Mainkan dengan mouse/sentuh atau keyboard di bawah.</p>
        </div>
      )}
    </div>
  );
}
