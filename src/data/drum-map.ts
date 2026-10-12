/** Pad drum untuk mode Air Drums dan kontrol keyboard. Nomor note mengikuti GM Percussion Key Map. */
export interface DrumPad {
  id: string;
  label: string;
  note: number;
  /** Tombol keyboard komputer (huruf kecil). */
  key: string;
  /** Warna aksen pad (token CSS). */
  hue: number;
}

/** Disusun 4 kolom × 2 baris: baris atas  = simbal/tom, baris bawah = kick/snare/hi-hat. */
export const DRUM_PADS: readonly DrumPad[] = [
  { id: "crash", label: "Crash", note: 49, key: "q", hue: 48 },
  { id: "high-tom", label: "Tom Tinggi", note: 50, key: "w", hue: 20 },
  { id: "low-tom", label: "Tom Rendah", note: 45, key: "e", hue: 350 },
  { id: "ride", label: "Ride", note: 51, key: "r", hue: 190 },
  { id: "kick", label: "Kick", note: 36, key: "a", hue: 265 },
  { id: "snare", label: "Snare", note: 38, key: "s", hue: 300 },
  { id: "closed-hat", label: "Hi-hat Tutup", note: 42, key: "d", hue: 160 },
  { id: "open-hat", label: "Hi-hat Buka", note: 46, key: "f", hue: 130 },
];

export const DRUM_GRID = { columns: 4, rows: 2 } as const;

/** Pad pada posisi tampilan (x,y 0..1). */
export function drumPadAt(x: number, y: number): DrumPad | undefined {
  const col = Math.min(DRUM_GRID.columns - 1, Math.max(0, Math.floor(x * DRUM_GRID.columns)));
  const row = Math.min(DRUM_GRID.rows - 1, Math.max(0, Math.floor(y * DRUM_GRID.rows)));
  return DRUM_PADS[row * DRUM_GRID.columns + col];
}

/** Kanal perkusi GM (0-based). */
export const DRUM_CHANNEL = 9;
/** Kanal metronom (diset sebagai kanal drum terpisah agar tidak terpengaruh pilihan kit). */
export const METRONOME_CHANNEL = 15;
export const METRONOME_NOTES = { accent: 76, beat: 77 } as const; // Hi / Low Wood Block
