import { FolderOpen, Loader2, Search, Trash2 } from "lucide-react";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import { useApp, useController } from "../../app/context";
import { USER_PACK_EXTENSIONS } from "../../config/assets";
import { categoryLabel, formatProgramNumber, GM_CATEGORIES } from "../../data/instruments/gm-programs";
import { filterInstruments, type CatalogFilter } from "../../features/instruments/catalog";
import type { InstrumentCategory, InstrumentSource } from "../../types/instrument";
import { cx } from "../../utils/cx";
import { Badge, Button, Field, Select } from "../ui/primitives";

const SOURCE_LABEL: Record<InstrumentSource, string> = {
  "general-midi": "GM",
  "bank-variation": "Variasi",
  "custom-pack": "Pack",
};

export function InstrumentPicker() {
  const controller = useController();
  const instruments = useApp((s) => s.catalog.instruments);
  const drumKits = useApp((s) => s.catalog.drumKits);
  const selectedId = useApp((s) => s.settings.instrumentId);
  const mode = useApp((s) => s.settings.mode);
  const kitProgram = useApp((s) => s.settings.drumKitProgram);
  const bank = useApp((s) => s.bank);
  const userPack = useApp((s) => s.userPack);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CatalogFilter["category"]>("all");
  const [source, setSource] = useState<CatalogFilter["source"]>("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () => filterInstruments(instruments, { query: deferredQuery, category, source, onlyAvailable }),
    [instruments, deferredQuery, category, source, onlyAvailable],
  );
  const gmAvailable = instruments.filter((i) => i.source === "general-midi" && i.available).length;
  const variations = instruments.filter((i) => i.source === "bank-variation").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-stage-700 bg-stage-900 p-3 text-xs text-ink-muted" role="status">
        {bank.status === "ready" ? (
          <>
            <span className="font-semibold text-ink">{gmAvailable}/128</span> program GM tersedia di sound bank aktif ·{" "}
            {variations} variasi · {drumKits.length} kit drum
          </>
        ) : bank.status === "loading" ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Memuat sound bank…{" "}
            {Math.round(bank.progress * 100)}%
          </span>
        ) : bank.status === "error" ? (
          <span className="text-bad">
            Sound bank gagal dimuat. Daftar di bawah hanya metadata — suara belum tersedia.
          </span>
        ) : (
          <>
            Sound bank dimuat saat audio diaktifkan. Daftar 128 nama di bawah adalah metadata GM; status suara tampil
            setelah bank siap.
          </>
        )}
      </div>

      {mode === "drums" && (
        <Field label="Kit drum (kanal 10)">
          {(id) => (
            <Select
              id={id}
              value={kitProgram}
              onChange={(e) => controller.updateSettings({ drumKitProgram: Number(e.target.value) })}
            >
              {drumKits.length === 0 && <option value={0}>Standard (menunggu sound bank)</option>}
              {drumKits.map((k) => (
                <option key={k.id} value={k.programNumber}>
                  {formatProgramNumber(k.programNumber)} · {k.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}

      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari instrumen atau nomor (mis. 41, flute)…"
            aria-label="Cari instrumen"
            className="h-10 w-full rounded-xl border border-stage-600 bg-stage-800 pr-3 pl-9 text-sm text-ink placeholder:text-ink-faint"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select
            aria-label="Kategori"
            value={category}
            onChange={(e) => setCategory(e.target.value as InstrumentCategory | "all")}
          >
            <option value="all">Semua kategori</option>
            {GM_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Sumber"
            value={source}
            onChange={(e) => setSource(e.target.value as InstrumentSource | "all")}
          >
            <option value="all">Semua sumber</option>
            <option value="general-midi">General MIDI</option>
            <option value="bank-variation">Variasi bank</option>
            <option value="custom-pack">Sound pack saya</option>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} />
          Hanya yang tersedia di sound bank
        </label>
      </div>

      <ul
        className="scrollbar-thin -mx-1 flex max-h-[46vh] flex-col gap-1 overflow-y-auto px-1 lg:max-h-[52vh]"
        aria-label={`Daftar instrumen (${filtered.length})`}
      >
        {filtered.map((inst) => {
          const selected = inst.id === selectedId;
          return (
            <li key={inst.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  controller.selectInstrument(inst.id);
                  if (mode === "drums") controller.updateSettings({ mode: "melodic" });
                  void controller.ensureAudio().catch(() => undefined);
                }}
                className={cx(
                  "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
                  selected
                    ? "border-spot/70 bg-spot/10"
                    : "border-transparent hover:border-stage-600 hover:bg-stage-800",
                )}
              >
                <span className="w-9 shrink-0 font-mono text-xs text-ink-faint tabular-nums">
                  {formatProgramNumber(inst.programNumber)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cx("block truncate text-sm", selected ? "font-semibold text-ink" : "text-ink")}>
                    {inst.name}
                  </span>
                  <span className="block truncate text-[11px] text-ink-faint">
                    {categoryLabel(inst.category)}
                    {inst.presetName && inst.presetName !== inst.name ? ` · bank: ${inst.presetName}` : ""}
                    {inst.bankNumber ? ` · MSB ${inst.bankNumber}` : ""}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <Badge>{SOURCE_LABEL[inst.source]}</Badge>
                  {bank.status === "ready" &&
                    (inst.available ? <Badge tone="ok">Siap</Badge> : <Badge tone="warn">Tidak ada</Badge>)}
                </span>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="py-6 text-center text-sm text-ink-faint">Tidak ada instrumen yang cocok.</li>
        )}
      </ul>

      <div className="rounded-xl border border-dashed border-stage-600 p-3">
        <p className="text-sm font-medium text-ink">Sound pack tambahan</p>
        <p className="mt-1 text-[11px] leading-snug text-ink-faint">
          Muat file SoundFont/DLS milik Anda ({USER_PACK_EXTENSIONS.join(", ")}). File dibaca lokal di browser, tidak
          diunggah, dan tidak disimpan setelah halaman ditutup. Pastikan lisensinya mengizinkan pemakaian Anda.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept={USER_PACK_EXTENSIONS.join(",")}
          className="sr-only"
          aria-label="Pilih file sound pack"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void controller.loadUserPack(file);
          }}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={userPack.status === "loading"}>
            {userPack.status === "loading" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <FolderOpen className="h-3.5 w-3.5" aria-hidden />
            )}
            {userPack.status === "loading" ? "Memuat…" : "Muat sound pack"}
          </Button>
          {userPack.status === "ready" && (
            <>
              <span className="truncate text-xs text-ink-muted">
                {userPack.name} · {userPack.presetCount} preset
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void controller.removeUserPack()}
                aria-label="Lepas sound pack"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </>
          )}
          {userPack.status === "error" && <span className="text-xs text-bad">{userPack.error}</span>}
        </div>
      </div>
    </div>
  );
}
