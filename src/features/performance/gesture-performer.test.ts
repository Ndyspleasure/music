import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockInstrumentEngine } from "../../services/audio/MockInstrumentEngine";
import { buildFingerNotes, buildNoteLayout } from "../music-theory/note-layout";
import { DRUM_NOTE_MS, GesturePerformer, type PerformerSettings } from "./gesture-performer";
import { NoteManager } from "./note-manager";

const zones = buildNoteLayout({ root: 0, scale: "major", quantize: true, startOctave: 4, octaveCount: 1 }); // 8 zona
const base: PerformerSettings = {
  mode: "melodic",
  noteInput: "position",
  zones,
  fingerNotes: buildFingerNotes({ root: 0, scale: "major", startOctave: 4 }),
  root: 0,
  scale: "major",
  chordType: "triad",
  velocity: 100,
  expression: false,
  glide: "retrigger",
  swipeOctave: true,
  zoneHysteresis: 0,
};

function setup(overrides: Partial<PerformerSettings> = {}) {
  const engine = new MockInstrumentEngine();
  const notes = new NoteManager(engine);
  const cc: [number, number, number][] = [];
  const octave: number[] = [];
  const p = new GesturePerformer(
    notes,
    { ...base, ...overrides },
    {
      controlChange: (ch, c, v) => cc.push([ch, c, v]),
      onOctaveShift: (d) => octave.push(d),
    },
  );
  const t = 0;
  return { engine, notes, p, cc, octave, t };
}

const zoneX = (i: number) => (i + 0.5) / zones.length;

describe("GesturePerformer — melodi", () => {
  it("pinch memainkan nada zona, lepas menghentikannya", () => {
    const { engine, p } = setup();
    p.handleEvent({ type: "pinch-start", handId: "h", x: zoneX(2), y: 0.5, confidence: 1, timestamp: 0 });
    expect(engine.soundingNotes()).toEqual(["0:64"]);
    p.handleEvent({ type: "pinch-end", handId: "h", timestamp: 10 });
    expect(engine.soundingNotes()).toEqual([]);
  });

  it("bergerak dalam zona yang sama tidak memicu note-on berulang", () => {
    const { engine, p } = setup();
    p.handleEvent({ type: "pinch-start", handId: "h", x: zoneX(0), y: 0.5, confidence: 1, timestamp: 0 });
    for (let i = 0; i < 20; i++) {
      p.handleEvent({
        type: "pointer-move",
        handId: "h",
        x: zoneX(0) + (i % 2 ? 0.01 : -0.01),
        y: 0.5,
        confidence: 1,
        timestamp: i,
      });
    }
    expect(engine.calls.filter((c) => c.fn === "noteOn")).toHaveLength(1);
  });

  it("glide retrigger: pindah zona saat pinch → note lama dilepas, note baru dimainkan", () => {
    const { engine, p } = setup();
    p.handleEvent({ type: "pinch-start", handId: "h", x: zoneX(0), y: 0.5, confidence: 1, timestamp: 0 });
    p.handleEvent({ type: "pointer-move", handId: "h", x: zoneX(4), y: 0.5, confidence: 1, timestamp: 1 });
    expect(engine.soundingNotes()).toEqual(["0:67"]);
  });

  it("glide hold: note pertama dipertahankan", () => {
    const { engine, p } = setup({ glide: "hold" });
    p.handleEvent({ type: "pinch-start", handId: "h", x: zoneX(0), y: 0.5, confidence: 1, timestamp: 0 });
    p.handleEvent({ type: "pointer-move", handId: "h", x: zoneX(4), y: 0.5, confidence: 1, timestamp: 1 });
    expect(engine.soundingNotes()).toEqual(["0:60"]);
  });

  it("hand-lost melepas semua note milik tangan itu saja", () => {
    const { engine, p } = setup();
    p.handleEvent({ type: "pinch-start", handId: "left", x: zoneX(0), y: 0.5, confidence: 1, timestamp: 0 });
    p.handleEvent({ type: "pinch-start", handId: "right", x: zoneX(7), y: 0.5, confidence: 1, timestamp: 0 });
    p.handleEvent({ type: "hand-lost", handId: "left", timestamp: 5 });
    expect(engine.soundingNotes()).toEqual(["0:72"]);
  });

  it("mode akor memainkan triad diatonis", () => {
    const { engine, p } = setup({ mode: "chord" });
    p.handleEvent({ type: "pinch-start", handId: "h", x: zoneX(1), y: 0.5, confidence: 1, timestamp: 0 });
    expect(engine.soundingNotes().toSorted()).toEqual(["0:62", "0:65", "0:69"]);
    p.handleEvent({ type: "pinch-end", handId: "h", timestamp: 1 });
    expect(engine.soundingNotes()).toEqual([]);
  });

  it("ganti mode/layout melepas note aktif", () => {
    const { engine, p } = setup();
    p.handleEvent({ type: "pinch-start", handId: "h", x: zoneX(0), y: 0.5, confidence: 1, timestamp: 0 });
    p.updateSettings({ ...base, mode: "drums" });
    expect(engine.soundingNotes()).toEqual([]);
  });

  it("ekspresi dari posisi vertikal dikirim sebagai CC11 (dengan throttling)", () => {
    const { p, cc } = setup({ expression: true });
    p.handleEvent({ type: "pinch-start", handId: "h", x: zoneX(0), y: 0, confidence: 1, timestamp: 0 });
    p.handleEvent({ type: "pointer-move", handId: "h", x: zoneX(0), y: 0.001, confidence: 1, timestamp: 1 });
    p.handleEvent({ type: "pointer-move", handId: "h", x: zoneX(0), y: 1, confidence: 1, timestamp: 2 });
    expect(cc).toEqual([
      [0, 11, 127],
      [0, 11, 40],
    ]);
  });

  it("swipe menggeser oktaf bila diaktifkan", () => {
    const { p, octave } = setup();
    p.handleEvent({ type: "swipe", handId: "h", direction: "right", velocity: 3, timestamp: 0 });
    p.handleEvent({ type: "swipe", handId: "h", direction: "left", velocity: 3, timestamp: 1 });
    expect(octave).toEqual([1, -1]);
  });
});

describe("GesturePerformer — drum", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("strike memukul pad sesuai posisi pada kanal 9 lalu note-off otomatis", () => {
    const { engine, p } = setup({ mode: "drums" });
    p.handleEvent({ type: "strike", handId: "h", x: 0.1, y: 0.9, velocity: 110, timestamp: 0 }); // kiri bawah = kick
    expect(engine.calls.find((c) => c.fn === "noteOn")).toMatchObject({ channel: 9, note: 36, velocity: 110 });
    vi.advanceTimersByTime(DRUM_NOTE_MS + 1);
    expect(engine.soundingNotes()).toEqual([]);
  });

  it("cooldown per pad mencegah rentetan hit", () => {
    const { engine, p } = setup({ mode: "drums" });
    p.handleEvent({ type: "strike", handId: "a", x: 0.4, y: 0.9, velocity: 100, timestamp: 1000 });
    p.handleEvent({ type: "strike", handId: "b", x: 0.4, y: 0.9, velocity: 100, timestamp: 1020 });
    p.handleEvent({ type: "strike", handId: "b", x: 0.4, y: 0.9, velocity: 100, timestamp: 1200 });
    expect(engine.calls.filter((c) => c.fn === "noteOn")).toHaveLength(2);
  });

  it("strike diabaikan di mode melodi", () => {
    const { engine, p } = setup();
    p.handleEvent({ type: "strike", handId: "h", x: 0.1, y: 0.9, velocity: 110, timestamp: 0 });
    expect(engine.calls).toHaveLength(0);
  });
});

const down = (handId: string, side: "left" | "right", finger: "index" | "middle" | "ring" | "pinky", t = 0) =>
  ({ type: "finger-down", handId, side, finger, timestamp: t }) as const;

describe("GesturePerformer — input jari", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("tiap jari memainkan nada berbeda tanpa bergantung posisi tangan", () => {
    const { engine, p } = setup({ noteInput: "fingers" });
    const played: string[] = [];
    for (const [side, finger] of [
      ["left", "index"],
      ["left", "middle"],
      ["left", "ring"],
      ["left", "pinky"],
      ["right", "index"],
      ["right", "middle"],
      ["right", "ring"],
      ["right", "pinky"],
    ] as const) {
      p.handleEvent(down(`hand-${side}`, side, finger));
      played.push(...engine.soundingNotes());
      p.handleEvent({ type: "finger-up", handId: `hand-${side}`, finger, timestamp: 1 });
      expect(engine.soundingNotes()).toEqual([]);
    }
    expect(played).toEqual(["0:60", "0:62", "0:64", "0:65", "0:67", "0:69", "0:71", "0:72"]);
  });

  it("posisi pointer dan pinch diabaikan; ganti jari langsung melepas nada lama", () => {
    const { engine, p } = setup({ noteInput: "fingers" });
    p.handleEvent({ type: "pinch-start", handId: "h", x: zoneX(5), y: 0.5, confidence: 1, timestamp: 0 });
    expect(engine.soundingNotes()).toEqual([]);
    p.handleEvent(down("h", "left", "index"));
    p.handleEvent({ type: "pointer-move", handId: "h", x: zoneX(7), y: 0.5, confidence: 1, timestamp: 1 });
    expect(engine.soundingNotes()).toEqual(["0:60"]);
    p.handleEvent({ type: "finger-up", handId: "h", finger: "index", timestamp: 2 });
    p.handleEvent(down("h", "left", "ring", 2));
    expect(engine.soundingNotes()).toEqual(["0:64"]);
  });

  it("dua tangan bisa membunyikan dua nada bersamaan, hand-lost melepas milik tangan itu", () => {
    const { engine, p } = setup({ noteInput: "fingers" });
    p.handleEvent(down("hand-left", "left", "index"));
    p.handleEvent(down("hand-right", "right", "index"));
    expect(engine.soundingNotes().toSorted()).toEqual(["0:60", "0:67"]);
    p.handleEvent({ type: "hand-lost", handId: "hand-right", timestamp: 3 });
    expect(engine.soundingNotes()).toEqual(["0:60"]);
  });

  it("mode akor: jari memainkan akor dari derajat skalanya", () => {
    const { engine, p } = setup({ noteInput: "fingers", mode: "chord" });
    p.handleEvent(down("h", "left", "middle"));
    expect(engine.soundingNotes().toSorted()).toEqual(["0:62", "0:65", "0:69"]);
  });

  it("mode drum: tiap jari memukul pad sendiri, strike posisi diabaikan", () => {
    const { engine, p } = setup({ noteInput: "fingers", mode: "drums" });
    p.handleEvent({ type: "strike", handId: "h", x: 0.1, y: 0.9, velocity: 110, timestamp: 0 });
    expect(engine.calls.filter((c) => c.fn === "noteOn")).toHaveLength(0);
    p.handleEvent(down("hand-left", "left", "index", 100)); // kick
    p.handleEvent(down("hand-left", "left", "middle", 200)); // snare
    p.handleEvent(down("hand-right", "right", "index", 300)); // crash
    const hits = engine.calls.filter((c) => c.fn === "noteOn").map((c) => (c as { note: number }).note);
    expect(hits).toEqual([36, 38, 49]);
    vi.advanceTimersByTime(DRUM_NOTE_MS + 1);
    expect(engine.soundingNotes()).toEqual([]);
  });

  it("finger event diabaikan pada input posisi", () => {
    const { engine, p } = setup();
    p.handleEvent(down("h", "left", "index"));
    expect(engine.calls).toHaveLength(0);
  });
});
