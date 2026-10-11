import { RotateCcw } from "lucide-react";
import { useApp, useController } from "../../app/context";
import { ASSETS } from "../../config/assets";
import { Button, StatusDot, type Tone } from "../ui/primitives";

interface Row {
  label: string;
  value: string;
  tone: Tone;
  action?: { label: string; run: () => void };
}

/** Status kamera, model tracking, audio, dan sound bank — teks + ikon, tidak hanya warna. */
export function StatusPanel() {
  const controller = useController();
  const camera = useApp((s) => s.camera);
  const tracker = useApp((s) => s.tracker);
  const audio = useApp((s) => s.audio);
  const bank = useApp((s) => s.bank);
  const hands = useApp((s) => s.handsDetected);
  const session = useApp((s) => s.session);

  const rows: Row[] = [
    {
      label: "Kamera",
      value: { off: "Belum dimulai", requesting: "Meminta izin…", active: "Aktif", error: "Gagal" }[camera.status],
      tone: { off: "idle", requesting: "busy", active: "ok", error: "bad" }[camera.status] as Tone,
    },
    {
      label: "Model tangan",
      value: { idle: "Belum dimuat", loading: "Memuat…", ready: "Siap", error: "Gagal dimuat" }[tracker.status],
      tone: { idle: "idle", loading: "busy", ready: "ok", error: "bad" }[tracker.status] as Tone,
    },
    {
      label: "Tangan",
      value: session === "running" ? (hands > 0 ? `${hands} terdeteksi` : "Tidak terdeteksi") : "—",
      tone: session === "running" ? (hands > 0 ? "ok" : "warn") : "idle",
    },
    {
      label: "Audio",
      value: {
        idle: "Belum aktif — klik untuk mengaktifkan",
        initializing: "Menyiapkan…",
        ready: "Aktif",
        error: "Gagal",
        disposed: "Mati",
      }[audio.status],
      tone: { idle: "idle", initializing: "busy", ready: "ok", error: "bad", disposed: "idle" }[audio.status] as Tone,
      action:
        audio.status === "idle" || audio.status === "error"
          ? { label: "Aktifkan audio", run: () => void controller.retrySoundBank() }
          : undefined,
    },
    {
      label: "Sound bank",
      value:
        bank.status === "loading"
          ? `Memuat ${Math.round(bank.progress * 100)}%`
          : bank.status === "ready"
            ? ASSETS.soundFontName
            : bank.status === "error"
              ? (bank.error ?? "Gagal")
              : "Belum dimuat",
      tone: { none: "idle", loading: "busy", ready: "ok", error: "bad" }[bank.status] as Tone,
      action: bank.status === "error" ? { label: "Coba lagi", run: () => void controller.retrySoundBank() } : undefined,
    },
  ];

  return (
    <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2 rounded-xl bg-stage-900 px-3 py-2">
          <StatusDot tone={r.tone} />
          <dt className="text-xs text-ink-faint">{r.label}</dt>
          <dd className="min-w-0 flex-1 truncate text-right text-xs font-medium text-ink" title={r.value}>
            {r.value}
          </dd>
          {r.action && (
            <Button size="sm" variant="ghost" onClick={r.action.run} aria-label={r.action.label} title={r.action.label}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            </Button>
          )}
        </div>
      ))}
    </dl>
  );
}
