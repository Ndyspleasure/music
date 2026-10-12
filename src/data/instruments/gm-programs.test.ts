import { describe, expect, it } from "vitest";
import { formatProgramNumber, GM_CATEGORIES, GM_PROGRAM_NAMES, gmCategoryOf, gmInstrumentId } from "./gm-programs";

describe("katalog General MIDI", () => {
  it("berisi tepat 128 program dengan nama unik", () => {
    expect(GM_PROGRAM_NAMES).toHaveLength(128);
    expect(new Set(GM_PROGRAM_NAMES).size).toBe(128);
    expect(GM_CATEGORIES).toHaveLength(16);
  });

  it("indeks 0-based sesuai standar GM (tanpa off-by-one)", () => {
    expect(GM_PROGRAM_NAMES[0]).toBe("Acoustic Grand Piano");
    expect(GM_PROGRAM_NAMES[24]).toBe("Acoustic Guitar (nylon)");
    expect(GM_PROGRAM_NAMES[40]).toBe("Violin");
    expect(GM_PROGRAM_NAMES[56]).toBe("Trumpet");
    expect(GM_PROGRAM_NAMES[73]).toBe("Flute");
    expect(GM_PROGRAM_NAMES[127]).toBe("Gunshot");
  });

  it("kategori per 8 program", () => {
    expect(gmCategoryOf(0)).toBe("piano");
    expect(gmCategoryOf(7)).toBe("piano");
    expect(gmCategoryOf(8)).toBe("chromatic-percussion");
    expect(gmCategoryOf(127)).toBe("sound-effects");
    expect(() => gmCategoryOf(128)).toThrow(RangeError);
  });

  it("nomor tampilan 1..128 hanya dari formatProgramNumber", () => {
    expect(formatProgramNumber(0)).toBe("001");
    expect(formatProgramNumber(127)).toBe("128");
    expect(gmInstrumentId(5)).toBe("gm-5");
  });
});
