import { describe, expect, it } from "vitest";
import { buildFingerNotes } from "./note-layout";
import { formatNoteName } from "./note-naming";

const c4 = { root: 0, startOctave: 4 } as const;

describe("formatNoteName", () => {
  it("huruf: nama + oktaf ilmiah", () => {
    expect(formatNoteName(61, { ...c4, naming: "letter" })).toBe("C♯4");
    expect(formatNoteName(61, { ...c4, naming: "letter", preferFlats: true })).toBe("D♭4");
  });

  it("solmisasi C mayor: do re mi fa sol la si do'", () => {
    const notes = buildFingerNotes({ root: 0, scale: "major", startOctave: 4 });
    expect(notes.map((n) => formatNoteName(n, { ...c4, naming: "solfege" }))).toEqual([
      "do",
      "re",
      "mi",
      "fa",
      "sol",
      "la",
      "si",
      "do'",
    ]);
  });

  it("angka C mayor: 1–7 lalu 1 dengan titik atas", () => {
    const notes = buildFingerNotes({ root: 0, scale: "major", startOctave: 4 });
    expect(notes.map((n) => formatNoteName(n, { ...c4, naming: "number" }))).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "1̇",
    ]);
  });

  it("relatif terhadap nada dasar: key G → G = do = 1", () => {
    const g = { root: 7, startOctave: 3 } as const;
    expect(formatNoteName(55, { ...g, naming: "solfege" })).toBe("do"); // G3
    expect(formatNoteName(59, { ...g, naming: "number" })).toBe("3"); // B3
    expect(formatNoteName(66, { ...g, naming: "solfege" })).toBe("si"); // F♯4
  });

  it("nada kromatis dan oktaf bawah", () => {
    expect(formatNoteName(63, { ...c4, naming: "solfege" })).toBe("ri"); // D♯4
    expect(formatNoteName(63, { ...c4, naming: "number" })).toBe("#2");
    expect(formatNoteName(59, { ...c4, naming: "solfege" })).toBe("si,"); // B3
    expect(formatNoteName(59, { ...c4, naming: "number" })).toBe("7̣");
  });
});
