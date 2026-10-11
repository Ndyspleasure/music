import { GM_PROGRAM_NAMES, gmCategoryOf, gmInstrumentId } from "../../data/instruments/gm-programs";
import type { DrumKitDefinition, InstrumentCategory, InstrumentDefinition, PresetInfo } from "../../types/instrument";
import type { MidiPatch } from "../../types/music";

export const MAIN_BANK_ID = "main";
export const USER_BANK_ID = "user-pack";

export interface InstrumentCatalog {
  instruments: InstrumentDefinition[];
  drumKits: DrumKitDefinition[];
}

export interface CatalogInput {
  /** Preset dari bank utama. Kosong bila bank belum dimuat. */
  mainPresets: PresetInfo[];
  /** Preset dari sound pack pengguna (sudah dengan bank offset). */
  userPresets?: PresetInfo[];
  userPackName?: string;
}

export function patchKey(p: MidiPatch): string {
  return `${p.bankMSB}:${p.bankLSB}:${p.program}`;
}

/** Katalog lengkap: 128 program GM (selalu ada, dengan status ketersediaan), variasi bank, dan custom pack. */
export function buildCatalog({ mainPresets, userPresets = [], userPackName }: CatalogInput): InstrumentCatalog {
  const melodic = mainPresets.filter((p) => !p.isDrum);
  const gmByProgram = new Map<number, PresetInfo>();
  for (const p of melodic) {
    if (p.bankMSB === 0 && p.bankLSB === 0 && !gmByProgram.has(p.program)) gmByProgram.set(p.program, p);
  }

  const instruments: InstrumentDefinition[] = GM_PROGRAM_NAMES.map((name, program) => {
    const preset = gmByProgram.get(program);
    return {
      id: gmInstrumentId(program),
      name,
      category: gmCategoryOf(program),
      source: "general-midi",
      programNumber: program,
      bankNumber: 0,
      bankLSB: 0,
      soundBankId: MAIN_BANK_ID,
      tags: ["gm"],
      available: Boolean(preset),
      presetName: preset?.name,
    };
  });

  const variations = melodic
    .filter((p) => !(p.bankMSB === 0 && p.bankLSB === 0) && p.program >= 0 && p.program <= 127)
    .toSorted((a, b) => a.program - b.program || a.bankMSB - b.bankMSB || a.bankLSB - b.bankLSB);
  for (const p of variations) {
    instruments.push({
      id: `var-${patchKey(p)}`,
      name: p.name,
      category: gmCategoryOf(p.program),
      source: "bank-variation",
      programNumber: p.program,
      bankNumber: p.bankMSB,
      bankLSB: p.bankLSB,
      soundBankId: MAIN_BANK_ID,
      tags: ["variasi", `bank ${p.bankMSB}`],
      available: true,
      presetName: p.name,
    });
  }

  for (const p of userPresets.filter((u) => !u.isDrum && u.program >= 0 && u.program <= 127)) {
    instruments.push({
      id: `user-${patchKey(p)}`,
      name: p.name,
      category: gmCategoryOf(p.program),
      source: "custom-pack",
      programNumber: p.program,
      bankNumber: p.bankMSB,
      bankLSB: p.bankLSB,
      soundBankId: USER_BANK_ID,
      tags: ["custom", userPackName ?? "sound pack"],
      available: true,
      presetName: p.name,
    });
  }

  const drumKits: DrumKitDefinition[] = mainPresets
    .filter((p) => p.isDrum && p.bankMSB === 0)
    .toSorted((a, b) => a.program - b.program)
    .map((p) => ({ id: `kit-${p.program}`, name: p.name, programNumber: p.program, soundBankId: MAIN_BANK_ID }));

  return { instruments, drumKits };
}

export interface CatalogFilter {
  query?: string;
  category?: InstrumentCategory | "all";
  source?: InstrumentDefinition["source"] | "all";
  onlyAvailable?: boolean;
}

export function filterInstruments(list: InstrumentDefinition[], f: CatalogFilter): InstrumentDefinition[] {
  const q = f.query?.trim().toLowerCase() ?? "";
  return list.filter((i) => {
    if (f.category && f.category !== "all" && i.category !== f.category) return false;
    if (f.source && f.source !== "all" && i.source !== f.source) return false;
    if (f.onlyAvailable && !i.available) return false;
    if (!q) return true;
    return (
      i.name.toLowerCase().includes(q) ||
      (i.presetName?.toLowerCase().includes(q) ?? false) ||
      i.tags.some((t) => t.toLowerCase().includes(q)) ||
      String(i.programNumber + 1) === q
    );
  });
}

export function instrumentPatch(i: InstrumentDefinition): MidiPatch {
  return { program: i.programNumber, bankMSB: i.bankNumber, bankLSB: i.bankLSB };
}
