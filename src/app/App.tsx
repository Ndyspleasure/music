import { StagePanel } from "../components/camera/StagePanel";
import { AboutDialog } from "../components/dialogs/AboutDialog";
import { TutorialDialog } from "../components/dialogs/TutorialDialog";
import { AppHeader } from "../components/layout/AppHeader";
import { SidePanel } from "../components/layout/SidePanel";
import { PlaySurface } from "../components/note-visualizer/PlaySurface";
import { StatusPanel } from "../components/status/StatusPanel";
import { Toasts } from "../components/status/Toasts";
import { useComputerKeyboard } from "../hooks/useComputerKeyboard";

export function App() {
  useComputerKeyboard();
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-spot focus:px-3 focus:py-2 focus:text-stage-950"
      >
        Lompat ke konten utama
      </a>
      <AppHeader />
      <main
        id="main"
        className="mx-auto grid max-w-[1500px] grid-cols-1 gap-4 px-3 py-3 sm:px-4 sm:py-4 lg:grid-cols-[minmax(0,1fr)_400px]"
      >
        <div className="flex min-w-0 flex-col gap-4">
          <StagePanel />
          <PlaySurface />
          <StatusPanel />
        </div>
        <aside className="min-w-0 lg:sticky lg:top-[72px] lg:self-start" aria-label="Kontrol instrumen">
          <SidePanel />
        </aside>
      </main>
      <footer className="mx-auto max-w-[1500px] px-4 pb-8 text-center text-[11px] text-ink-faint">
        Video kamera diproses lokal di browser. Suara: GeneralUser GS oleh S. Christian Collins.
      </footer>
      <Toasts />
      <TutorialDialog />
      <AboutDialog />
    </>
  );
}
