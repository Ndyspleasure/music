import type { LoopLayer } from "./looper";

/** Resolusi tick per quarter note. */
export const PPQ = 480;

export interface MidiExportOptions {
  bpm: number;
  beatsPerBar: number;
  loopLength: number;
  /** Berapa kali loop diulang dalam file. */
  repeats?: number;
}

interface TrackEvent {
  tick: number;
  /** Urutan saat tick sama: note-off sebelum note-on. */
  order: number;
  data: number[];
}

/**
 * Ekspor layer looper sebagai Standard MIDI File tipe 1.
 * Track 0: tempo + time signature. Satu track per kanal layer (program + bank select).
 */
export function exportLoopToMidi(layers: LoopLayer[], opts: MidiExportOptions): Uint8Array {
  const repeats = Math.max(1, Math.min(64, Math.round(opts.repeats ?? 1)));
  const secToTick = (s: number) => Math.round((s * opts.bpm * PPQ) / 60);
  const usPerQuarter = Math.round(60_000_000 / opts.bpm);
  const endTick = secToTick(opts.loopLength * repeats);

  const tracks: number[][] = [];
  tracks.push(
    encodeTrack(
      [
        {
          tick: 0,
          order: 0,
          data: [0xff, 0x51, 0x03, (usPerQuarter >> 16) & 0xff, (usPerQuarter >> 8) & 0xff, usPerQuarter & 0xff],
        },
        { tick: 0, order: 0, data: [0xff, 0x58, 0x04, opts.beatsPerBar & 0xff, 2, 24, 8] },
        { tick: 0, order: 0, data: metaText(0x03, "Gestura Loop") },
      ],
      endTick,
    ),
  );

  for (const layer of layers) {
    if (layer.muted) continue;
    for (const part of ["melodic", "drum"] as const) {
      const isDrum = part === "drum";
      const events = layer.events.filter((e) => e.drum === isDrum);
      if (events.length === 0) continue;
      // Kanal file: drum selalu di kanal 9 (GM); melodi memakai kanal playback layer.
      const ch = isDrum ? 9 : (layer.channel ?? 0) === 9 ? 0 : (layer.channel ?? 0);
      const program = isDrum ? layer.drumKit : layer.patch.program;
      const out: TrackEvent[] = [
        { tick: 0, order: 0, data: metaText(0x03, `${layer.name} — ${isDrum ? "Drum" : layer.instrumentName}`) },
      ];
      if (!isDrum) {
        out.push({ tick: 0, order: 1, data: [0xb0 | ch, 0, layer.patch.bankMSB & 0x7f] });
        out.push({ tick: 0, order: 1, data: [0xb0 | ch, 32, layer.patch.bankLSB & 0x7f] });
      }
      out.push({ tick: 0, order: 2, data: [0xc0 | ch, program & 0x7f] });
      for (let r = 0; r < repeats; r++) {
        const offset = r * opts.loopLength;
        // Pasangkan on/off per siklus agar tidak ada note menggantung di file.
        const open = new Map<number, number>();
        const sorted = events.toSorted((a, b) => a.time - b.time || (a.type === "off" ? -1 : 1));
        for (const e of sorted) {
          const tick = secToTick(offset + e.time);
          if (e.type === "on") {
            if (open.has(e.note)) out.push({ tick, order: 3, data: [0x80 | ch, e.note, 0] });
            open.set(e.note, tick);
            out.push({ tick, order: 4, data: [0x90 | ch, e.note, Math.max(1, e.velocity)] });
          } else if (open.has(e.note)) {
            open.delete(e.note);
            out.push({ tick, order: 3, data: [0x80 | ch, e.note, 0] });
          }
        }
        const cycleEnd = secToTick(offset + opts.loopLength);
        for (const note of open.keys())
          out.push({ tick: Math.max(0, cycleEnd - 1), order: 3, data: [0x80 | ch, note, 0] });
      }
      tracks.push(encodeTrack(out, endTick));
    }
  }

  const header = [...ascii("MThd"), ...u32(6), ...u16(1), ...u16(tracks.length), ...u16(PPQ)];
  const bytes = header.concat(...tracks);
  return Uint8Array.from(bytes);
}

function encodeTrack(events: TrackEvent[], endTick: number): number[] {
  const sorted = events.toSorted((a, b) => a.tick - b.tick || a.order - b.order);
  const body: number[] = [];
  let last = 0;
  for (const e of sorted) {
    const tick = Math.max(last, e.tick);
    body.push(...vlq(tick - last), ...e.data);
    last = tick;
  }
  body.push(...vlq(Math.max(0, endTick - last)), 0xff, 0x2f, 0x00);
  return [...ascii("MTrk"), ...u32(body.length), ...body];
}

/** Variable-length quantity (format delta-time MIDI). */
export function vlq(value: number): number[] {
  let v = Math.max(0, Math.floor(value));
  const bytes = [v & 0x7f];
  v >>= 7;
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80);
    v >>= 7;
  }
  return bytes;
}

function metaText(type: number, text: string): number[] {
  const bytes = [...new TextEncoder().encode(text)].slice(0, 127);
  return [0xff, type, ...vlq(bytes.length), ...bytes];
}

function ascii(s: string): number[] {
  return [...s].map((c) => c.charCodeAt(0));
}
function u32(n: number): number[] {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
}
function u16(n: number): number[] {
  return [(n >>> 8) & 0xff, n & 0xff];
}
