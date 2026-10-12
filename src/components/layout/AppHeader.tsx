import { CircleHelp, Info, OctagonX, Square, Volume2 } from "lucide-react";
import { useApp, useController } from "../../app/context";
import { Button } from "../ui/primitives";

export function AppHeader() {
  const controller = useController();
  const session = useApp((s) => s.session);
  const audio = useApp((s) => s.audio.status);
  const bank = useApp((s) => s.bank);

  return (
    <header className="sticky top-0 z-30 border-b border-stage-800 bg-stage-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <svg viewBox="0 0 64 64" className="h-8 w-8 shrink-0" aria-hidden>
            <rect width="64" height="64" rx="14" fill="#161a28" />
            <path
              d="M14 44c6-10 10-26 18-26s8 16 18 26"
              fill="none"
              stroke="#f6b73c"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <circle cx="32" cy="18" r="5" fill="#4fd6c8" />
          </svg>
          <div className="min-w-0">
            <h1 className="text-base leading-tight font-bold tracking-tight">Gestura</h1>
            <p className="hidden truncate text-[11px] text-ink-faint sm:block">Studio instrumen gerak tangan</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {audio !== "ready" && (
            <Button size="sm" variant="secondary" onClick={() => void controller.ensureAudio().catch(() => undefined)}>
              <Volume2 className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Aktifkan audio</span>
            </Button>
          )}
          {audio === "ready" && bank.status === "loading" && (
            <span className="hidden text-xs text-ink-muted sm:inline" role="status">
              Memuat suara {Math.round(bank.progress * 100)}%
            </span>
          )}
          {session === "running" && (
            <Button size="sm" variant="secondary" onClick={() => void controller.stopSession()}>
              <Square className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Stop kamera</span>
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => controller.panic()}
            aria-label="Hentikan semua bunyi (Esc)"
            title="Hentikan semua bunyi (Esc)"
          >
            <OctagonX className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => controller.openTutorial(true)}
            aria-label="Cara bermain"
            title="Cara bermain"
          >
            <CircleHelp className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => controller.openAbout(true)}
            aria-label="Tentang, privasi & lisensi"
            title="Tentang"
          >
            <Info className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </header>
  );
}
