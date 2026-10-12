import { Drum, Music2, Piano } from "lucide-react";
import { useApp, useController } from "../../app/context";
import { OCTAVE_LIMITS } from "../../config/app-settings";
import { CHORD_TYPES } from "../../features/music-theory/chords";
import { layoutRange } from "../../features/music-theory/note-layout";
import { midiToNoteName, pitchClassName } from "../../features/music-theory/notes";
import { SCALE_IDS, SCALES } from "../../features/music-theory/scales";
import type { ChordType, PlayMode, ScaleId } from "../../types/music";
import { Field, Segmented, Select, Slider, Toggle } from "../ui/primitives";

export function MusicControls() {
  const controller = useController();
  const s = useApp((st) => st.settings);
  const set = controller.updateSettings.bind(controller);
  const { low, high } = layoutRange(s);

  return (
    <div className="flex flex-col gap-4">
      <Segmented<PlayMode>
        label="Mode bermain"
        value={s.mode}
        onChange={(mode) => set({ mode })}
        options={[
          { value: "melodic", label: "Melodi", icon: <Piano className="h-4 w-4" aria-hidden /> },
          { value: "chord", label: "Akor", icon: <Music2 className="h-4 w-4" aria-hidden /> },
          { value: "drums", label: "Drum", icon: <Drum className="h-4 w-4" aria-hidden /> },
        ]}
      />
      <p className="-mt-2 text-[11px] text-ink-faint">
        {s.mode === "melodic" && "Satu nada per tangan. Dua tangan = dua nada bersamaan."}
        {s.mode === "chord" && "Setiap cubitan memainkan akor yang disusun dari nada skala."}
        {s.mode === "drums" && "Ayun tangan ke bawah dengan cepat di atas pad, atau cubit untuk mengetuk pad."}
      </p>

      {s.mode !== "drums" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nada dasar (key)">
              {(id) => (
                <Select id={id} value={s.root} onChange={(e) => set({ root: Number(e.target.value) })}>
                  {Array.from({ length: 12 }, (_, pc) => (
                    <option key={pc} value={pc}>
                      {pitchClassName(pc, s.preferFlats)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Tangga nada">
              {(id) => (
                <Select id={id} value={s.scale} onChange={(e) => set({ scale: e.target.value as ScaleId })}>
                  {SCALE_IDS.map((sc) => (
                    <option key={sc} value={sc}>
                      {SCALES[sc].label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <Toggle
            label="Kunci ke tangga nada"
            hint="Zona gesture hanya berisi nada dalam skala — lebih mudah terdengar harmonis."
            checked={s.quantize}
            onChange={(quantize) => set({ quantize })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Slider
              label="Oktaf awal"
              value={s.startOctave}
              min={OCTAVE_LIMITS.minStart}
              max={OCTAVE_LIMITS.maxStart}
              onChange={(startOctave) => set({ startOctave })}
              format={(v) => `C${v}`}
            />
            <Slider
              label="Jumlah oktaf"
              value={s.octaveCount}
              min={OCTAVE_LIMITS.minCount}
              max={OCTAVE_LIMITS.maxCount}
              onChange={(octaveCount) => set({ octaveCount })}
            />
          </div>
          <p className="-mt-2 text-[11px] text-ink-faint">
            Rentang aktif: {midiToNoteName(low, s.preferFlats)} – {midiToNoteName(high, s.preferFlats)}
          </p>
          {s.mode === "chord" && (
            <Field label="Jenis akor">
              {(id) => (
                <Select id={id} value={s.chordType} onChange={(e) => set({ chordType: e.target.value as ChordType })}>
                  {CHORD_TYPES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
          <Field label="Saat pindah zona sambil mencubit">
            {(id) => (
              <Select id={id} value={s.glide} onChange={(e) => set({ glide: e.target.value as "retrigger" | "hold" })}>
                <option value="retrigger">Ganti ke nada baru</option>
                <option value="hold">Tahan nada pertama</option>
              </Select>
            )}
          </Field>
          <Toggle
            label="Ekspresi dari tinggi tangan"
            hint="Tangan lebih tinggi = suara lebih kuat (MIDI CC11)."
            checked={s.expression}
            onChange={(expression) => set({ expression })}
          />
          <Toggle
            label="Swipe untuk ganti oktaf"
            hint="Kibaskan tangan (tanpa mencubit) ke kanan/kiri untuk naik/turun oktaf."
            checked={s.swipeOctave}
            onChange={(swipeOctave) => set({ swipeOctave })}
          />
        </>
      )}
      <Slider
        label="Velocity (kekuatan nada)"
        value={s.velocity}
        min={20}
        max={127}
        onChange={(velocity) => set({ velocity })}
      />
      <Toggle
        label="Tampilkan nama nada"
        checked={s.showNoteNames}
        onChange={(showNoteNames) => set({ showNoteNames })}
      />
      <Toggle label="Gunakan nama ♭ (mol)" checked={s.preferFlats} onChange={(preferFlats) => set({ preferFlats })} />
    </div>
  );
}
