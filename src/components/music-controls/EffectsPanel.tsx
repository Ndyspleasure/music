import { useApp, useController } from "../../app/context";
import type { EffectSettings } from "../../services/audio/InstrumentEngine";
import { Slider } from "../ui/primitives";

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function EffectsPanel() {
  const controller = useController();
  const volume = useApp((s) => s.settings.volume);
  const fx = useApp((s) => s.settings.effects);
  const setFx = (patch: Partial<EffectSettings>) => controller.updateSettings({ effects: { ...fx, ...patch } });

  return (
    <div className="flex flex-col gap-4">
      <Slider
        label="Volume master"
        value={volume}
        min={0}
        max={1}
        step={0.01}
        format={pct}
        onChange={(v) => controller.updateSettings({ volume: v })}
      />
      <Slider
        label="Reverb"
        value={fx.reverb}
        min={0}
        max={1}
        step={0.01}
        format={pct}
        onChange={(reverb) => setFx({ reverb })}
      />
      <Slider
        label="Chorus"
        value={fx.chorus}
        min={0}
        max={1}
        step={0.01}
        format={pct}
        onChange={(chorus) => setFx({ chorus })}
      />
      <Slider
        label="Filter (kecerahan)"
        value={fx.filter}
        min={0}
        max={1}
        step={0.01}
        format={(v) => (v >= 0.995 ? "Terbuka" : pct(v))}
        hint="Turunkan untuk suara lebih gelap/lembut (low-pass)."
        onChange={(filter) => setFx({ filter })}
      />
      <div className="rounded-xl border border-stage-700 p-3">
        <p className="mb-3 text-xs font-semibold tracking-wide text-ink-muted uppercase">Delay</p>
        <div className="flex flex-col gap-3">
          <Slider
            label="Campuran"
            value={fx.delayMix}
            min={0}
            max={1}
            step={0.01}
            format={(v) => (v === 0 ? "Mati" : pct(v))}
            onChange={(delayMix) => setFx({ delayMix })}
          />
          <Slider
            label="Waktu"
            value={fx.delayTime}
            min={0.05}
            max={1}
            step={0.01}
            format={(v) => `${Math.round(v * 1000)} ms`}
            onChange={(delayTime) => setFx({ delayTime })}
          />
          <Slider
            label="Feedback"
            value={fx.delayFeedback}
            min={0}
            max={0.85}
            step={0.01}
            format={pct}
            onChange={(delayFeedback) => setFx({ delayFeedback })}
          />
        </div>
      </div>
      <p className="text-[11px] text-ink-faint">Sustain: tahan Spasi. Tombol panik (Esc) menghentikan semua bunyi.</p>
    </div>
  );
}
