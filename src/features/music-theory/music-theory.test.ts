import { describe, expect, it } from "vitest";
import { buildChord } from "./chords";
import {
  buildFingerNotes,
  buildNoteLayout,
  FINGER_SLOT_COUNT,
  fingerSlot,
  layoutRange,
  ZoneTracker,
} from "./note-layout";
import { clampMidi, midiToFrequency, midiToNoteName, noteNumber, octaveOf, pitchClassName } from "./notes";
import { isInScale, quantizeToScale, SCALES, scaleNotesInRange } from "./scales";

describe("notes", () => {
  it("memakai konvensi MIDI 60 = C4", () => {
    expect(midiToNoteName(60)).toBe("C4");
    expect(midiToNoteName(61)).toBe("C♯4");
    expect(midiToNoteName(61, true)).toBe("D♭4");
    expect(midiToNoteName(0)).toBe("C-1");
    expect(midiToNoteName(127)).toBe("G9");
    expect(noteNumber(9, 4)).toBe(69);
    expect(octaveOf(59)).toBe(3);
  });

  it("A4 = 440 Hz", () => {
    expect(midiToFrequency(69)).toBeCloseTo(440);
    expect(midiToFrequency(81)).toBeCloseTo(880);
  });

  it("clamp ke 0..127", () => {
    expect(clampMidi(-5)).toBe(0);
    expect(clampMidi(200)).toBe(127);
    expect(pitchClassName(-1)).toBe("B");
  });
});

describe("scales", () => {
  it("semua skala dimulai dari 0 dan menaik dalam satu oktaf", () => {
    for (const s of Object.values(SCALES)) {
      expect(s.intervals[0]).toBe(0);
      for (let i = 1; i < s.intervals.length; i++) expect(s.intervals[i]!).toBeGreaterThan(s.intervals[i - 1]!);
      expect(s.intervals.at(-1)!).toBeLessThan(12);
    }
  });

  it("C mayor berisi tuts putih saja", () => {
    expect(scaleNotesInRange(0, "major", 60, 72)).toEqual([60, 62, 64, 65, 67, 69, 71, 72]);
  });

  it("A minor pentatonik", () => {
    expect(scaleNotesInRange(9, "minor-pentatonic", 57, 69)).toEqual([57, 60, 62, 64, 67, 69]);
  });

  it("kuantisasi memilih nada skala terdekat, seri → ke bawah", () => {
    expect(quantizeToScale(61, 0, "major")).toBe(60); // C#: C dan D sama jauh
    expect(quantizeToScale(66, 0, "major")).toBe(65); // F#
    expect(quantizeToScale(63, 0, "major-pentatonic")).toBe(62);
    expect(isInScale(quantizeToScale(70, 2, "dorian"), 2, "dorian")).toBe(true);
  });

  it("hasil kuantisasi selalu berada dalam skala", () => {
    for (const scale of Object.keys(SCALES) as (keyof typeof SCALES)[]) {
      for (let root = 0; root < 12; root++) {
        for (let n = 24; n < 100; n++) expect(isInScale(quantizeToScale(n, root, scale), root, scale)).toBe(true);
      }
    }
  });
});

describe("note layout", () => {
  it("rentang default C4..C5", () => {
    expect(layoutRange({ startOctave: 4, octaveCount: 1 })).toEqual({ low: 60, high: 72 });
  });

  it("quantize: zona hanya nada skala", () => {
    const zones = buildNoteLayout({ root: 0, scale: "major", quantize: true, startOctave: 4, octaveCount: 1 });
    expect(zones.map((z) => z.note)).toEqual([60, 62, 64, 65, 67, 69, 71, 72]);
    expect(zones[0]).toMatchObject({ index: 0, label: "C4", isRoot: true, inScale: true });
  });

  it("tanpa quantize: semua semiton, nada luar skala ditandai", () => {
    const zones = buildNoteLayout({ root: 0, scale: "major", quantize: false, startOctave: 3, octaveCount: 2 });
    expect(zones).toHaveLength(25);
    expect(zones[1]).toMatchObject({ note: 49, inScale: false });
  });

  it("rentang tidak pernah melewati 127", () => {
    const zones = buildNoteLayout({ root: 0, scale: "chromatic", quantize: false, startOctave: 9, octaveCount: 4 });
    expect(Math.max(...zones.map((z) => z.note))).toBe(127);
  });
});

describe("finger notes", () => {
  it("C mayor oktaf 4: kiri C D E F, kanan G A B C", () => {
    expect(buildFingerNotes({ root: 0, scale: "major", startOctave: 4 })).toEqual([60, 62, 64, 65, 67, 69, 71, 72]);
  });

  it("pentatonik berlanjut ke oktaf berikutnya", () => {
    expect(buildFingerNotes({ root: 9, scale: "minor-pentatonic", startOctave: 3 })).toEqual([
      57, 60, 62, 64, 67, 69, 72, 74,
    ]);
  });

  it("selalu 8 nada dan tidak melewati 127", () => {
    const notes = buildFingerNotes({ root: 11, scale: "major", startOctave: 9 });
    expect(notes).toHaveLength(FINGER_SLOT_COUNT);
    expect(Math.max(...notes)).toBeLessThanOrEqual(127);
  });

  it("slot: tangan kiri 0–3, tangan kanan 4–7", () => {
    expect(fingerSlot("left", "index")).toBe(0);
    expect(fingerSlot("left", "pinky")).toBe(3);
    expect(fingerSlot("right", "index")).toBe(4);
    expect(fingerSlot("right", "pinky")).toBe(7);
    expect(fingerSlot("unknown", "middle")).toBe(1);
  });
});

describe("ZoneTracker", () => {
  it("memetakan batas kiri/kanan", () => {
    const t = new ZoneTracker(0);
    expect(t.resolve(0, 8)).toBe(0);
    expect(t.resolve(1, 8)).toBe(7);
    expect(t.resolve(-0.5, 8)).toBe(0);
    expect(t.resolve(1.5, 8)).toBe(7);
    expect(t.resolve(0.5, 0)).toBe(-1);
  });

  it("hysteresis menahan zona saat pointer bergetar di batas", () => {
    const t = new ZoneTracker(0.2);
    expect(t.resolve(0.24, 4)).toBe(0); // zona 0 = [0, .25)
    expect(t.resolve(0.26, 4)).toBe(0); // masih dalam margin 0.05
    expect(t.resolve(0.29, 4)).toBe(0);
    expect(t.resolve(0.31, 4)).toBe(1); // melewati margin
    expect(t.resolve(0.21, 4)).toBe(1); // kembali sedikit: tetap 1
    expect(t.resolve(0.19, 4)).toBe(0);
  });
});

describe("chords", () => {
  it("triad diatonis C mayor", () => {
    expect(buildChord(60, "triad", 0, "major")).toEqual([60, 64, 67]); // C E G
    expect(buildChord(62, "triad", 0, "major")).toEqual([62, 65, 69]); // Dm
    expect(buildChord(71, "triad", 0, "major")).toEqual([71, 74, 77]); // Bdim
  });

  it("septim diatonis", () => {
    expect(buildChord(67, "seventh", 0, "major")).toEqual([67, 71, 74, 77]); // G7
  });

  it("kromatis memakai akor mayor/dominan", () => {
    expect(buildChord(61, "triad", 0, "chromatic")).toEqual([61, 65, 68]);
    expect(buildChord(60, "seventh", 0, "chromatic")).toEqual([60, 64, 67, 70]);
  });

  it("power chord dan batas atas MIDI", () => {
    expect(buildChord(40, "power", 0, "major")).toEqual([40, 47, 52]);
    expect(buildChord(120, "power", 0, "chromatic")).toEqual([120, 127]);
  });
});
