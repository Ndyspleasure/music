import { describe, expect, it } from "vitest";
import { MockInstrumentEngine } from "../../services/audio/MockInstrumentEngine";
import { NoteManager, type NoteEvent } from "./note-manager";

describe("NoteManager", () => {
  it("noteOn ganda dari pemilik yang sama diabaikan", () => {
    const engine = new MockInstrumentEngine();
    const nm = new NoteManager(engine);
    expect(nm.noteOn("a", 0, 60, 100)).toBe(true);
    expect(nm.noteOn("a", 0, 60, 100)).toBe(false);
    expect(engine.calls.filter((c) => c.fn === "noteOn")).toHaveLength(1);
  });

  it("note identik dua tangan: note-off fisik hanya saat keduanya lepas", () => {
    const engine = new MockInstrumentEngine();
    const nm = new NoteManager(engine);
    nm.noteOn("hand-left", 0, 64, 90);
    nm.noteOn("hand-right", 0, 64, 90);
    nm.noteOff("hand-left", 0, 64);
    expect(engine.soundingNotes()).toEqual(["0:64"]);
    nm.noteOff("hand-right", 0, 64);
    expect(engine.soundingNotes()).toEqual([]);
  });

  it("releaseOwner hanya melepas note milik pemilik itu", () => {
    const engine = new MockInstrumentEngine();
    const nm = new NoteManager(engine);
    nm.noteOn("hand-right", 0, 60, 90);
    nm.noteOn("hand-right", 0, 64, 90);
    nm.noteOn("keyboard", 0, 67, 90);
    expect(nm.releaseOwner("hand-right")).toBe(2);
    expect(engine.soundingNotes()).toEqual(["0:67"]);
  });

  it("releaseAll membersihkan semua dan mengirim allNotesOff", () => {
    const engine = new MockInstrumentEngine();
    const nm = new NoteManager(engine);
    nm.noteOn("a", 0, 60, 90);
    nm.noteOn("b", 9, 36, 90);
    nm.releaseAll();
    expect(nm.size).toBe(0);
    expect(engine.calls.at(-1)).toEqual({ fn: "allNotesOff" });
    expect(engine.soundingNotes()).toEqual([]);
  });

  it("memancarkan event untuk recorder/visual dan memvalidasi rentang", () => {
    const nm = new NoteManager(new MockInstrumentEngine());
    const events: NoteEvent[] = [];
    nm.onNote((e) => events.push(e));
    nm.noteOn("a", 0, 60, 300);
    nm.noteOn("a", 0, 128, 90);
    nm.noteOff("a", 0, 60);
    expect(events).toEqual([
      { type: "on", owner: "a", channel: 0, note: 60, velocity: 127 },
      { type: "off", owner: "a", channel: 0, note: 60 },
    ]);
  });
});
