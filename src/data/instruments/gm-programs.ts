import type { InstrumentCategory } from "../../types/instrument";

/**
 * 128 program General MIDI Level 1.
 * Indeks array = nomor program 0-based (0..127) yang dipakai di kode dan dikirim ke synthesizer.
 * Untuk tampilan 1..128 gunakan `formatProgramNumber` — jangan menambah 1 di tempat lain.
 */
export const GM_PROGRAM_NAMES: readonly string[] = [
  // Piano 0–7
  "Acoustic Grand Piano",
  "Bright Acoustic Piano",
  "Electric Grand Piano",
  "Honky-tonk Piano",
  "Electric Piano 1",
  "Electric Piano 2",
  "Harpsichord",
  "Clavinet",
  // Chromatic Percussion 8–15
  "Celesta",
  "Glockenspiel",
  "Music Box",
  "Vibraphone",
  "Marimba",
  "Xylophone",
  "Tubular Bells",
  "Dulcimer",
  // Organ 16–23
  "Drawbar Organ",
  "Percussive Organ",
  "Rock Organ",
  "Church Organ",
  "Reed Organ",
  "Accordion",
  "Harmonica",
  "Tango Accordion",
  // Guitar 24–31
  "Acoustic Guitar (nylon)",
  "Acoustic Guitar (steel)",
  "Electric Guitar (jazz)",
  "Electric Guitar (clean)",
  "Electric Guitar (muted)",
  "Overdriven Guitar",
  "Distortion Guitar",
  "Guitar Harmonics",
  // Bass 32–39
  "Acoustic Bass",
  "Electric Bass (finger)",
  "Electric Bass (pick)",
  "Fretless Bass",
  "Slap Bass 1",
  "Slap Bass 2",
  "Synth Bass 1",
  "Synth Bass 2",
  // Strings 40–47
  "Violin",
  "Viola",
  "Cello",
  "Contrabass",
  "Tremolo Strings",
  "Pizzicato Strings",
  "Orchestral Harp",
  "Timpani",
  // Ensemble 48–55
  "String Ensemble 1",
  "String Ensemble 2",
  "Synth Strings 1",
  "Synth Strings 2",
  "Choir Aahs",
  "Voice Oohs",
  "Synth Voice",
  "Orchestra Hit",
  // Brass 56–63
  "Trumpet",
  "Trombone",
  "Tuba",
  "Muted Trumpet",
  "French Horn",
  "Brass Section",
  "Synth Brass 1",
  "Synth Brass 2",
  // Reed 64–71
  "Soprano Sax",
  "Alto Sax",
  "Tenor Sax",
  "Baritone Sax",
  "Oboe",
  "English Horn",
  "Bassoon",
  "Clarinet",
  // Pipe 72–79
  "Piccolo",
  "Flute",
  "Recorder",
  "Pan Flute",
  "Blown Bottle",
  "Shakuhachi",
  "Whistle",
  "Ocarina",
  // Synth Lead 80–87
  "Lead 1 (square)",
  "Lead 2 (sawtooth)",
  "Lead 3 (calliope)",
  "Lead 4 (chiff)",
  "Lead 5 (charang)",
  "Lead 6 (voice)",
  "Lead 7 (fifths)",
  "Lead 8 (bass + lead)",
  // Synth Pad 88–95
  "Pad 1 (new age)",
  "Pad 2 (warm)",
  "Pad 3 (polysynth)",
  "Pad 4 (choir)",
  "Pad 5 (bowed)",
  "Pad 6 (metallic)",
  "Pad 7 (halo)",
  "Pad 8 (sweep)",
  // Synth Effects 96–103
  "FX 1 (rain)",
  "FX 2 (soundtrack)",
  "FX 3 (crystal)",
  "FX 4 (atmosphere)",
  "FX 5 (brightness)",
  "FX 6 (goblins)",
  "FX 7 (echoes)",
  "FX 8 (sci-fi)",
  // Ethnic 104–111
  "Sitar",
  "Banjo",
  "Shamisen",
  "Koto",
  "Kalimba",
  "Bagpipe",
  "Fiddle",
  "Shanai",
  // Percussive 112–119
  "Tinkle Bell",
  "Agogo",
  "Steel Drums",
  "Woodblock",
  "Taiko Drum",
  "Melodic Tom",
  "Synth Drum",
  "Reverse Cymbal",
  // Sound Effects 120–127
  "Guitar Fret Noise",
  "Breath Noise",
  "Seashore",
  "Bird Tweet",
  "Telephone Ring",
  "Helicopter",
  "Applause",
  "Gunshot",
];

export const GM_CATEGORIES: readonly { id: InstrumentCategory; label: string }[] = [
  { id: "piano", label: "Piano" },
  { id: "chromatic-percussion", label: "Perkusi Kromatis" },
  { id: "organ", label: "Organ" },
  { id: "guitar", label: "Gitar" },
  { id: "bass", label: "Bass" },
  { id: "strings", label: "Gesek" },
  { id: "ensemble", label: "Ansambel" },
  { id: "brass", label: "Brass" },
  { id: "reed", label: "Reed" },
  { id: "pipe", label: "Tiup (Pipe)" },
  { id: "synth-lead", label: "Synth Lead" },
  { id: "synth-pad", label: "Synth Pad" },
  { id: "synth-effects", label: "Synth FX" },
  { id: "ethnic", label: "Etnik" },
  { id: "percussive", label: "Perkusif" },
  { id: "sound-effects", label: "Efek Suara" },
];

/** Kategori GM untuk program 0..127 (setiap 8 program satu keluarga). */
export function gmCategoryOf(program: number): InstrumentCategory {
  const family = GM_CATEGORIES[Math.floor(program / 8)];
  if (!family) throw new RangeError(`Program GM di luar 0..127: ${program}`);
  return family.id;
}

export function categoryLabel(id: InstrumentCategory): string {
  return GM_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

/** Satu-satunya tempat konversi nomor program 0-based → nomor tampilan 1-based. */
export function formatProgramNumber(program: number): string {
  return String(program + 1).padStart(3, "0");
}

export function gmInstrumentId(program: number): string {
  return `gm-${program}`;
}
