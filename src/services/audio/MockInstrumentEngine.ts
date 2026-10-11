import type { PresetInfo } from "../../types/instrument";
import type { MidiChannel, MidiNote, MidiPatch } from "../../types/music";
import type { EffectSettings, EngineSnapshot, InstrumentEngine, SoundBankLoadOptions } from "./InstrumentEngine";

export type MockCall =
  | { fn: "noteOn"; channel: number; note: number; velocity: number; time?: number }
  | { fn: "noteOff"; channel: number; note: number; time?: number }
  | { fn: "cc"; channel: number; controller: number; value: number }
  | { fn: "patch"; channel: number; patch: MidiPatch }
  | { fn: "drum"; channel: number; isDrum: boolean }
  | { fn: "allNotesOff" }
  | { fn: "channelNotesOff"; channel: number; time?: number };

/** Engine palsu untuk unit test: mencatat semua panggilan, tanpa Web Audio. */
export class MockInstrumentEngine implements InstrumentEngine {
  calls: MockCall[] = [];
  presets: PresetInfo[] = [];
  time = 0;
  volume = 1;
  effects: EffectSettings | null = null;
  private snapshot: EngineSnapshot = { status: "idle", banks: {} };

  async initialize(): Promise<void> {
    this.snapshot = { ...this.snapshot, status: "ready" };
  }
  async resume(): Promise<void> {}
  async loadSoundBank(opts: SoundBankLoadOptions): Promise<PresetInfo[]> {
    this.snapshot = {
      ...this.snapshot,
      banks: { ...this.snapshot.banks, [opts.id]: { status: "ready", progress: 1 } },
    };
    return this.presets;
  }
  async removeSoundBank(): Promise<void> {}
  getPresets(): PresetInfo[] {
    return this.presets;
  }
  selectPatch(channel: MidiChannel, patch: MidiPatch): void {
    this.calls.push({ fn: "patch", channel, patch });
  }
  setChannelIsDrum(channel: MidiChannel, isDrum: boolean): void {
    this.calls.push({ fn: "drum", channel, isDrum });
  }
  noteOn(channel: MidiChannel, note: MidiNote, velocity: number, time?: number): void {
    this.calls.push({ fn: "noteOn", channel, note, velocity, time });
  }
  noteOff(channel: MidiChannel, note: MidiNote, time?: number): void {
    this.calls.push({ fn: "noteOff", channel, note, time });
  }
  controlChange(channel: MidiChannel, controller: number, value: number): void {
    this.calls.push({ fn: "cc", channel, controller, value });
  }
  setVolume(value: number): void {
    this.volume = value;
  }
  setEffects(effects: EffectSettings): void {
    this.effects = effects;
  }
  channelNotesOff(channel: MidiChannel, time?: number): void {
    this.calls.push({ fn: "channelNotesOff", channel, time });
  }
  allNotesOff(): void {
    this.calls.push({ fn: "allNotesOff" });
  }
  currentTime(): number {
    return this.time;
  }
  getOutputLevel(): number {
    return 0;
  }
  getSnapshot(): EngineSnapshot {
    return this.snapshot;
  }
  subscribe(): () => void {
    return () => {};
  }
  async dispose(): Promise<void> {
    this.snapshot = { status: "disposed", banks: {} };
  }

  /** Note yang saat ini berbunyi menurut urutan panggilan noteOn/noteOff. */
  soundingNotes(): string[] {
    const set = new Set<string>();
    for (const c of this.calls) {
      if (c.fn === "noteOn") set.add(`${c.channel}:${c.note}`);
      else if (c.fn === "noteOff") set.delete(`${c.channel}:${c.note}`);
      else if (c.fn === "allNotesOff") set.clear();
      else if (c.fn === "channelNotesOff")
        for (const k of Array.from(set)) if (k.startsWith(`${c.channel}:`)) set.delete(k);
    }
    return [...set];
  }
}
