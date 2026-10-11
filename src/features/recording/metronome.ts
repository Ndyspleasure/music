import { METRONOME_NOTES } from "../../data/drum-map";

export interface ClickSink {
  noteOn(channel: number, note: number, velocity: number, time?: number): void;
  noteOff(channel: number, note: number, time?: number): void;
}

export interface MetronomeConfig {
  bpm: number;
  beatsPerBar: number;
  volume: number;
}

export const SCHEDULE_LOOKAHEAD_S = 0.15;

/**
 * Metronom dengan penjadwalan lookahead pada jam audio (presisi sampel),
 * dipanggil berkala oleh transport melalui tick().
 */
export class Metronome {
  private startTime = 0;
  private nextBeat = 0;
  private running = false;
  private listeners = new Set<(beat: number, time: number) => void>();
  private sink: ClickSink;
  private channel: number;
  private config: MetronomeConfig;

  constructor(sink: ClickSink, channel: number, config: MetronomeConfig) {
    this.sink = sink;
    this.channel = channel;
    this.config = config;
  }

  get isRunning(): boolean {
    return this.running;
  }

  get beatDuration(): number {
    return 60 / this.config.bpm;
  }

  get barDuration(): number {
    return this.beatDuration * this.config.beatsPerBar;
  }

  get beatsPerBar(): number {
    return this.config.beatsPerBar;
  }

  get bpm(): number {
    return this.config.bpm;
  }

  setConfig(config: MetronomeConfig): void {
    if (this.running && config.bpm !== this.config.bpm) {
      // Pertahankan posisi beat saat tempo berubah.
      const elapsedBeats = this.nextBeat;
      const nextTime = this.startTime + elapsedBeats * this.beatDuration;
      this.config = config;
      this.startTime = nextTime - elapsedBeats * this.beatDuration;
    } else {
      this.config = config;
    }
  }

  /** Mulai dengan beat pertama tepat pada `time` (detik jam audio). */
  start(time: number): void {
    this.startTime = time;
    this.nextBeat = 0;
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  /** Waktu absolut beat ke-n sejak start. */
  beatTime(n: number): number {
    return this.startTime + n * this.beatDuration;
  }

  onBeat(listener: (beat: number, time: number) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  tick(now: number): void {
    if (!this.running) return;
    const horizon = now + SCHEDULE_LOOKAHEAD_S;
    while (this.beatTime(this.nextBeat) < horizon) {
      const t = this.beatTime(this.nextBeat);
      const beatInBar = this.nextBeat % this.config.beatsPerBar;
      if (t >= now - 0.05 && this.config.volume > 0) {
        const accent = beatInBar === 0;
        const note = accent ? METRONOME_NOTES.accent : METRONOME_NOTES.beat;
        const vel = Math.round((accent ? 127 : 95) * this.config.volume);
        this.sink.noteOn(this.channel, note, Math.max(1, vel), t);
        this.sink.noteOff(this.channel, note, t + 0.08);
      }
      for (const l of this.listeners) l(beatInBar, t);
      this.nextBeat++;
    }
  }
}
