# Gestura — Instrumen Virtual Gerak Tangan

Gestura adalah studio alat musik virtual yang berjalan di browser. Arahkan tangan ke webcam, gerakkan telunjuk untuk memilih nada, lalu **cubit** (rapatkan ibu jari dan telunjuk) untuk membunyikannya. Ada 128 instrumen General MIDI ditambah variasi bank, mode akor, drum, looper multi-layer, dan ekspor MIDI. Semua pemrosesan kamera dan audio terjadi **di perangkat pengguna**. Tidak ada backend, dan frame kamera tidak pernah diunggah.

> Spesifikasi produk: [`PROJECT.md`](PROJECT.md) · Desain teknis: [`arsitektur.md`](arsitektur.md) · Status fitur: [`ROADMAP.md`](ROADMAP.md) · Lisensi aset: [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)

## Fitur

| Area | Yang tersedia |
|---|---|
| Kamera & tracking | Kamera hanya diminta setelah tombol **Mulai Bermain** ditekan. Indikator kamera aktif dan tombol Stop selalu terlihat. Pilihan kamera, mode selfie (mirror), dan 1–2 tangan. Hand tracking memakai MediaPipe Hand Landmarker (GPU, otomatis jatuh ke CPU) dan berjalan lokal. |
| Gesture | Pointer ujung telunjuk dihaluskan dengan One Euro Filter. Pinch memakai hysteresis, ada ambang confidence, dan zona nada punya hysteresis. Juga tersedia pukulan drum (deteksi kecepatan + cooldown), swipe untuk ganti oktaf (opsional), dan grace period saat tangan hilang. |
| Mode bermain | **Melodi** (satu nada per tangan, dua tangan = polifoni). **Akor** (triad/septim diatonis atau power chord). **Drum** (8 pad, velocity dari kecepatan ayunan atau cubit-ketuk). |
| Teori musik | 12 nada dasar dan 9 tangga nada (kromatis, mayor, minor natural/harmonik, pentatonik mayor/minor, blues, dorian, mixolydian). Opsi kunci ke skala, oktaf awal 1–7, 1–4 oktaf, dan nama ♯/♭. |
| Instrumen | Katalog 128 program GM (nomor data 0–127, tampil 001–128) dengan status ketersediaan nyata dari sound bank. Ada 133 variasi bank GS, 13 kit drum, pencarian, dan filter kategori/sumber. |
| Sound pack | Muat file `.sf2/.sf3/.sf4/.dls` milik sendiri. Pack dimuat dengan bank offset agar tidak menimpa preset GM. |
| Audio | SpessaSynth (AudioWorklet) dengan SoundFont GeneralUser GS (SF3, 8 MB, dimuat lazy dengan progres). Tersedia volume, reverb, chorus, delay (waktu/feedback/campuran), filter low-pass, sustain, ekspresi CC11 dari tinggi tangan, dan meter level. |
| Looper | Metronom (40–220 BPM, 2–7 ketukan, count-in). Loop pertama menentukan panjang (bisa dibulatkan ke bar). Overdub berlapis, dan tiap layer mempertahankan instrumennya sendiri. Layer bisa di-mute/dihapus dan diekspor ke **MIDI (.mid)**. |
| Fallback | Piano di layar (mouse/sentuh/glissando), pad drum, dan keyboard komputer (A W S E D…; Z/X oktaf; Spasi sustain; Esc hentikan semua bunyi). |
| Lainnya | Preset pengguna dan setelan disimpan di localStorage. Tersedia tutorial interaktif yang tercentang otomatis, panel status (kamera, model, tangan, audio, sound bank) dengan tombol retry, dialog privasi & lisensi, UI responsif, dan aksesibilitas keyboard. |

## Persyaratan

- Node.js ≥ 20.19 (dikembangkan dengan Node 22) dan npm.
- Browser modern dengan Web Audio AudioWorklet, WebAssembly, dan `getUserMedia`: Chrome/Edge 110+, Firefox 115+, atau Safari 16.4+.
- Kamera hanya berfungsi di **HTTPS** atau `localhost`.

## Menjalankan secara lokal

```bash
npm install
npm run dev          # http://localhost:5173
```

Saat `dev`/`build`, plugin Vite menyalin file WASM MediaPipe dan AudioWorklet SpessaSynth dari `node_modules` ke `public/vendor/`. Folder ini diabaikan Git, sehingga versinya selalu sama dengan lockfile.

## Skrip

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan Vite |
| `npm run build` | Typecheck (`tsc -b`) + build produksi ke `dist/` |
| `npm run preview` | Menyajikan hasil build |
| `npm run typecheck` | TypeScript strict |
| `npm run lint` | oxlint (warning = gagal) |
| `npm run format` / `format:check` | Prettier |
| `npm test` | Unit test Vitest (logika musik, gesture, note manager, looper, MIDI, storage, controller) |
| `npm run test:e2e` | Playwright di Chromium nyata dengan kamera palsu: SoundFont termuat, 7 keluarga GM + drum benar-benar berbunyi, program synth terverifikasi, MediaPipe termuat, pipeline gesture, izin kamera ditolak, looper + ekspor MIDI, sound pack, persistensi preset, dan layout mobile |
| `npm run check` | typecheck + lint + test + build |
| `npm run assets:soundfont -- <in.sf2> <out.sf3>` | Konversi SoundFont ke SF3 (butuh `ffmpeg` dengan libvorbis) |

E2E di mesin lokal memakai browser Playwright biasa (`npx playwright install chromium`). Di lingkungan dengan Chromium terpasang di `/opt/pw-browsers`, path itu terdeteksi otomatis, atau bisa diatur lewat `PW_CHROMIUM_PATH`.

## Konfigurasi

Lihat [`.env.example`](.env.example). Semua `VITE_*` **terlihat oleh browser**, jadi jangan menaruh rahasia di sana.

- `VITE_SOUNDFONT_URL`: SoundFont utama. Hanya menerima path same-origin (`/…`) atau URL `https://` (server harus mengizinkan CORS).
- `VITE_HAND_MODEL_URL`: model hand landmarker.

## Deploy ke Vercel

Repo sudah berisi [`vercel.json`](vercel.json) dengan preset Vite, `npm run build`, output `dist`, header `Permissions-Policy: camera=(self)`, dan cache untuk SoundFont/model.

1. Impor repository di Vercel (framework terdeteksi sebagai Vite).
2. Uji Preview Deployment lewat HTTPS. Pastikan izin kamera, audio, SoundFont (`/soundfonts/…`), model (`/models/…`), dan WASM (`/vendor/…`) tidak 404.
3. Ukuran `dist/` sekitar 42 MB. File terbesar adalah WASM MediaPipe (2×12–13 MB, hanya satu yang diunduh browser), model (7,5 MB), dan SoundFont (8 MB). Bandingkan dengan batas akun Vercel yang berlaku.

## Privasi

- Kamera dimulai hanya atas tindakan pengguna dan dapat dihentikan kapan saja. Semua track `MediaStream` dihentikan saat Stop.
- Frame diproses di browser. Tidak ada frame, video, atau landmark yang dikirim atau disimpan.
- Yang disimpan hanya preferensi non-sensitif di localStorage.

## Batasan yang diketahui

- Pengujian otomatis memakai kamera palsu Chromium (tanpa tangan). Jalur gesture diuji dengan landmark sintetis yang disuntikkan ke pipeline asli (`?debug=1`). Kualitas tracking dengan tangan sungguhan, pencahayaan nyata, dan latensi gesture-ke-suara masih perlu diuji manual di perangkat target. Angka latensi/FPS belum diukur.
- Hanya Chromium yang diuji otomatis. Firefox dan Safari belum diverifikasi.
- Lihat `ROADMAP.md` untuk status lengkap.
