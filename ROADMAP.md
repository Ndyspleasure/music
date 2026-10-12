# Roadmap & Status

Status mengikuti fase di `PROJECT.md` §17. Sebuah item hanya dicentang bila sudah diverifikasi. Cara verifikasinya ditulis di kolom terakhir.

Legenda verifikasi: **U** = unit test (Vitest) · **E** = e2e Playwright di Chromium nyata · **M** = belum diverifikasi manual dengan tangan/perangkat sungguhan.

## Phase 0 — Fondasi repository

- [x] React 19 + Vite 8 + TypeScript 6 (strict) + Tailwind CSS 4: `npm run build` (E)
- [x] Lint (oxlint), format (Prettier), typecheck, unit & e2e test
- [x] `vercel.json` (preset Vite, header kamera, cache aset)
- [ ] Preview Deployment Vercel diuji lewat HTTPS. Butuh project Vercel yang terhubung; belum dilakukan.

## Phase 1 — Audio

- [x] Adapter `InstrumentEngine` + `SpessaSynthEngine` (AudioWorklet), dibuat sekali setelah interaksi pengguna (U, E)
- [x] SoundFont GM berlisensi jelas (GeneralUser GS, SF3 8 MB, lazy + progres) (E)
- [x] note-on/off, volume, all-notes-off, panic (U, E)
- [x] Suara nyata diverifikasi untuk piano, gitar, gesek, brass, reed, pipe, synth lead + drum (E)
- [x] Program change benar tanpa off-by-one (Violin = 40, Tenor Sax = 66) (U, E)

## Phase 2 — Kamera

- [x] Izin kamera setelah klik, preview, indikator aktif, Stop melepas semua track (E)
- [x] MediaPipe Hand Landmarker (GPU → CPU fallback), loop di luar React (E: model termuat, fps > 0)
- [x] Izin ditolak / kamera tidak ada / kamera terputus: pesan jelas, tanpa crash (U, E)
- [ ] Stabilitas landmark dengan tangan sungguhan (M)

## Phase 3 — Gesture-to-note

- [x] Pointer, pinch start/end dengan hysteresis, One Euro smoothing, confidence threshold (U)
- [x] Note mapper + zona dengan hysteresis; tidak ada note-on berulang dalam satu zona (U)
- [x] Tangan hilang → note milik tangan itu dilepas; dua tangan tidak saling memotong note (U, E sintetis)
- [x] Input alternatif: piano layar, pad, keyboard komputer (E)
- [ ] Kenyamanan bermain melodi dengan tangan sungguhan dan latensi gesture → suara (M)

## Phase 4 — Katalog & kontrol musik

- [x] 128 program GM + status ketersediaan nyata, 133 variasi bank, 13 kit drum, pencarian/filter (U, E)
- [x] Key, 9 skala, kunci ke skala, oktaf awal/jumlah (U)
- [x] Sound pack pengguna (bank offset 64) (E)

## Phase 5 — Drum, polifoni, UX

- [x] Mode drum: pukulan (kecepatan + re-arm + cooldown per tangan & pad), cubit-ketuk, pilihan kit (U, E)
- [x] Mode akor (triad/septim diatonis, power), dua tangan (U)
- [x] Tutorial interaktif, kontrol sensitivitas (preset + kustom), feedback nada/pad/meter (E: screenshot)
- [x] Responsif (390 px tanpa scroll horizontal), fokus keyboard, status tidak hanya dengan warna (E)

## Fitur lanjutan (PROJECT.md §5.3)

- [x] Metronom + count-in (U)
- [x] Looper multi-layer dengan overdub, mute, hapus (U, E)
- [x] Ekspor MIDI (SMF tipe 1) (U, E)
- [x] Preset gesture & preset pengguna di localStorage (U, E)
- [x] Efek: reverb, chorus, delay, filter, sustain, ekspresi CC11 (E: berbunyi; efek individual belum diukur)
- [x] Opsi sound bank eksternal melalui konfigurasi aman (`VITE_SOUNDFONT_URL`, hanya same-origin/https) dan file lokal

## Phase 6 — Hardening & rilis

- [x] Audit lisensi aset (`THIRD_PARTY_NOTICES.md`), `npm audit` 0 kerentanan
- [ ] Uji Firefox & Safari (M)
- [ ] Ukur startup, latensi audio, FPS tracking, memori di ≥ 2 kelas perangkat (M)
- [ ] Preview Deployment + produksi Vercel
