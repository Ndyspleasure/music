import type { MidiPatch } from "./music";

export type InstrumentCategory =
  | "piano"
  | "chromatic-percussion"
  | "organ"
  | "guitar"
  | "bass"
  | "strings"
  | "ensemble"
  | "brass"
  | "reed"
  | "pipe"
  | "synth-lead"
  | "synth-pad"
  | "synth-effects"
  | "ethnic"
  | "percussive"
  | "sound-effects";

export type InstrumentSource = "general-midi" | "bank-variation" | "custom-pack";

export interface InstrumentDefinition {
  id: string;
  name: string;
  category: InstrumentCategory;
  source: InstrumentSource;
  /** Program GM 0-based: 0..127. */
  programNumber: number;
  bankNumber: number;
  bankLSB: number;
  soundBankId: string;
  tags: string[];
  /** True bila preset benar-benar ada di sound bank yang aktif. */
  available: boolean;
  /** Nama preset sebenarnya di sound bank (bisa berbeda dari nama standar GM). */
  presetName?: string;
}

export interface DrumKitDefinition {
  id: string;
  name: string;
  /** Program number kit pada kanal drum. */
  programNumber: number;
  soundBankId: string;
}

/** Preset mentah yang dilaporkan audio engine dari sound bank aktif. */
export interface PresetInfo extends MidiPatch {
  name: string;
  isDrum: boolean;
}
