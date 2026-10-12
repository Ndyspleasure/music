import { FINGERS, type FingerId, type HandSide } from "../../types/gesture";
import type { MidiNote, NoteZone, PitchClass, ScaleId } from "../../types/music";
import { clampMidi, midiToNoteName, noteNumber, pitchClassOf } from "./notes";
import { isInScale } from "./scales";

export interface NoteLayoutOptions {
  root: PitchClass;
  scale: ScaleId;
  /** Bila true, zona hanya berisi note dalam skala. Bila false, 12 semiton ditampilkan. */
  quantize: boolean;
  /** Oktaf awal (C{startOctave}). */
  startOctave: number;
  /** Jumlah oktaf yang dapat dimainkan (1–4). */
  octaveCount: number;
  preferFlats?: boolean;
}

export function layoutRange(opts: Pick<NoteLayoutOptions, "startOctave" | "octaveCount">): {
  low: MidiNote;
  high: MidiNote;
} {
  const low = clampMidi(noteNumber(0, opts.startOctave));
  // Sertakan C oktaf berikutnya sebagai penutup agar skala terasa "selesai".
  const high = clampMidi(low + opts.octaveCount * 12);
  return { low, high };
}

/** Bangun daftar zona nada dari kiri ke kanan. */
export function buildNoteLayout(opts: NoteLayoutOptions): NoteZone[] {
  const { low, high } = layoutRange(opts);
  const zones: NoteZone[] = [];
  for (let note = low; note <= high; note++) {
    const inScale = isInScale(note, opts.root, opts.scale);
    if (opts.quantize && !inScale) continue;
    zones.push({
      index: zones.length,
      note,
      label: midiToNoteName(note, opts.preferFlats),
      inScale,
      isRoot: pitchClassOf(note) === opts.root,
    });
  }
  return zones;
}

/**
 * Melacak zona aktif dengan hysteresis: zona baru dipilih hanya bila pointer
 * melewati batas zona saat ini lebih dari `hysteresis` × lebar zona. Mencegah
 * note bergonta-ganti saat pointer bergetar tepat di batas.
 */
export class ZoneTracker {
  private current = -1;
  private hysteresis: number;

  constructor(hysteresis: number = 0.18) {
    this.hysteresis = hysteresis;
  }

  setHysteresis(value: number): void {
    this.hysteresis = Math.max(0, Math.min(0.45, value));
  }

  reset(): void {
    this.current = -1;
  }

  get currentZone(): number {
    return this.current;
  }

  /** @param x posisi horizontal 0..1 dalam ruang tampilan. */
  resolve(x: number, zoneCount: number): number {
    if (zoneCount <= 0) {
      this.current = -1;
      return -1;
    }
    const clamped = Math.min(0.999999, Math.max(0, x));
    const width = 1 / zoneCount;
    const raw = Math.floor(clamped / width);
    if (this.current < 0 || this.current >= zoneCount) {
      this.current = raw;
      return raw;
    }
    const start = this.current * width - this.hysteresis * width;
    const end = (this.current + 1) * width + this.hysteresis * width;
    if (clamped < start || clamped > end) this.current = raw;
    return this.current;
  }
}

/** Jumlah slot nada pada mode input "Jari": 4 jari × 2 tangan. */
export const FINGER_SLOT_COUNT = FINGERS.length * 2;

/**
 * Slot nada untuk sebuah jari. Tangan kiri memegang nada rendah (slot 0–3: telunjuk→kelingking),
 * tangan kanan nada tinggi (slot 4–7). Tangan yang sisinya tidak diketahui dianggap kiri.
 */
export function fingerSlot(side: HandSide, finger: FingerId): number {
  return (side === "right" ? FINGERS.length : 0) + FINGERS.indexOf(finger);
}

/**
 * Nada untuk tiap slot jari: derajat skala berurutan mulai dari nada dasar pada oktaf awal.
 * Contoh C mayor oktaf 4 → C4 D4 E4 F4 | G4 A4 B4 C5. Skala lebih pendek (pentatonik)
 * otomatis berlanjut ke oktaf berikutnya.
 */
export function buildFingerNotes(opts: Pick<NoteLayoutOptions, "root" | "scale" | "startOctave">): MidiNote[] {
  const notes: MidiNote[] = [];
  const start = noteNumber(opts.root, opts.startOctave);
  for (let n = start; n <= 127 && notes.length < FINGER_SLOT_COUNT; n++) {
    if (isInScale(n, opts.root, opts.scale)) notes.push(n);
  }
  while (notes.length < FINGER_SLOT_COUNT) notes.push(notes.at(-1) ?? clampMidi(start));
  return notes;
}
