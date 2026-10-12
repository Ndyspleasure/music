import { X } from "lucide-react";
import { useApp, useController } from "../../app/context";
import { cx } from "../../utils/cx";

export function Toasts() {
  const controller = useController();
  const toasts = useApp((s) => s.toasts);
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      aria-live="assertive"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          className={cx(
            "pointer-events-auto flex w-full max-w-lg items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur",
            t.kind === "error" && "border-bad/50 bg-stage-850/95 text-ink",
            t.kind === "warning" && "border-warn/50 bg-stage-850/95 text-ink",
            t.kind === "success" && "border-ok/40 bg-stage-850/95 text-ink",
            t.kind === "info" && "border-stage-600 bg-stage-850/95 text-ink",
          )}
        >
          <span
            aria-hidden
            className={cx(
              "mt-1.5 h-2 w-2 shrink-0 rounded-full",
              t.kind === "error"
                ? "bg-bad"
                : t.kind === "warning"
                  ? "bg-warn"
                  : t.kind === "success"
                    ? "bg-ok"
                    : "bg-glow",
            )}
          />
          <p className="flex-1">{t.message}</p>
          <button
            type="button"
            onClick={() => controller.dismissToast(t.id)}
            className="text-ink-faint hover:text-ink"
            aria-label="Tutup notifikasi"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
