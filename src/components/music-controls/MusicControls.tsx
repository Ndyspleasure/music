import { Drum, Hand, MoveHorizontal, Music2, Piano } from "lucide-react";
import { useApp, useController } from "../../app/context";
import { OCTAVE_LIMITS, type NoteInput } from "../../config/app-settings";
import { CHORD_TYPES } from "../../features/music-theory/chords";
import { layoutRange } from "../../features/music-theory/note-layout";
import { fingerSlotLabels } from "../hand-guide/finger-labels";
import { midiToNoteName, pitchClassName } from "../../features/music-theory/notes";
import { SCALE_IDS, SCALES } from "../../features/music-theory/scales";
import type { NoteNaming } from "../../features/music-theory/note-naming";
import type { ChordType, PlayMode, ScaleId } from "../../types/music";
import { cx } from "../../utils/cx";
import { Field, Segmented, Select, Slider, Toggle } from "../ui/primitives";

export function MusicControls() {
  const controller = useController();
  const s = useApp((st) => st.settings);
  const set = controller.updateSettings.bind(controller);
  const { low, high } = layoutRange(s);
  const fingers = s.noteInput === "fingers";
  const fingerLabels = fingerSlotLabels(s);

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
      <Segmented<NoteInput>
        label="Cara memilih nada"
        value={s.noteInput}
        onChange={(noteInput) => set({ noteInput })}
        options={[
          { value: "fingers", label: "Jari", icon: <Hand className="h-4 w-4" aria-hidden /> },
          { value: "position", label: "Posisi tangan", icon: <MoveHorizontal className="h-4 w-4" aria-hidden /> },
        ]}
      />
      <p className="-mt-2 text-[11px] text-ink-faint">
        {fingers
          ? "Sentuhkan ujung ibu jari ke telunjuk, jari tengah, jari manis, atau kelingking — tiap jari bunyi berbeda, tangan boleh di mana saja."
          : s.mode === "drums"
            ? "Ayun tangan ke bawah dengan cepat di atas pad, atau cubit untuk mengetuk pad."
            : "Geser tangan ke kiri–kanan untuk memilih zona nada, cubit (ibu jari + telunjuk) untuk membunyikan."}
        {!fingers && s.mode === "chord" && " Setiap cubitan memainkan akor yang disusun dari nada skala."}
      </p>
      {fingers && (
        <table className="-mt-1 w-full table-fixed text-center text-[11px]" aria-label="Peta jari ke nada">
          <thead className="text-ink-faint">
            <tr>
              <th scope="col" className="text-left font-medium">
                Jari
              </th>
              <th scope="col" className="font-medium">
                Telunjuk
              </th>
              <th scope="col" className="font-medium">
                Tengah
              </th>
              <th scope="col" className="font-medium">
                Manis
              </th>
              <th scope="col" className="font-medium">
                Kelingking
              </th>
            </tr>
          </thead>
          <tbody className="font-mono text-ink">
            {(["Kiri", "Kanan"] as const).map((side, row) => (
              <tr key={side}>
                <th scope="row" className="text-left font-sans font-medium text-ink-faint">
                  {side}
                </th>
                {fingerLabels.slice(row * 4, row * 4 + 4).map((label, i) => (
                  <td key={i} className={cx("truncate py-0.5", s.mode === "drums" && "font-sans")}>
                    {label}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

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
          {!fingers && (
            <Toggle
              label="Kunci ke tangga nada"
              hint="Zona gesture hanya berisi nada dalam skala — lebih mudah terdengar harmonis."
              checked={s.quantize}
              onChange={(quantize) => set({ quantize })}
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Slider
              label="Oktaf awal"
              value={s.startOctave}
              min={OCTAVE_LIMITS.minStart}
              max={OCTAVE_LIMITS.maxStart}
              onChange={(startOctave) => set({ startOctave })}
              format={(v) => `C${v}`}
            />
            {!fingers && (
              <Slider
                label="Jumlah oktaf"
                value={s.octaveCount}
                min={OCTAVE_LIMITS.minCount}
                max={OCTAVE_LIMITS.maxCount}
                onChange={(octaveCount) => set({ octaveCount })}
              />
            )}
          </div>
          {!fingers && (
            <p className="-mt-2 text-[11px] text-ink-faint">
              Rentang aktif: {midiToNoteName(low, s.preferFlats)} – {midiToNoteName(high, s.preferFlats)}
            </p>
          )}
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
          {!fingers && (
            <Field label="Saat pindah zona sambil mencubit">
              {(id) => (
                <Select
                  id={id}
                  value={s.glide}
                  onChange={(e) => set({ glide: e.target.value as "retrigger" | "hold" })}
                >
                  <option value="retrigger">Ganti ke nada baru</option>
                  <option value="hold">Tahan nada pertama</option>
                </Select>
              )}
            </Field>
          )}
          <Toggle
            label="Ekspresi dari tinggi tangan"
            hint="Tangan lebih tinggi saat nada berbunyi = suara lebih kuat (MIDI CC11)."
            checked={s.expression}
            onChange={(expression) => set({ expression })}
          />
          <Toggle
            label="Swipe untuk ganti oktaf"
            hint="Kibaskan tangan (tanpa menyentuhkan jari) ke kanan/kiri untuk naik/turun oktaf."
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
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-muted">Nama nada</span>
        <Segmented<NoteNaming>
          label="Nama nada"
          value={s.noteNaming}
          onChange={(noteNaming) => set({ noteNaming })}
          options={[
            { value: "letter", label: "C D E" },
            { value: "solfege", label: "Do Re Mi" },
            { value: "number", label: "1 2 3" },
          ]}
        />
        <p className="text-[11px] text-ink-faint">
          Do Re Mi dan 1 2 3 dihitung dari nada dasar: do = 1 = {pitchClassName(s.root, s.preferFlats)}. Tanda ' / titik
          di atas = oktaf lebih tinggi.
        </p>
      </div>
      <Toggle label="Gunakan nama ♭ (mol)" checked={s.preferFlats} onChange={(preferFlats) => set({ preferFlats })} />
    </div>
  );
}
