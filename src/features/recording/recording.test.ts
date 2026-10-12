import { describe, expect, it } from "vitest";
import { MockInstrumentEngine } from "../../services/audio/MockInstrumentEngine";
import type { NoteEvent } from "../performance/note-manager";
import { Looper, type RecordSource } from "./looper";
import { Metronome } from "./metronome";
import { exportLoopToMidi, PPQ, vlq } from "./midi-export";

const source: RecordSource = {
  patch: { program: 40, bankMSB: 0, bankLSB: 0 },
  instrumentName: "Violin",
  drumKit: 0,
  melodicChannel: 0,
  drumChannel: 9,
};

function rig(withMetronome = false) {
  const engine = new MockInstrumentEngine();
  const metronome = new Metronome(engine, 15, { bpm: 120, beatsPerBar: 4, volume: 1 });
  const looper = new Looper(engine, () => engine.time, withMetronome ? metronome : null, {
    metronomeEnabled: () => withMetronome,
    countIn: () => false,
    quantize: () => true,
  });
  const at = (t: number) => {
    engine.time = t;
    looper.tick();
    metronome.tick(t);
  };
  return { engine, looper, metronome, at };
}

function ev(type: "on" | "off", note: number, channel = 0): NoteEvent {
  return type === "on"
    ? { type, owner: "keyboard", channel, note, velocity: 100 }
    : { type, owner: "keyboard", channel, note };
}

describe("Metronome", () => {
  it("menjadwalkan klik dengan aksen di beat pertama", () => {
    const engine = new MockInstrumentEngine();
    const m = new Metronome(engine, 15, { bpm: 120, beatsPerBar: 4, volume: 1 });
    m.start(1);
    for (let t = 1; t <= 3.01; t += 0.025) m.tick(t);
    const ons = engine.calls.filter((c) => c.fn === "noteOn");
    expect(ons.slice(0, 5).map((c) => (c.fn === "noteOn" ? [c.time, c.note] : []))).toEqual([
      [1, 76],
      [1.5, 77],
      [2, 77],
      [2.5, 77],
      [3, 76],
    ]);
    expect(m.barDuration).toBe(2);
  });
});

describe("Looper", () => {
  it("merekam take pertama lalu memutar ulang pada kanal layer sendiri", () => {
    const { engine, looper, at } = rig();
    at(10);
    looper.record(source);
    at(10.5);
    looper.capture(ev("on", 60));
    at(11);
    looper.capture(ev("off", 60));
    at(12);
    looper.stopRecording();
    const snap = looper.snapshot();
    expect(snap.state).toBe("playing");
    expect(snap.loopLength).toBeCloseTo(2);
    const layer = snap.layers[0]!;
    expect(layer.channel).toBe(1);
    expect(engine.calls).toContainEqual({ fn: "patch", channel: 1, patch: source.patch });

    engine.calls = [];
    for (let t = 12; t <= 14.2; t += 0.025) at(t);
    const ons = engine.calls.filter((c) => c.fn === "noteOn");
    expect(ons).toHaveLength(1);
    expect(ons[0]).toMatchObject({ channel: 1, note: 60 });
    expect(ons[0]!.fn === "noteOn" && ons[0]!.time).toBeCloseTo(12.5);
  });

  it("note yang masih ditahan saat berhenti ditutup otomatis", () => {
    const { looper, at } = rig();
    at(0);
    looper.record(source);
    at(0.2);
    looper.capture(ev("on", 62));
    at(1);
    looper.stopRecording();
    const events = looper.snapshot().layers[0]!.events;
    expect(events.filter((e) => e.type === "off")).toHaveLength(1);
  });

  it("panjang loop dibulatkan ke bar saat metronom aktif", () => {
    const { looper, at } = rig(true);
    at(0);
    looper.record(source); // start 0.1, bar = 2s
    at(0.5);
    looper.capture(ev("on", 60));
    at(0.6);
    looper.capture(ev("off", 60));
    at(4.3);
    looper.stopRecording();
    expect(looper.snapshot().loopLength).toBeCloseTo(4);
  });

  it("overdub menambah layer baru dengan patch berbeda dan memisahkan drum", () => {
    const { looper, at } = rig();
    at(0);
    looper.record(source);
    at(0.5);
    looper.capture(ev("on", 60));
    looper.capture(ev("off", 60));
    at(2);
    looper.stopRecording();
    looper.record({ ...source, patch: { program: 0, bankMSB: 0, bankLSB: 0 }, instrumentName: "Piano" });
    expect(looper.snapshot().state).toBe("overdubbing");
    at(2.5);
    looper.capture(ev("on", 36, 9));
    looper.capture(ev("off", 36, 9));
    looper.capture({ type: "on", owner: "loop:x", channel: 0, note: 70, velocity: 1 }); // playback diabaikan
    at(3);
    looper.stopRecording();
    const layers = looper.snapshot().layers;
    expect(layers).toHaveLength(2);
    expect(layers[1]).toMatchObject({ channel: null, drumChannel: 2, instrumentName: "Piano" });
    expect(layers[1]!.events.every((e) => e.drum)).toBe(true);
    expect(layers[1]!.events[0]!.time).toBeCloseTo(0.5);
  });

  it("stop membungkam kanal layer (sekarang dan setelah jendela lookahead)", () => {
    const { engine, looper, at } = rig();
    at(0);
    looper.record(source);
    looper.capture(ev("on", 60));
    at(1);
    looper.stopRecording();
    engine.calls = [];
    looper.stop();
    const offs = engine.calls.filter((c) => c.fn === "channelNotesOff");
    expect(offs).toHaveLength(2);
    expect(looper.snapshot().state).toBe("stopped");
  });

  it("rekaman kosong dibatalkan dengan pesan", () => {
    const { looper, at } = rig();
    at(0);
    looper.record(source);
    at(2);
    looper.stopRecording();
    expect(looper.snapshot()).toMatchObject({ state: "idle", error: "Tidak ada nada yang terekam." });
  });

  it("mute dan hapus layer", () => {
    const { engine, looper, at } = rig();
    at(0);
    looper.record(source);
    at(0.1);
    looper.capture(ev("on", 60));
    looper.capture(ev("off", 60));
    at(1);
    looper.stopRecording();
    const id = looper.snapshot().layers[0]!.id;
    looper.toggleMute(id);
    engine.calls = [];
    for (let t = 1; t < 3; t += 0.025) at(t);
    expect(engine.calls.filter((c) => c.fn === "noteOn")).toHaveLength(0);
    looper.deleteLayer(id);
    expect(looper.snapshot()).toMatchObject({ state: "idle", loopLength: null, layers: [] });
  });
});

describe("MIDI export", () => {
  it("VLQ sesuai spesifikasi SMF", () => {
    expect(vlq(0)).toEqual([0x00]);
    expect(vlq(0x7f)).toEqual([0x7f]);
    expect(vlq(0x80)).toEqual([0x81, 0x00]);
    expect(vlq(0x3fff)).toEqual([0xff, 0x7f]);
    expect(vlq(0x200000)).toEqual([0x81, 0x80, 0x80, 0x00]);
  });

  it("menulis SMF tipe 1 dengan track tempo + track layer", () => {
    const { looper, at } = rig();
    at(0);
    looper.record(source);
    at(0.5);
    looper.capture(ev("on", 60));
    at(1);
    looper.capture(ev("off", 60));
    at(2);
    looper.stopRecording();
    const bytes = exportLoopToMidi(looper.snapshot().layers, { bpm: 120, beatsPerBar: 4, loopLength: 2, repeats: 2 });
    const text = String.fromCharCode(...bytes.slice(0, 4));
    expect(text).toBe("MThd");
    const view = new DataView(bytes.buffer);
    expect(view.getUint16(8)).toBe(1); // format
    expect(view.getUint16(10)).toBe(2); // track tempo + 1 layer
    expect(view.getUint16(12)).toBe(PPQ);
    // Hitung note-on pada kanal 1 (0x91) — 2 repeat → 2 note-on.
    let noteOns = 0;
    for (let i = 0; i < bytes.length - 2; i++) if (bytes[i] === 0x91 && bytes[i + 1] === 60) noteOns++;
    expect(noteOns).toBe(2);
    // Program change Violin (40) di kanal 1.
    expect([...bytes].join(",")).toContain([0xc1, 40].join(","));
  });
});
