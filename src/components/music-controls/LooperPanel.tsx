import { Circle, Download, Play, Square, Trash2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef } from "react";
import { useApp, useController } from "../../app/context";
import type { MetronomeSettings } from "../../config/app-settings";
import { cx } from "../../utils/cx";
import { Button, Slider, Toggle } from "../ui/primitives";

const STATE_LABEL = {
  idle: "Siap merekam",
  "count-in": "Hitungan masuk…",
  recording: "Merekam",
  playing: "Memutar loop",
  overdubbing: "Overdub",
  stopped: "Berhenti",
} as const;

export function LooperPanel() {
  const controller = useController();
  const looper = useApp((s) => s.looper);
  const metro = useApp((s) => s.settings.metronome);
  const setMetro = (patch: Partial<MetronomeSettings>) =>
    controller.updateSettings({ metronome: { ...metro, ...patch } });
  const recording = looper.state === "recording" || looper.state === "overdubbing" || looper.state === "count-in";
  const playing = looper.state === "playing" || looper.state === "overdubbing";

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-stage-700 p-3">
        <p className="mb-3 text-xs font-semibold tracking-wide text-ink-muted uppercase">Metronom</p>
        <div className="mb-3">
          <Toggle label="Nyalakan metronom" checked={metro.enabled} onChange={(enabled) => setMetro({ enabled })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Slider
            label="Tempo"
            value={metro.bpm}
            min={40}
            max={220}
            format={(v) => `${v} BPM`}
            onChange={(bpm) => setMetro({ bpm })}
          />
          <Slider
            label="Ketukan / bar"
            value={metro.beatsPerBar}
            min={2}
            max={7}
            format={(v) => `${v}/4`}
            onChange={(beatsPerBar) => setMetro({ beatsPerBar })}
          />
        </div>
        <div className="mt-3 flex flex-col gap-3">
          <Slider
            label="Volume klik"
            value={metro.volume}
            min={0}
            max={1}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(volume) => setMetro({ volume })}
          />
          <Toggle
            label="Hitungan 1 bar sebelum merekam"
            checked={metro.countIn}
            onChange={(countIn) => setMetro({ countIn })}
          />
          <Toggle
            label="Bulatkan panjang loop ke bar"
            checked={metro.quantizeLoop}
            onChange={(quantizeLoop) => setMetro({ quantizeLoop })}
          />
        </div>
      </div>

      <div className="rounded-xl border border-stage-700 p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Looper</p>
          <span
            className={cx("flex items-center gap-1.5 text-xs", recording ? "text-bad" : "text-ink-muted")}
            role="status"
          >
            {recording && <span className="animate-rec h-2 w-2 rounded-full bg-bad" aria-hidden />}
            {STATE_LABEL[looper.state]}
            {looper.loopLength ? ` · ${looper.loopLength.toFixed(1)} dtk` : ""}
          </span>
        </div>
        <LoopProgress active={playing || looper.state === "recording"} />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button
            variant={recording ? "danger" : "secondary"}
            onClick={() => controller.recordToggle()}
            aria-pressed={recording}
          >
            <Circle className={cx("h-4 w-4", !recording && "fill-bad text-bad")} aria-hidden />
            {recording ? "Selesai" : looper.loopLength ? "Overdub" : "Rekam"}
          </Button>
          {playing ? (
            <Button onClick={() => controller.stopLoop()}>
              <Square className="h-4 w-4" aria-hidden /> Stop
            </Button>
          ) : (
            <Button onClick={() => controller.playLoop()} disabled={!looper.loopLength}>
              <Play className="h-4 w-4" aria-hidden /> Putar
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => controller.clearLoop()}
            disabled={looper.layers.length === 0 && looper.state === "idle"}
          >
            <Trash2 className="h-4 w-4" aria-hidden /> Hapus
          </Button>
        </div>
        {looper.error && <p className="mt-2 text-xs text-warn">{looper.error}</p>}
        <p className="mt-2 text-[11px] text-ink-faint">
          Rekaman pertama menentukan panjang loop. Rekam lagi saat loop berputar untuk menumpuk layer dengan instrumen
          lain.
        </p>
        {looper.layers.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5" aria-label="Layer loop">
            {looper.layers.map((layer) => (
              <li key={layer.id} className="flex items-center gap-2 rounded-lg bg-stage-900 px-2 py-1.5">
                <span className={cx("min-w-0 flex-1 truncate text-sm", layer.muted && "text-ink-faint line-through")}>
                  {layer.name} · {layer.channel !== null ? layer.instrumentName : "Drum"}
                  {layer.channel !== null && layer.drumChannel !== null ? " + Drum" : ""}
                </span>
                <span className="font-mono text-[11px] text-ink-faint">
                  {layer.events.filter((e) => e.type === "on").length} nada
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => controller.toggleLayerMute(layer.id)}
                  aria-label={layer.muted ? `Bunyikan ${layer.name}` : `Bisukan ${layer.name}`}
                >
                  {layer.muted ? (
                    <VolumeX className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" aria-hidden />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => controller.deleteLayer(layer.id)}
                  aria-label={`Hapus ${layer.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button
          className="mt-3 w-full"
          size="sm"
          onClick={() => controller.exportMidi(2)}
          disabled={!looper.loopLength}
        >
          <Download className="h-4 w-4" aria-hidden /> Ekspor MIDI (.mid)
        </Button>
      </div>
    </div>
  );
}

function LoopProgress({ active }: { active: boolean }) {
  const controller = useController();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) {
      if (ref.current) ref.current.style.width = "0%";
      return;
    }
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (ref.current) ref.current.style.width = `${controller.loopPhase() * 100}%`;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, controller]);
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-stage-700" aria-hidden>
      <div ref={ref} className="h-full w-0 bg-glow" />
    </div>
  );
}
