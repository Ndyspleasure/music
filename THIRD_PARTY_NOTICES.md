# Third-Party Notices

Daftar aset dan pustaka pihak ketiga yang **didistribusikan** bersama Gestura (ikut ter-deploy ke browser pengguna). Dependensi khusus pengembangan (Vite, TypeScript, Vitest, Playwright, oxlint, Prettier) tidak ikut terdistribusi dan tidak dicantumkan di sini.

## Aset

### GeneralUser GS v2.0.3 (SoundFont)

| | |
|---|---|
| File di repo | `public/soundfonts/GeneralUser-GS.sf3` |
| Pembuat | S. Christian Collins |
| Sumber | https://www.schristiancollins.com/generaluser · https://github.com/mrbumpy409/GeneralUser-GS (commit `684543d5e5efaef08d02be50dcda8d552478fa60`) |
| Lisensi | GeneralUser GS License v2.0 — salinan lengkap: `public/soundfonts/GeneralUser-GS-LICENSE.txt` |
| Modifikasi | Dikonversi dari SF2 (32,3 MB) ke SF3 (8,0 MB; sampel dikompresi Ogg Vorbis kualitas 5) dengan `scripts/build-soundfont.mjs`. Preset tidak diubah (287 preset, 128 program GM, 13 kit drum). |
| SHA-256 | `7d54125e3c2c13f8d920b3a114be5e911a249468cd97199221b9485ad0a9b14c` |

Ringkasan lisensi: boleh dipakai tanpa batasan untuk kreasi musik pribadi maupun komersial, boleh dipakai dalam proyek perangkat lunak, dan boleh dimodifikasi/dikemas ulang. Penulis meminta agar situs **tidak menautkan langsung** ke file unduhannya; karena itu aplikasi ini menyajikan salinan lokal.

> Catatan risiko dari lisensi itu sendiri: penulis menyatakan sebagian sampel berasal dari bank gratis lain dan asal-usulnya tidak 100% dapat dipastikan, meskipun tidak ada yang berasal dari produk komersial dan belum pernah ada keluhan sejak 2000. Pertimbangkan hal ini bila Gestura dijadikan produk komersial.

### MediaPipe Hand Landmarker model

| | |
|---|---|
| File di repo | `public/models/hand_landmarker.task` (float16, versi 1) |
| Pembuat | Google |
| Sumber | https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task · dokumentasi: https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker |
| Lisensi | Apache License 2.0 (sesuai model card MediaPipe Hands) |
| SHA-256 | `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1` |

## Pustaka runtime (npm)

| Paket | Versi (lockfile) | Lisensi | Keterangan |
|---|---|---|---|
| `@mediapipe/tasks-vision` | 1.1.0 | Apache-2.0 | JS + WASM (`public/vendor/mediapipe/wasm`, disalin otomatis saat build) |
| `spessasynth_lib` | 4.3.14 | Apache-2.0 | Synthesizer SoundFont (AudioWorklet processor disalin ke `public/vendor/spessasynth`) |
| `spessasynth_core` | 4.3.22 | Apache-2.0 | Dependensi `spessasynth_lib` (juga dipakai skrip konversi SF3) |
| `react`, `react-dom` | 19.x | MIT | UI |
| `lucide-react` | 1.x | ISC | Ikon |
| `tailwindcss` | 4.x | MIT | CSS yang dihasilkan saat build |

`spessasynth_lib` memuat ulang komponen pihak ketiga yang disebut di README-nya (stbvorbis.js — Apache-2.0/Public Domain, fflate — MIT).

## Merek dagang

SoundFont® adalah merek dagang terdaftar Creative Technology Ltd. General MIDI adalah spesifikasi MIDI Manufacturers Association. Gestura tidak berafiliasi dengan pihak-pihak tersebut.

## Sound pack pengguna

Pengguna dapat memuat file SF2/SF3/SF4/DLS miliknya sendiri. File tersebut hanya dibaca di browser pengguna, tidak diunggah, dan tidak didistribusikan oleh aplikasi; tanggung jawab lisensinya ada pada pengguna.
