import type { MidiChannel, MidiNote } from "../../types/music";

/** Pemilik note: tangan ("hand-right"), "keyboard", "pointer", "loop:<id>", dll. */
export type NoteOwner = string;

/** Sink minimal yang dibutuhkan NoteManager (dipenuhi InstrumentEngine). */
export interface NoteSink {
  noteOn(channel: MidiChannel, note: MidiNote, velocity: number): void;
  noteOff(channel: MidiChannel, note: MidiNote): void;
  allNotesOff(): void;
}

export type NoteEvent =
  | { type: "on"; owner: NoteOwner; channel: MidiChannel; note: MidiNote; velocity: number }
  | { type: "off"; owner: NoteOwner; channel: MidiChannel; note: MidiNote };

export interface ActiveNote {
  channel: MidiChannel;
  note: MidiNote;
  owners: NoteOwner[];
}

const key = (channel: MidiChannel, note: MidiNote) => channel * 128 + note;

/**
 * Pelacak note aktif berdasarkan pasangan (pemilik, kanal, note).
 * - noteOn ganda dari pemilik yang sama diabaikan (tidak ada retrigger karena jitter).
 * - noteOff fisik hanya dikirim bila tidak ada pemilik lain yang masih menahan note itu,
 *   sehingga tangan kiri tidak menghentikan note identik milik tangan kanan.
 * - releaseOwner/releaseAll menjamin tidak ada note menggantung.
 */
export class NoteManager {
  private holders = new Map<number, Set<NoteOwner>>();
  private listeners = new Set<(e: NoteEvent) => void>();
  private changeListeners = new Set<() => void>();
  private sink: NoteSink;

  constructor(sink: NoteSink) {
    this.sink = sink;
  }

  setSink(sink: NoteSink): void {
    this.sink = sink;
  }

  onNote(listener: (e: NoteEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  isHeld(owner: NoteOwner, channel: MidiChannel, note: MidiNote): boolean {
    return this.holders.get(key(channel, note))?.has(owner) ?? false;
  }

  noteOn(owner: NoteOwner, channel: MidiChannel, note: MidiNote, velocity: number): boolean {
    if (note < 0 || note > 127) return false;
    const k = key(channel, note);
    let set = this.holders.get(k);
    if (set?.has(owner)) return false;
    if (!set) {
      set = new Set();
      this.holders.set(k, set);
    }
    set.add(owner);
    const v = Math.max(1, Math.min(127, Math.round(velocity)));
    this.sink.noteOn(channel, note, v);
    this.emit({ type: "on", owner, channel, note, velocity: v });
    return true;
  }

  noteOff(owner: NoteOwner, channel: MidiChannel, note: MidiNote): boolean {
    const k = key(channel, note);
    const set = this.holders.get(k);
    if (!set?.has(owner)) return false;
    set.delete(owner);
    if (set.size === 0) {
      this.holders.delete(k);
      this.sink.noteOff(channel, note);
    }
    this.emit({ type: "off", owner, channel, note });
    return true;
  }

  /** Lepas semua note milik satu pemilik (tangan hilang, tombol dilepas, dsb.). */
  releaseOwner(owner: NoteOwner): number {
    let count = 0;
    for (const [k, set] of Array.from(this.holders)) {
      if (set.has(owner)) {
        this.noteOff(owner, Math.floor(k / 128), k % 128);
        count++;
      }
    }
    return count;
  }

  /** Lepas semua note di satu kanal (mis. sebelum ganti program instrumen). */
  releaseChannel(channel: MidiChannel): void {
    for (const [k, set] of Array.from(this.holders)) {
      if (Math.floor(k / 128) !== channel) continue;
      for (const owner of Array.from(set)) this.noteOff(owner, channel, k % 128);
    }
  }

  /** Lepas semua pemilik yang namanya diawali prefix (mis. "hand-"). */
  releaseOwnersWithPrefix(prefix: string): void {
    for (const owner of this.owners()) if (owner.startsWith(prefix)) this.releaseOwner(owner);
  }

  /** Lepas semua note dan kirim all-notes-off ke engine sebagai jaring pengaman. */
  releaseAll(): void {
    for (const owner of this.owners()) this.releaseOwner(owner);
    this.holders.clear();
    this.sink.allNotesOff();
    this.notifyChange();
  }

  owners(): NoteOwner[] {
    const all = new Set<NoteOwner>();
    for (const set of this.holders.values()) for (const o of set) all.add(o);
    return [...all];
  }

  activeNotes(): ActiveNote[] {
    return [...this.holders].map(([k, set]) => ({
      channel: Math.floor(k / 128),
      note: k % 128,
      owners: [...set],
    }));
  }

  get size(): number {
    return this.holders.size;
  }

  private emit(e: NoteEvent): void {
    for (const l of this.listeners) l(e);
    this.notifyChange();
  }

  private notifyChange(): void {
    for (const l of this.changeListeners) l();
  }
}
