import { useApp, useController } from "../../app/context";
import type { GestureConfig, SensitivityPreset } from "../../config/gesture-config";
import { Field, Segmented, Select, Slider, Toggle } from "../ui/primitives";

export function GestureSettings() {
  const controller = useController();
  const s = useApp((st) => st.settings);
  const devices = useApp((st) => st.cameraDevices);
  const deviceId = useApp((st) => st.camera.deviceId);
  const g = s.gesture;
  const setG = (patch: Partial<GestureConfig>) => controller.updateSettings({ gesture: { ...g, ...patch } });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-muted">Sensitivitas gesture</span>
        <Segmented<SensitivityPreset | "custom">
          label="Sensitivitas gesture"
          value={s.sensitivity}
          onChange={(sensitivity) => sensitivity !== "custom" && controller.updateSettings({ sensitivity })}
          options={[
            { value: "sensitive", label: "Peka" },
            { value: "normal", label: "Normal" },
            { value: "steady", label: "Stabil" },
            ...(s.sensitivity === "custom" ? [{ value: "custom" as const, label: "Kustom" }] : []),
          ]}
        />
        <p className="text-[11px] text-ink-faint">
          Peka = respons cepat; Stabil = lebih tahan getaran tangan dan cahaya buruk.
        </p>
      </div>
      <Slider
        label="Ambang cubit (mulai)"
        value={g.pinchStart}
        min={0.15}
        max={0.7}
        step={0.01}
        format={(v) => v.toFixed(2)}
        hint="Lebih besar = cubitan lebih mudah terbaca. Lepas otomatis diberi jarak (hysteresis)."
        onChange={(pinchStart) => setG({ pinchStart, pinchRelease: Math.max(g.pinchRelease, pinchStart + 0.08) })}
      />
      <Slider
        label="Kehalusan pointer"
        value={g.smoothingMinCutoff}
        min={0.3}
        max={3}
        step={0.05}
        format={(v) => (v < 0.9 ? "Sangat halus" : v < 1.6 ? "Seimbang" : "Responsif")}
        onChange={(smoothingMinCutoff) => setG({ smoothingMinCutoff })}
      />
      <Slider
        label="Kekuatan pukulan drum minimum"
        value={g.strikeVelocity}
        min={0.6}
        max={3.5}
        step={0.05}
        format={(v) => v.toFixed(2)}
        onChange={(strikeVelocity) => setG({ strikeVelocity })}
      />
      <Slider
        label="Hysteresis batas zona"
        value={g.zoneHysteresis}
        min={0}
        max={0.4}
        step={0.01}
        format={(v) => `${Math.round(v * 100)}%`}
        hint="Mencegah nada berganti-ganti saat jari tepat di batas zona."
        onChange={(zoneHysteresis) => setG({ zoneHysteresis })}
      />
      <Slider
        label="Keyakinan minimum deteksi"
        value={g.minConfidence}
        min={0.3}
        max={0.95}
        step={0.01}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(minConfidence) => setG({ minConfidence })}
      />
      <Field label="Jumlah tangan">
        {(id) => (
          <Select
            id={id}
            value={s.maxHands}
            onChange={(e) => controller.updateSettings({ maxHands: Number(e.target.value) === 1 ? 1 : 2 })}
          >
            <option value={1}>1 tangan</option>
            <option value={2}>2 tangan (polifoni)</option>
          </Select>
        )}
      </Field>
      {devices.length > 1 && (
        <Field label="Kamera">
          {(id) => (
            <Select id={id} value={deviceId ?? ""} onChange={(e) => void controller.selectCamera(e.target.value)}>
              <option value="" disabled>
                Pilih kamera…
              </option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
      <Toggle
        label="Cerminkan kamera (mode selfie)"
        checked={s.mirror}
        onChange={(mirror) => controller.updateSettings({ mirror })}
      />
      <Toggle
        label="Tampilkan panduan tangan"
        hint="Gambar tangan di layar kamera yang menunjukkan jari mana memainkan nada apa."
        checked={s.showHandGuide}
        onChange={(showHandGuide) => controller.updateSettings({ showHandGuide })}
      />
      <Toggle
        label="Tampilkan kerangka tangan"
        checked={s.showLandmarks}
        onChange={(showLandmarks) => controller.updateSettings({ showLandmarks })}
      />
    </div>
  );
}
