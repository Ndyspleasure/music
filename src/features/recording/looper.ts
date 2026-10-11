import type { MidiPatch } from "../../types/music";
import type { NoteEvent } from "../performance/note-manager";
import { SCHEDULE_LOOKAHEAD_S, type Metronome } from "./metronome";

export interface LoopEvent {
  /** Detik sejak awal loop (0 ≤ time < length). */
  time: number;
  type: "on" | "off";
  note: number;
  velocity: number;
  /** Event dari kanal drum live. */
  drum: boolean;
}

export interface LoopLayer {
  id: string;
  name: string;
  patch: MidiPatch;
  instrumentName: string;
  drumKit: number;
  /** Kanal playback untuk bagian melodis (null bila tidak ada). */
  channel: number | null;
  /** Kanal playback untuk bagian drum (null bila tidak ada). */
  drumChannel: number | null;
  events: LoopEvent[];
  muted: boolean;
}

export type TransportState = "idle" | "count-in" | "recording" | "playing" | "overdubbing" | "stopped";

export interface LooperSnapshot {
  state: TransportState;
  loopLength: number | null;
  layers: LoopLayer[];
  error?: string;
}

/** Operasi engine yang dibutuhkan looper. */
export interface LoopSink {
  noteOn(channel: number, note: number, velocity: number, time?: number): void;
  noteOff(channel: number, note: number, time?: number): void;
  selectPatch(channel: number, patch: MidiPatch): void;
  setChannelIsDrum(channel: number, isDrum: boolean): void;
  channelNotesOff(channel: number, time?: number): void;
}

export interface RecordSource {
  patch: MidiPatch;
  instrumentName: string;
  drumKit: number;
  /** Kanal live yang direkam. */
  melodicChannel: number;
  drumChannel: number;
}

export interface LooperOptions {
  metronomeEnabled: () => boolean;
  countIn: () => boolean;
  quantize: () => boolean;
}

const NO_SYNC: LooperOptions = { metronomeEnabled: () => false, countIn: () => false, quantize: () => false };

/** Kanal yang tersedia untuk playback layer (0 = live melodi, 9 = live drum, 15 = metronom). */
export const LOOP_CHANNEL_POOL = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14] as const;
export const MAX_LOOP_SECONDS = 120;
export const MIN_LOOP_SECONDS = 0.5;

/**
 * Looper multi-layer: rekam take pertama (menentukan panjang loop), lalu overdub
 * layer berikutnya dengan instrumen berbeda. Setiap layer memakai kanal sendiri
 * sehingga timbre layer lama tidak berubah saat instrumen live diganti.
 */
export class Looper {
  private state: TransportState = "idle";
  private loopStart = 0;
  private loopLength: number | null = null;
  private layers: LoopLayer[] = [];
  private pending: { source: RecordSource; events: LoopEvent[]; held: Map<string, LoopEvent> } | null = null;
  private scheduledUntil = 0;
  private recordStart = 0;
  private nextId = 1;
  private error: string | undefined;
  private listeners = new Set<(s: LooperSnapshot) => void>();
  private sink: LoopSink;
  private clock: () => number;
  private metronome: Metronome | null;
  private options: LooperOptions;

  constructor(
    sink: LoopSink,
    clock: () => number,
    metronome: Metronome | null = null,
    options: LooperOptions = NO_SYNC,
  ) {
    this.sink = sink;
    this.clock = clock;
    this.metronome = metronome;
    this.options = options;
  }

  snapshot(): LooperSnapshot {
    return { state: this.state, loopLength: this.loopLength, layers: this.layers, error: this.error };
  }

  subscribe(listener: (s: LooperSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Fase 0..1 posisi playback/rekam saat ini. */
  phase(): number {
    const now = this.clock();
    if (this.loopLength && (this.state === "playing" || this.state === "overdubbing")) {
      return mod(now - this.loopStart, this.loopLength) / this.loopLength;
    }
    if (this.state === "recording" && this.metronome?.isRunning) {
      const bar = this.metronome.barDuration;
      return mod(now - this.loopStart, bar) / bar;
    }
    return 0;
  }

  get transportState(): TransportState {
    return this.state;
  }

  /** Mulai merekam: take pertama bila belum ada loop, selain itu overdub. */
  record(source: RecordSource): void {
    this.error = undefined;
    if (this.state === "recording" || this.state === "overdubbing" || this.state === "count-in") return;
    if (this.loopLength !== null && this.freeChannels().length === 0) {
      this.error = "Jumlah layer maksimum tercapai. Hapus layer untuk merekam lagi.";
      this.emit();
      return;
    }
    this.pending = { source, events: [], held: new Map() };
    const now = this.clock();
    if (this.loopLength === null) {
      const useMetronome = this.metronome && this.options.metronomeEnabled();
      if (useMetronome && this.metronome) {
        const start = now + 0.1;
        this.metronome.start(start);
        if (this.options.countIn()) {
          this.loopStart = start + this.metronome.barDuration;
          this.state = "count-in";
        } else {
          this.loopStart = start;
          this.state = "recording";
        }
      } else {
        this.loopStart = now;
        this.state = "recording";
      }
      this.recordStart = this.loopStart;
    } else {
      if (this.state !== "playing") this.play();
      this.state = "overdubbing";
    }
    this.emit();
  }

  /** Tangkap event note live dari NoteManager. */
  capture(e: NoteEvent): void {
    const p = this.pending;
    if (!p || (this.state !== "recording" && this.state !== "overdubbing")) return;
    if (e.owner.startsWith("loop:")) return;
    const drum = e.channel === p.source.drumChannel;
    if (!drum && e.channel !== p.source.melodicChannel) return;
    const now = this.clock();
    let time: number;
    if (this.state === "recording") {
      time = now - this.loopStart;
      if (time < 0) return;
      if (time > MAX_LOOP_SECONDS) {
        this.stopRecording();
        return;
      }
    } else {
      time = mod(now - this.loopStart, this.loopLength ?? 1);
    }
    const key = `${drum ? "d" : "m"}:${e.note}`;
    if (e.type === "on") {
      const ev: LoopEvent = { time, type: "on", note: e.note, velocity: e.velocity, drum };
      p.events.push(ev);
      p.held.set(key, ev);
    } else {
      p.events.push({ time, type: "off", note: e.note, velocity: 0, drum });
      p.held.delete(key);
    }
  }

  stopRecording(): void {
    const p = this.pending;
    if (!p) return;
    const now = this.clock();
    if (this.state === "count-in") {
      this.pending = null;
      this.metronome?.stop();
      this.state = this.loopLength === null ? "idle" : "stopped";
      this.emit();
      return;
    }
    if (this.state === "recording") {
      let length = Math.min(MAX_LOOP_SECONDS, now - this.recordStart);
      if (this.metronome?.isRunning && this.options.quantize()) {
        const bar = this.metronome.barDuration;
        length = Math.max(1, Math.round(length / bar)) * bar;
      }
      if (length < MIN_LOOP_SECONDS || p.events.length === 0) {
        this.pending = null;
        this.metronome?.stop();
        this.state = "idle";
        this.error = p.events.length === 0 ? "Tidak ada nada yang terekam." : "Rekaman terlalu pendek.";
        this.emit();
        return;
      }
      this.loopLength = length;
      this.finishLayer(p, now);
      this.state = "playing";
      // Event yang sudah dimainkan live tidak dijadwalkan ulang di siklus berjalan.
      this.scheduledUntil = now;
    } else if (this.state === "overdubbing") {
      this.finishLayer(p, now);
      this.state = "playing";
    }
    this.pending = null;
    this.emit();
  }

  play(): void {
    if (this.loopLength === null || this.state === "playing" || this.state === "overdubbing") return;
    const now = this.clock() + 0.05;
    this.loopStart = now;
    this.scheduledUntil = now - 1e-6;
    if (this.metronome && this.options.metronomeEnabled()) this.metronome.start(now);
    this.state = "playing";
    this.emit();
  }

  stop(): void {
    if (this.state === "recording" || this.state === "overdubbing" || this.state === "count-in") this.stopRecording();
    this.metronome?.stop();
    this.silenceLayers();
    this.state = this.loopLength === null ? "idle" : "stopped";
    this.emit();
  }

  clear(): void {
    this.pending = null;
    this.metronome?.stop();
    this.silenceLayers();
    this.layers = [];
    this.loopLength = null;
    this.state = "idle";
    this.error = undefined;
    this.emit();
  }

  toggleMute(id: string): void {
    const layer = this.layers.find((l) => l.id === id);
    if (!layer) return;
    layer.muted = !layer.muted;
    if (layer.muted) this.silenceLayer(layer);
    this.layers = [...this.layers];
    this.emit();
  }

  deleteLayer(id: string): void {
    const layer = this.layers.find((l) => l.id === id);
    if (!layer) return;
    this.silenceLayer(layer);
    this.layers = this.layers.filter((l) => l.id !== id);
    if (this.layers.length === 0) this.clear();
    else this.emit();
  }

  getLayers(): LoopLayer[] {
    return this.layers;
  }

  /** Dipanggil berkala oleh transport (±25 ms). */
  tick(): void {
    const now = this.clock();
    if (this.state === "count-in" && now >= this.loopStart) {
      this.state = "recording";
      this.emit();
    }
    if (this.state !== "playing" && this.state !== "overdubbing") return;
    const len = this.loopLength;
    if (!len) return;
    const from = Math.max(this.scheduledUntil, now - 0.05);
    const to = now + SCHEDULE_LOOKAHEAD_S;
    if (to <= from) return;
    const firstCycle = Math.floor((from - this.loopStart) / len);
    const lastCycle = Math.floor((to - this.loopStart) / len);
    for (let cycle = firstCycle; cycle <= lastCycle; cycle++) {
      const base = this.loopStart + cycle * len;
      for (const layer of this.layers) {
        if (layer.muted) continue;
        for (const ev of layer.events) {
          const t = base + ev.time;
          if (t <= from || t > to) continue;
          const ch = ev.drum ? layer.drumChannel : layer.channel;
          if (ch === null) continue;
          if (ev.type === "on") this.sink.noteOn(ch, ev.note, ev.velocity, t);
          else this.sink.noteOff(ch, ev.note, t);
        }
      }
    }
    this.scheduledUntil = to;
  }

  private finishLayer(p: NonNullable<Looper["pending"]>, now: number): void {
    const len = this.loopLength ?? 0;
    const endTime = this.state === "recording" ? Math.min(len, now - this.loopStart) : mod(now - this.loopStart, len);
    // Tutup note yang masih ditahan saat rekaman berhenti.
    for (const held of p.held.values()) {
      p.events.push({
        time: Math.max(0, Math.min(len - 1e-3, endTime)),
        type: "off",
        note: held.note,
        velocity: 0,
        drum: held.drum,
      });
    }
    const events = p.events.map((e) => ({ ...e, time: mod(e.time, len) }));
    const free = this.freeChannels();
    const hasMelodic = events.some((e) => !e.drum);
    const hasDrum = events.some((e) => e.drum);
    const channel = hasMelodic ? (free.shift() ?? null) : null;
    const drumChannel = hasDrum ? (free.shift() ?? null) : null;
    const id = `layer-${this.nextId++}`;
    const layer: LoopLayer = {
      id,
      name: `Layer ${this.layers.length + 1}`,
      patch: p.source.patch,
      instrumentName: p.source.instrumentName,
      drumKit: p.source.drumKit,
      channel,
      drumChannel,
      events,
      muted: false,
    };
    if (channel !== null) {
      this.sink.setChannelIsDrum(channel, false);
      this.sink.selectPatch(channel, p.source.patch);
    }
    if (drumChannel !== null) {
      this.sink.setChannelIsDrum(drumChannel, true);
      this.sink.selectPatch(drumChannel, { program: p.source.drumKit, bankMSB: 0, bankLSB: 0 });
    }
    this.layers = [...this.layers, layer];
  }

  private freeChannels(): number[] {
    const used = new Set<number>();
    for (const l of this.layers) {
      if (l.channel !== null) used.add(l.channel);
      if (l.drumChannel !== null) used.add(l.drumChannel);
    }
    return LOOP_CHANNEL_POOL.filter((c) => !used.has(c));
  }

  private silenceLayers(): void {
    for (const l of this.layers) this.silenceLayer(l);
  }

  private silenceLayer(l: LoopLayer): void {
    // Note yang sudah dijadwalkan dalam jendela lookahead masih akan berbunyi,
    // jadi kirim all-notes-off sekarang dan sekali lagi setelah jendela itu lewat.
    const later = this.clock() + SCHEDULE_LOOKAHEAD_S + 0.03;
    for (const ch of [l.channel, l.drumChannel]) {
      if (ch === null) continue;
      this.sink.channelNotesOff(ch);
      this.sink.channelNotesOff(ch, later);
    }
  }

  private emit(): void {
    const s = this.snapshot();
    for (const l of this.listeners) l(s);
  }
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}
