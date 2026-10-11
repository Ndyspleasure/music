#!/usr/bin/env node
// Mengonversi SoundFont SF2 menjadi SF3 (sampel dikompresi Ogg Vorbis) agar
// ukuran unduhan di browser jauh lebih kecil.
//
// Pemakaian:
//   node scripts/build-soundfont.mjs <input.sf2> <output.sf3> [kualitas-vorbis]
//
// Membutuhkan `ffmpeg` dengan encoder libvorbis di PATH. Skrip ini hanya alat
// bantu pengembang; hasilnya (public/soundfonts/*.sf3) di-commit ke repository.
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { SoundBankLoader } from "spessasynth_core";

const [input, output, qualityArg] = process.argv.slice(2);
if (!input || !output) {
  console.error("Pemakaian: node scripts/build-soundfont.mjs <input.sf2> <output.sf3> [kualitas]");
  process.exit(1);
}
const quality = qualityArg ?? "5";

/** Encode PCM float32 mono menjadi Ogg Vorbis menggunakan ffmpeg. */
function encodeVorbis(audioData, sampleRate) {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "f32le",
      "-ar",
      String(sampleRate),
      "-ac",
      "1",
      "-i",
      "pipe:0",
      "-c:a",
      "libvorbis",
      "-q:a",
      quality,
      "-f",
      "ogg",
      "pipe:1",
    ]);
    const chunks = [];
    ff.stdout.on("data", (c) => chunks.push(c));
    ff.stderr.on("data", (d) => process.stderr.write(d));
    ff.on("error", reject);
    ff.on("close", (code) => {
      if (code === 0) resolve(new Uint8Array(Buffer.concat(chunks)));
      else reject(new Error(`ffmpeg keluar dengan kode ${code}`));
    });
    const bytes = Buffer.from(audioData.buffer, audioData.byteOffset, audioData.byteLength);
    ff.stdin.end(bytes);
  });
}

const source = await readFile(input);
const buffer = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
const bank = SoundBankLoader.fromArrayBuffer(buffer);
console.log(`Dimuat: ${bank.presets.length} preset, ${bank.samples.length} sampel`);

let last = -1;
await bank.setSampleFormat({
  format: "compressed",
  compressionFunction: encodeVorbis,
  progressFunction: (p) => {
    const pct = Math.floor(p * 100);
    if (pct !== last && pct % 10 === 0) {
      last = pct;
      console.log(`Kompresi ${pct}%`);
    }
  },
});

const out = bank.writeSF2({ software: "gesture-virtual-instrument build-soundfont" });
await writeFile(output, new Uint8Array(out));
console.log(`Ditulis ${output} (${(out.byteLength / 1024 / 1024).toFixed(2)} MB)`);
