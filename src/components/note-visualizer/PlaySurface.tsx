import { ChevronDown, ChevronUp } from "lucide-react";
import { useApp, useController } from "../../app/context";
import { OCTAVE_LIMITS } from "../../config/app-settings";
import { formatProgramNumber } from "../../data/instruments/gm-programs";
import { useNoteName } from "../../hooks/useNoteName";
import { Button } from "../ui/primitives";
import { DrumPads } from "./DrumPads";
import { LevelMeter } from "./LevelMeter";
import { PianoKeyboard } from "./PianoKeyboard";

export function PlaySurface() {
  const controller = useController();
  const mode = useApp((s) => s.settings.mode);
  const active = useApp((s) => s.activeNotes);
  const noteName = useNoteName();
  const startOctave = useApp((s) => s.settings.startOctave);
  const instrumentId = useApp((s) => s.settings.instrumentId);
  const instrument = useApp((s) => s.catalog.instruments.find((i) => i.id === instrumentId));
  const kitProgram = useApp((s) => s.settings.drumKitProgram);
  const kit = useApp((s) => s.catalog.drumKits.find((k) => k.programNumber === kitProgram));

  return (
    <section className="rounded-2xl border border-stage-700 bg-stage-850/80 p-4" aria-label="Area bermain manual">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
            {mode === "drums"
              ? "Kit drum"
              : `Program ${instrument ? formatProgramNumber(instrument.programNumber) : "—"}`}
          </p>
          <p className="truncate text-base font-semibold text-ink">
            {mode === "drums" ? (kit?.name ?? "Standard") : (instrument?.presetName ?? instrument?.name ?? "—")}
          </p>
        </div>
        <div
          className="min-h-8 min-w-24 rounded-xl bg-stage-900 px-3 py-1.5 text-center font-mono text-lg font-semibold text-spot tabular-nums"
          aria-live="polite"
          aria-label="Nada aktif"
          data-testid="active-notes"
        >
          {mode === "drums" ? "●" : active.length ? active.map(noteName).join(" ") : "—"}
        </div>
        {mode !== "drums" && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              aria-label="Oktaf turun (Z)"
              disabled={startOctave <= OCTAVE_LIMITS.minStart}
              onClick={() => controller.shiftOctave(-1)}
            >
              <ChevronDown className="h-4 w-4" aria-hidden />
            </Button>
            <span className="w-14 text-center text-xs text-ink-muted">Oktaf {startOctave}</span>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Oktaf naik (X)"
              disabled={startOctave >= OCTAVE_LIMITS.maxStart}
              onClick={() => controller.shiftOctave(1)}
            >
              <ChevronUp className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        )}
      </div>
      <div className="mb-3">
        <LevelMeter />
      </div>
      {mode === "drums" ? <DrumPads /> : <PianoKeyboard />}
      <p className="mt-3 text-[11px] text-ink-faint">
        {mode === "drums"
          ? "Keyboard: Q W E R / A S D F untuk pad · Esc menghentikan semua bunyi."
          : "Keyboard: A W S E D F T G Y H U J K… untuk nada · Z/X oktaf · Spasi sustain · Esc hentikan semua bunyi."}
      </p>
    </section>
  );
}
