import type { PresetInfo } from "../../types/instrument";
import type { MidiChannel, MidiNote, MidiPatch } from "../../types/music";

export type EngineStatus = "idle" | "initializing" | "ready" | "error" | "disposed";
export type SoundBankStatus = "none" | "loading" | "ready" | "error";

export interface EffectSettings {
  /** Reverb bawaan synth 0..1. */
  reverb: number;
  /** Chorus bawaan synth 0..1. */
  chorus: number;
  /** Campuran delay 0..1 (0 = mati). */
  delayMix: number;
  /** Waktu delay (detik) 0.05..1. */
  delayTime: number;
  /** Feedback delay 0..0.85. */
  delayFeedback: number;
  /** Cutoff low-pass 0..1 (1 = terbuka penuh). */
  filter: number;
}

export const DEFAULT_EFFECTS: EffectSettings = {
  reverb: 0.35,
  chorus: 0.15,
  delayMix: 0,
  delayTime: 0.3,
  delayFeedback: 0.35,
  filter: 1,
};

export interface SoundBankLoadOptions {
  id: string;
  /** Sumber: URL (same-origin / https) atau buffer (mis. file lokal yang dipilih pengguna). */
  source: { kind: "url"; url: string } | { kind: "buffer"; buffer: ArrayBuffer };
  /** Bank offset agar preset pack tambahan tidak menimpa preset GM utama. */
  bankOffset?: number;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

export interface EngineSnapshot {
  status: EngineStatus;
  error?: string;
  banks: Record<string, { status: SoundBankStatus; progress: number; error?: string }>;
}

/**
 * Kontrak internal audio. UI dan gesture tidak pernah memanggil library synthesizer langsung.
 * Semua nomor note 0–127, program 0–127, kanal 0–15.
 */
export interface InstrumentEngine {
  /** Harus dipanggil dari handler interaksi pengguna (kebijakan autoplay browser). */
  initialize(): Promise<void>;
  /** Lanjutkan AudioContext bila disuspend browser. */
  resume(): Promise<void>;
  loadSoundBank(options: SoundBankLoadOptions): Promise<PresetInfo[]>;
  removeSoundBank(id: string): Promise<void>;
  /** Daftar preset gabungan dari semua bank yang dimuat. */
  getPresets(): PresetInfo[];
  selectPatch(channel: MidiChannel, patch: MidiPatch): void;
  setChannelIsDrum(channel: MidiChannel, isDrum: boolean): void;
  noteOn(channel: MidiChannel, note: MidiNote, velocity: number, time?: number): void;
  noteOff(channel: MidiChannel, note: MidiNote, time?: number): void;
  controlChange(channel: MidiChannel, controller: number, value: number, time?: number): void;
  /** Volume master 0..1. */
  setVolume(value: number): void;
  setEffects(effects: EffectSettings): void;
  /** Lepas semua note di satu kanal (CC 123). */
  channelNotesOff(channel: MidiChannel, time?: number): void;
  /** Lepas semua note di semua kanal. */
  allNotesOff(): void;
  /** Waktu audio (detik) untuk penjadwalan presisi. */
  currentTime(): number;
  /** Level output RMS 0..1 untuk meter. */
  getOutputLevel(): number;
  getSnapshot(): EngineSnapshot;
  subscribe(listener: (snapshot: EngineSnapshot) => void): () => void;
  dispose(): Promise<void>;
}

/** MIDI CC yang dipakai aplikasi. */
export const CC = {
  BANK_SELECT_MSB: 0,
  MODULATION: 1,
  VOLUME: 7,
  EXPRESSION: 11,
  BANK_SELECT_LSB: 32,
  SUSTAIN: 64,
  ALL_SOUND_OFF: 120,
  ALL_NOTES_OFF: 123,
} as const;
