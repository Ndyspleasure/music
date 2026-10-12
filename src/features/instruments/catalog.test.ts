import { describe, expect, it } from "vitest";
import type { PresetInfo } from "../../types/instrument";
import { buildCatalog, filterInstruments, instrumentPatch } from "./catalog";

const preset = (program: number, name: string, bankMSB = 0, isDrum = false): PresetInfo => ({
  program,
  name,
  bankMSB,
  bankLSB: 0,
  isDrum,
});

describe("buildCatalog", () => {
  it("selalu menampilkan 128 program GM, ketersediaan mengikuti bank", () => {
    const { instruments } = buildCatalog({ mainPresets: [] });
    expect(instruments).toHaveLength(128);
    expect(instruments.every((i) => !i.available)).toBe(true);
  });

  it("menandai program yang ada di bank dan menyimpan nama preset aktual", () => {
    const { instruments, drumKits } = buildCatalog({
      mainPresets: [
        preset(0, "Grand Piano"),
        preset(40, "Violin"),
        preset(4, "Chorused Tine EP", 8),
        preset(0, "Standard", 0, true),
        preset(25, "808/909", 0, true),
      ],
    });
    const gm = instruments.filter((i) => i.source === "general-midi");
    expect(gm).toHaveLength(128);
    expect(gm[0]).toMatchObject({ id: "gm-0", available: true, presetName: "Grand Piano", programNumber: 0 });
    expect(gm[1]?.available).toBe(false);
    expect(gm[40]?.available).toBe(true);
    const variation = instruments.find((i) => i.source === "bank-variation");
    expect(variation).toMatchObject({ name: "Chorused Tine EP", programNumber: 4, bankNumber: 8, category: "piano" });
    expect(drumKits.map((k) => k.programNumber)).toEqual([0, 25]);
  });

  it("menambahkan custom pack sebagai sumber terpisah", () => {
    const { instruments } = buildCatalog({
      mainPresets: [preset(0, "Grand Piano")],
      userPresets: [preset(5, "My Pad", 64)],
      userPackName: "pack.sf2",
    });
    const custom = instruments.filter((i) => i.source === "custom-pack");
    expect(custom).toHaveLength(1);
    expect(instrumentPatch(custom[0]!)).toEqual({ program: 5, bankMSB: 64, bankLSB: 0 });
  });
});

describe("filterInstruments", () => {
  const { instruments } = buildCatalog({ mainPresets: [preset(0, "Grand Piano"), preset(73, "Flute")] });

  it("pencarian nama, nomor tampilan, dan kategori", () => {
    expect(filterInstruments(instruments, { query: "flute" }).map((i) => i.programNumber)).toContain(73);
    expect(filterInstruments(instruments, { query: "74" }).map((i) => i.programNumber)).toEqual([73]);
    expect(filterInstruments(instruments, { category: "brass" })).toHaveLength(8);
    expect(filterInstruments(instruments, { onlyAvailable: true })).toHaveLength(2);
  });
});
