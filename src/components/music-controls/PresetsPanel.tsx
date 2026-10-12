import { Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { useApp, useController } from "../../app/context";
import { Button } from "../ui/primitives";

export function PresetsPanel() {
  const controller = useController();
  const presets = useApp((s) => s.presets);
  const [name, setName] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          controller.savePreset(name);
          setName("");
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Nama preset (mis. Strings Dorian)"
          aria-label="Nama preset"
          className="h-10 min-w-0 flex-1 rounded-xl border border-stage-600 bg-stage-800 px-3 text-sm text-ink placeholder:text-ink-faint"
        />
        <Button type="submit" variant="primary">
          <Save className="h-4 w-4" aria-hidden /> Simpan
        </Button>
      </form>
      <p className="text-[11px] text-ink-faint">
        Preset menyimpan instrumen, mode, skala, oktaf, efek, gesture, dan metronom di browser ini saja (localStorage).
      </p>
      {presets.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-faint">Belum ada preset tersimpan.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {presets.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-xl border border-stage-700 bg-stage-900 px-3 py-2"
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-sm text-ink hover:text-spot"
                onClick={() => controller.loadPreset(p.id)}
              >
                {p.name}
                <span className="block text-[11px] text-ink-faint">
                  {new Date(p.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => controller.deletePreset(p.id)}
                aria-label={`Hapus preset ${p.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
