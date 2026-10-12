# PROJECT.md — Product Overview & Functional Specification

> Dokumen ini menjelaskan **apa proyek ini, untuk siapa, bagaimana cara kerjanya, fitur yang dituju, dan bagaimana keberhasilannya diukur**. Dokumen menjadi konteks produk utama untuk pemilik proyek, Claude Code, developer, designer, QA, dan contributor.
>
> **Status dokumen:** spesifikasi rancangan produk. Fitur yang dijelaskan di sini adalah target dan rencana implementasi, kecuali repository sudah memiliki implementasi yang dapat diverifikasi. Jangan menganggap semua fitur sudah tersedia hanya karena tertulis di dokumen ini.

---

## 1. Ringkasan Proyek

Proyek ini adalah **studio alat musik virtual berbasis gerakan tangan** yang berjalan sebagai aplikasi web. Pengguna dapat memainkan nada dan suara beragam alat musik hanya dengan menggerakkan tangan di depan kamera komputer atau perangkat yang kompatibel, tanpa harus memiliki atau memegang instrumen fisik.

Kamera menangkap gerakan tangan. Model computer vision mendeteksi titik-titik tangan (*hand landmarks*), lalu sistem interpretasi gesture menerjemahkannya menjadi aksi musik seperti memilih nada, menyalakan nada, menghentikan nada, memukul drum virtual, atau mengubah kontrol tertentu. Mesin audio di browser kemudian menghasilkan suara sesuai instrumen yang sedang dipilih.

Aplikasi ditujukan untuk berjalan di browser dan dideploy melalui **Vercel**. Jalur utama desain adalah memproses kamera dan menghasilkan audio pada perangkat pengguna, sehingga fitur dasar tidak memerlukan server yang terus-menerus aktif.

### Inti konsep

**Gerakan tangan → deteksi tangan → interpretasi gesture → pemetaan nada/aksi musik → mesin audio → suara instrumen.**

### Sasaran utama

- Pengguna dapat mencoba dan memainkan instrumen virtual melalui webcam.
- Satu sistem gesture dapat digunakan dengan banyak instrumen.
- Katalog dasar menyediakan seluruh **128 program instrumen General MIDI (GM)** jika didukung oleh sound bank yang dipilih.
- Tersedia mode instrumen melodis dan mode perkusi/drum.
- Pengguna dapat mengatur nada, oktaf, tangga nada, sensitivitas gesture, volume, dan instrumen.
- Aplikasi memiliki respons yang cukup cepat untuk permainan musik langsung serta memberi feedback visual yang jelas.
- Aplikasi bisa dibangun sebagai frontend web dan di-host pada Vercel.

---

## 2. Visi Produk

Membuat alat musik virtual yang mudah dicoba, ekspresif, dan menyenangkan: pengguna bisa mengubah ruang di depan kamera menjadi area bermain musik. Produk menggabungkan aksesibilitas web, pengenalan gesture, dan synthesizer berbasis browser.

Produk sebaiknya terasa seperti **instrumen musik interaktif**, bukan sekadar demo computer vision atau dashboard teknis. Pengguna harus segera memahami cara memulai, memilih instrumen, menghasilkan suara, dan mengetahui gesture apa yang sedang terbaca.

### Prinsip produk

1. **Mudah dimulai:** pengguna tidak perlu menghubungkan instrumen fisik atau membaca tutorial panjang sebelum mencoba.
2. **Responsif:** suara dan feedback visual harus sedekat mungkin dengan waktu gesture.
3. **Eksploratif:** mengganti instrumen seharusnya mudah, sehingga pengguna dapat membandingkan karakter suara.
4. **Terbuka untuk dikembangkan:** penambahan preset dan sound pack tidak mengharuskan sistem gesture ditulis ulang.
5. **Privasi sebagai default:** proses kamera secara lokal di browser, kecuali ada fitur berbeda yang sengaja dirancang dan dijelaskan secara eksplisit.
6. **Jujur tentang kemampuan:** jika suara atau preset tidak tersedia dalam sound bank yang aktif, antarmuka harus menjelaskannya; jangan sekadar menampilkan nama instrumen seolah-olah pasti bisa dimainkan.
7. **Fallback tersedia:** pengguna tetap dapat menguji suara menggunakan mouse atau keyboard saat kamera tidak tersedia.
8. **Aman untuk dikembangkan:** pemrosesan kamera, pemetaan gesture, katalog instrumen, dan mesin audio merupakan modul terpisah.

---

## 3. Masalah yang Ingin Diselesaikan

Instrumen fisik dapat mahal, membutuhkan ruang, dan tidak selalu tersedia bagi pengguna yang hanya ingin bereksperimen dengan musik. Aplikasi musik biasa juga umumnya mengandalkan mouse, keyboard komputer, MIDI controller, atau layar sentuh.

Proyek ini mencoba memberikan cara alternatif untuk mengeksplorasi suara dan melodi menggunakan gerakan alami tangan di depan kamera. Tujuannya bukan menggantikan seluruh instrumen profesional, melainkan memberi pengalaman musik interaktif yang mudah diakses, menarik untuk dicoba, dan dapat dikembangkan menjadi alat belajar maupun kreasi sederhana.

### Nilai yang ditawarkan

- Eksperimen berbagai keluarga suara tanpa membeli setiap instrumen.
- Bermain melodi dasar dengan gerakan tangan.
- Mencoba skala musik dengan bantuan *scale quantization*.
- Memicu beat dan perkusi melalui gerakan.
- Mengalami interaksi musik yang visual dan cocok untuk demonstrasi, eksplorasi, serta proyek kreatif.

---

## 4. Pengguna Sasaran

### Pengguna utama

- Orang yang ingin mencoba bermain musik tanpa instrumen fisik.
- Pemula yang ingin memahami hubungan gesture, nada, oktaf, dan tangga nada.
- Kreator konten atau presenter yang membutuhkan demo interaktif.
- Penggemar musik elektronik dan eksperimen suara.
- Developer atau pelajar yang tertarik pada computer vision, Web Audio, dan interaksi real-time.

### Kebutuhan pengguna

- Mengetahui dengan jelas apakah kamera dan audio sudah aktif.
- Mengetahui gesture yang harus dilakukan untuk memainkan nada.
- Mendapat respons visual ketika gesture terdeteksi.
- Dapat mengganti instrumen tanpa kembali mengatur seluruh aplikasi.
- Dapat mengubah sensitivitas apabila gesture terlalu mudah atau sulit terdeteksi.
- Mempunyai alternatif input bila kamera gagal atau tidak diizinkan.
- Mendapat informasi yang jelas ketika model AI atau sound bank sedang dimuat atau gagal dimuat.

---

## 5. Ruang Lingkup Produk

### 5.1 Target MVP

Cakupan minimum yang disarankan:

1. Aplikasi web responsif yang dapat dibuild dan dideploy di Vercel.
2. Tombol eksplisit untuk memulai dan menghentikan sesi.
3. Izin kamera dan preview kamera.
4. Pelacakan satu tangan terlebih dahulu, dengan desain yang memungkinkan dua tangan pada tahap berikutnya.
5. Visualisasi pointer/landmark sederhana untuk membantu pengguna memahami tracking.
6. Mode instrumen melodis awal dengan pemetaan posisi ke note dan gesture untuk memulai/melepas note.
7. Pemilihan instrumen dari sound bank yang benar-benar tersedia.
8. Kontrol volume dan rentang oktaf.
9. Kontrol uji suara melalui mouse/keyboard.
10. Status loading, error, dan cleanup yang benar—terutama memastikan tidak ada nada terus berbunyi ketika sesi dihentikan.
11. Pengujian beberapa keluarga preset General MIDI sebelum memperluas katalog.

### 5.2 Target lanjutan (pasca-MVP)

- Katalog lengkap 128 program General MIDI.
- Mode drum dengan mapping perkusi khusus.
- Dua tangan, chord, dan beberapa note bersamaan (*polyphony*).
- Pilihan root/key dan skala musik.
- Pengaturan sensitivitas, smoothing, dan mode gesture.
- Visual keyboard/zona nada serta indikator note aktif.
- Penambahan sound pack dan variasi preset di luar katalog GM dasar.
- Peningkatan performa dan kompatibilitas perangkat.

### 5.3 Fitur lanjutan (opsional)
Fitur ini bukan syarat dan tidak boleh menunda fungsi inti tanpa alasan yang kuat:

- Perekaman atau playback frasa musik.
- Metronom dan tempo.
- Sequencer sederhana atau loop.
- Ekspor MIDI bila event musik sudah memiliki representasi waktu yang memadai.
- Preset gesture yang dapat dikonfigurasi.
- Mode latihan/tutorial interaktif.
- Efek audio tambahan seperti reverb, delay, filter, dan sustain.
- Penyimpanan preset pengguna secara lokal.
- Opsi sound bank eksternal melalui konfigurasi yang aman dan jelas.

### 5.4 Bukan fokus awal

- Akun, autentikasi, backend khusus, dan database cloud.
- Fitur sosial, kolaborasi multiplayer, atau jam session jarak jauh.
- DAW profesional dengan mixing dan mastering penuh.
- Menjanjikan dukungan terhadap setiap alat musik yang ada di dunia sejak rilis pertama.
- Perekaman video atau pengunggahan gambar kamera secara default.

Fitur di luar fokus dapat dievaluasi kembali berdasarkan hasil penggunaan MVP.

---

## 6. Alur Pengguna Utama

### Langkah 1 — Membuka aplikasi

Pengguna membuka aplikasi web melalui domain yang di-host di Vercel. Aplikasi menampilkan fungsi utama, instrumen yang tersedia, serta tombol untuk memulai.

### Langkah 2 — Memulai sesi

Pengguna menekan tombol **Mulai Bermain**. Setelah interaksi tersebut:

- Browser meminta akses kamera jika belum diberikan.
- Aplikasi menyiapkan model hand tracking.
- Audio engine diinisialisasi atau diaktifkan setelah interaksi pengguna untuk mengikuti aturan autoplay browser.
- UI menampilkan progres dan status masing-masing proses.

Kegagalan kamera tidak boleh membuat seluruh halaman crash. Pengguna harus dapat mencoba mode mouse/keyboard atau membaca cara mengatasi masalah.

### Langkah 3 — Memilih instrumen

Pengguna memilih instrumen dari kategori atau menggunakan pencarian. Katalog harus membedakan:

- Instrumen yang metadata-nya tersedia.
- Instrumen yang preset suaranya tersedia dalam sound bank aktif.
- Instrumen tambahan yang membutuhkan sound pack lain.

Saat mengganti instrumen, aplikasi tidak seharusnya membangun ulang kamera atau menginisialisasi ulang seluruh engine audio tanpa kebutuhan teknis. Note aktif harus ditangani dengan benar sebelum perubahan program.

### Langkah 4 — Memainkan nada

Tangan terdeteksi dan pointer visual mengikuti posisi tangan. Gesture, misalnya pinch, memulai nada. Ketika gesture dilepas, nada dihentikan. Pergerakan pointer memilih note atau zona yang berbeda sesuai mode yang aktif.

Perilaku tepatnya perlu dikonfirmasi melalui prototipe dan pengujian pengguna. Sistem harus konsisten, dapat dijelaskan, dan tidak memicu note berulang hanya karena landmark sedikit bergetar.

### Langkah 5 — Mengubah kontrol musik

Pengguna dapat mengubah instrumen, oktaf, root/key, skala, volume, dan sensitivitas tanpa meninggalkan sesi. UI menunjukkan nilai yang sedang aktif.

### Langkah 6 — Mengakhiri sesi

Ketika pengguna menekan **Berhenti**, aplikasi harus:

- Mengirim note-off/all-notes-off untuk nada aktif.
- Menghentikan loop tracking.
- Menghentikan track kamera jika sesi selesai.
- Melepas listener dan resource yang tidak lagi diperlukan.
- Memperbarui status UI menjadi berhenti.

Tidak boleh ada kamera aktif atau suara yang terus berbunyi secara tidak sengaja setelah sesi dihentikan.

---

## 7. Sistem Instrumen

### 7.1 General MIDI sebagai katalog dasar

Proyek menargetkan 128 program instrumen General MIDI Level 1. Kategori standarnya meliputi:

| Kelompok | Contoh suara | Program GM yang ditampilkan dalam daftar standar |
|---|---|---:|
| Piano | Acoustic Grand, Bright Piano, Electric Piano, Harpsichord | 1–8 |
| Chromatic Percussion | Celesta, Glockenspiel, Vibraphone, Marimba | 9–16 |
| Organ | Drawbar, Percussive, Rock, Church Organ, Accordion | 17–24 |
| Guitar | Gitar akustik, clean, muted, overdriven, distortion | 25–32 |
| Bass | Acoustic, finger, pick, fretless, slap, synth bass | 33–40 |
| Strings | Violin, Viola, Cello, Contrabass, Harp, Timpani | 41–48 |
| Ensemble | String Ensemble, SynthStrings, Choir, Orchestra Hit | 49–56 |
| Brass | Trumpet, Trombone, Tuba, French Horn, Brass Section | 57–64 |
| Reed | Saxophone, Oboe, English Horn, Bassoon, Clarinet | 65–72 |
| Pipe | Piccolo, Flute, Recorder, Pan Flute, Ocarina | 73–80 |
| Synth Lead | Berbagai karakter lead synthesizer | 81–88 |
| Synth Pad | Pad atmosferik, choir pad, metallic, sweep | 89–96 |
| Synth Effects | Rain, soundtrack, crystal, atmosphere, sci-fi | 97–104 |
| Ethnic | Sitar, Banjo, Shamisen, Koto, Kalimba, Bag Pipe | 105–112 |
| Percussive | Tinkle Bell, Agogo, Steel Drums, Taiko, Synth Drum | 113–120 |
| Sound Effects | Fret noise, breath, seashore, bird, telephone, applause | 121–128 |

Tabel di atas mengadopsi nomor preset yang lazim ditampilkan mulai dari 1. Di kode, program General MIDI biasanya direpresentasikan dengan nomor **0–127**. Konversi tampilan dan nomor internal harus dilakukan secara konsisten di satu tempat.

### 7.2 Perbedaan katalog dan suara aktual

Daftar 128 nama bukanlah 128 rekaman audio. Kualitas dan kelengkapan suara bergantung pada SoundFont atau sound bank yang digunakan oleh synthesizer. Sebuah preset bisa terdaftar di katalog namun tidak mempunyai suara yang tepat dalam bank yang aktif.

Karena itu, sistem harus:

- Memakai sound bank GM yang dipilih dan lisensinya telah diverifikasi.
- Menguji beberapa preset dari seluruh keluarga instrumen.
- Memetakan program number secara benar.
- Menyediakan status ketersediaan preset.
- Menampilkan error atau fallback yang jelas saat preset tidak ditemukan.
- Tidak mengklaim dukungan penuh hanya berdasarkan banyaknya nama di UI.

### 7.3 Instrumen tambahan

Arsitektur harus dapat mendukung sound pack ekstra yang bukan bagian dari 128 preset GM standar, misalnya variasi piano, gitar, string, perkusi, instrumen etnik tertentu, atau suara eksperimental. Setiap pack perlu memiliki ID, sumber, versi, format, ukuran, informasi lisensi, dan status ketersediaan.

Penambahan suara tidak boleh mengharuskan sistem tracking tangan diubah. Katalog instrumen dan engine audio bertanggung jawab untuk menghubungkan ID instrumen ke bank/program yang sesuai.

### 7.4 Mode drum

Mode drum adalah mode perkusi yang memicu suara seperti kick, snare, closed/open hi-hat, tom, crash cymbal, dan ride cymbal. Drum menggunakan pemetaan perkusi khusus pada bank/kanal yang sesuai, bukan dipetakan seperti melodi C–B.

Gerakan cepat dapat digunakan untuk memperkirakan velocity, tetapi perlu filter dan cooldown agar satu gerakan tidak menghasilkan rentetan hit yang tidak disengaja.

---

## 8. Sistem Nada dan Teori Musik

### 8.1 Nada kromatis

Nada dasar yang biasa digunakan dalam notasi Barat ialah C, D, E, F, G, A, dan B. Dalam satu oktaf terdapat 12 posisi semiton jika sharp/flat ikut dihitung:

- C
- C♯/D♭
- D
- D♯/E♭
- E
- F
- F♯/G♭
- G
- G♯/A♭
- A
- A♯/B♭
- B

Sharp (♯) menunjukkan semiton di atas nada bernama; flat (♭) menunjukkan semiton di bawah nada bernama. Nama enharmonik seperti C♯ dan D♭ umumnya merujuk ke tinggi suara yang sama dalam temperamen sama, meskipun penulisan musiknya dapat berbeda menurut konteks.

### 8.2 Oktaf dan rentang nada

Setiap nama nada dapat muncul pada oktaf berbeda. Rancangan default dapat menggunakan C3–B5 sebagai rentang awal yang dapat diatur, bukan sebagai batas permanen.

UI harus memperlihatkan rentang nada yang aktif dan menyediakan cara yang jelas untuk mengubah oktaf. Sistem internal memakai nomor note MIDI 0–127.

### 8.3 Skala musik

Target jenis skala awal:

- Chromatic.
- Major.
- Natural minor.
- Major pentatonic.
- Minor pentatonic.

Pengguna memilih root/key. Ketika *quantize to scale* aktif, nada hasil posisi gesture dipetakan ke note terdekat yang termasuk skala. Hal ini membantu pemula menghasilkan rangkaian nada yang terdengar lebih harmonis.

Mode kromatis tetap tersedia agar pengguna yang menginginkan akses ke semua semiton tidak dibatasi skala.

### 8.4 Polyphony dan chord

Dukungan chord berarti beberapa note dapat berbunyi bersamaan. Fitur ini perlu memastikan:

- Audio engine dan bank suara mendukung jumlah note yang diperlukan.
- Setiap note mempunyai pasangan note-off yang benar.
- Tracking satu tangan tidak menyebabkan suara tersangkut ketika tangan hilang.
- Event dari dua tangan yang berbeda tidak saling menghentikan note secara tidak sengaja.

Polyphony dan chord termasuk target pengembangan; tingkat dukungan aktual harus divalidasi di browser dan sound bank yang digunakan.

---

## 9. Sistem Gesture dan Computer Vision

### 9.1 Hand tracking

Model hand tracking menerima frame dari elemen video dan menghasilkan landmark tangan. Sistem tidak boleh mengikat aplikasi langsung pada struktur hasil library. Hasil model perlu diadaptasi ke tipe internal agar library dapat diganti tanpa mengubah seluruh UI.

Data yang digunakan bisa meliputi posisi jari, pergelangan, jarak antartitik, arah gerak, confidence, serta timestamp. Sistem tidak membutuhkan pengenalan identitas seseorang.

### 9.2 Gesture dasar

Gesture yang diusulkan untuk versi awal:

| Gesture | Aksi yang diusulkan |
|---|---|
| Pointer/posisi telunjuk | Memilih zona atau nada di area bermain |
| Pinch mulai | Mengirim note-on atau memulai aksi |
| Pinch dilepas | Mengirim note-off atau mengakhiri aksi |
| Gerakan cepat | Menghasilkan hit drum/aksen pada mode perkusi |
| Tangan hilang dari frame | Membersihkan note yang dimiliki tangan dan mengakhiri gesture aktif |

Mapping ini adalah model interaksi awal yang dapat disesuaikan setelah diuji. Jangan menambahkan terlalu banyak gesture rumit sebelum kontrol dasar terasa stabil.

### 9.3 Stabilitas gesture

Tracking real-time dapat menghasilkan jitter atau perubahan confidence. Untuk mencegah suara berulang atau nada tidak sengaja:

- Terapkan smoothing yang wajar pada posisi landmark.
- Gunakan confidence threshold.
- Gunakan hysteresis untuk membedakan ambang mulai dan lepas gesture.
- Gunakan debounce/cooldown pada gesture yang bersifat satu kali.
- Hindari mengirim note-on berulang saat jari tetap di zona yang sama.
- Catat note aktif berdasarkan identitas tangan dan nomor note.
- Lepaskan note bila tangan hilang atau sesi berhenti.

Parameter tuning harus terkonsentrasi dalam konfigurasi dan diuji, bukan tersebar sebagai angka tetap di banyak file.

### 9.4 Satu atau dua tangan

MVP dapat memulai dari satu tangan untuk mengurangi kompleksitas. Desain tipe event dan pengelolaan note harus menyediakan identitas tangan agar dua tangan dapat ditambahkan tanpa menulis ulang seluruh audio engine.

Mode dua tangan baru dianggap siap setelah input dua tangan diuji dalam kondisi kamera dan pencahayaan yang realistis.

---

## 10. Mesin Audio

### 10.1 Tanggung jawab

Mesin audio bertanggung jawab untuk:

- Memuat sound bank.
- Memilih program instrumen.
- Mengirim note-on dan note-off.
- Mengatur velocity, master volume, dan kontrol yang didukung engine.
- Mengelola polyphony dan kanal.
- Menjalankan mode perkusi sesuai mapping.
- Menangani loading/error dan melepaskan resource ketika sesi selesai.

### 10.2 Adapter mesin audio

UI dan gesture interpreter tidak boleh memanggil library synthesizer secara langsung. Gunakan interface internal seperti `InstrumentEngine`, dengan method yang sejenis `initialize`, `loadSoundBank`, `selectInstrument`, `noteOn`, `noteOff`, `setVolume`, `allNotesOff`, dan `dispose`.

Nama method di atas adalah kontrak konsep. Implementasi aktual menyesuaikan API library yang dipilih.

### 10.3 Inisialisasi audio

Browser dapat membatasi pemutaran audio otomatis. Karena itu, engine perlu diaktifkan setelah interaksi pengguna, misalnya klik **Mulai Bermain** atau **Tes Suara**. UI harus menjelaskan jika pengguna perlu menekan tombol untuk mengaktifkan audio.

### 10.4 Efek suara

Volume adalah kontrol dasar. Efek seperti reverb, delay, filter, sustain, atau efek lain dapat ditambahkan bertahap jika engine dan struktur audio mendukungnya. Efek tidak boleh mengorbankan respons utama atau menyebabkan beban berlebihan.

### 10.5 Latensi dan lifecycle

- Jangan membuat ulang audio engine pada setiap render UI.
- Hindari memuat semua sound bank pada startup.
- Tampilkan proses loading bila bank besar memerlukan waktu.
- Pastikan seluruh note aktif dilepas saat stop, error, perubahan mode, atau kehilangan tangan.
- Uji suara nyata dari berbagai keluarga GM, bukan hanya melakukan smoke test pada satu piano.

---

## 11. UI dan Pengalaman Pengguna

Antarmuka harus menonjolkan area bermain musik. Panel konfigurasi perlu tersedia tetapi tidak boleh menguasai seluruh layar.

### 11.1 Bagian antarmuka yang diharapkan

1. **Header/brand area:** nama aplikasi dan status sesi.
2. **Area kamera:** preview, pointer/landmark overlay, serta indikator tracking.
3. **Area instrument picker:** kategori, daftar instrumen, pencarian, dan status preset.
4. **Area bermain:** zona nada, keyboard virtual, atau layout gesture yang sesuai mode.
5. **Kontrol musik:** oktaf, root/key, skala, volume, sensitivitas, mode bermain.
6. **Status area:** izin kamera, status model, status audio, sound bank, serta pesan error/loading.
7. **Tutorial ringkas:** petunjuk untuk memulai dan memainkan note pertama.
8. **Kontrol alternatif:** mouse/keyboard untuk pengujian atau tanpa kamera.

Detail layout final ditetapkan saat implementasi UI, namun hierarki informasi dan fungsi utama harus dipertahankan.

### 11.2 Status yang harus terlihat

- Kamera belum dimulai.
- Kamera sedang meminta izin.
- Kamera aktif.
- Model hand tracking sedang dimuat.
- Tangan terdeteksi/tidak terdeteksi.
- Audio belum diaktifkan.
- Audio aktif.
- Sound bank sedang dimuat/siap/gagal.
- Instrumen dipilih dan status presetnya.
- Error yang perlu tindakan pengguna.

### 11.3 Visual feedback

Feedback visual harus membantu pengguna memahami hubungan antara tangan dan suara:

- Pointer bergerak mengikuti titik kontrol tangan.
- Zona atau note aktif diberi penanda.
- Nama note dapat ditampilkan ketika dimainkan.
- Mode drum menunjukkan zona yang terpukul.
- Status tracking tidak boleh menutupi area bermain.

### 11.4 Desain responsif

Desktop/laptop dengan webcam adalah target prioritas. Tablet dan perangkat mobile dapat didukung sepanjang kamera, ukuran layar, browser, dan performanya memadai. Jika layar terlalu sempit untuk kontrol lengkap, gunakan panel yang dapat dilipat tanpa menghilangkan status penting.

### 11.5 Aksesibilitas

- Semua kontrol penting bisa difokuskan menggunakan keyboard.
- Tombol memiliki label yang dapat dipahami.
- Status tidak hanya dibedakan melalui warna.
- Ada alternatif mouse/keyboard untuk mencoba suara.
- Pesan izin kamera, loading, dan error ditulis dengan jelas.
- Hindari animasi berat atau berkilat yang mengganggu pengguna.

---

## 12. Teknologi dan Arsitektur Produk

Arsitektur teknis terperinci berada dalam `arsitektur.md`. Dokumen produk ini menjelaskan peran teknologi di tingkat konsep.

| Komponen | Peran yang direncanakan |
|---|---|
| React | UI dan komponen interaktif |
| Vite | Development server dan build frontend |
| TypeScript | Tipe untuk event gesture, note, katalog, dan audio adapter |
| Tailwind CSS | Styling dan layout responsif |
| MediaPipe Hand Landmarker | Deteksi landmark tangan dari kamera |
| Audio engine berbasis Web Audio | Menghasilkan audio di browser |
| SoundFont GM | Data suara untuk banyak preset instrumen |
| Vercel | Hosting dan delivery frontend |
| LocalStorage (opsional) | Preferensi sederhana di browser |

Pilihan audio engine awal yang perlu dibuktikan lewat prototipe adalah SpessaSynth dengan SoundFont yang lisensinya sesuai. Engine lain boleh dievaluasi bila memberi kompatibilitas, kualitas, performa, atau pemeliharaan yang lebih baik. Jangan mengubah teknologi tanpa alasan yang jelas, tetapi jangan memaksakan pilihan awal jika prototipe membuktikan tidak layak.

### Pembagian tanggung jawab

- **Camera Service:** akses dan lifecycle kamera.
- **Hand Tracking Service:** mengubah frame video menjadi landmark internal.
- **Gesture Interpreter:** mengubah landmark menjadi gesture event.
- **Note Mapper:** menerjemahkan posisi/gesture ke note MIDI, skala, dan zona.
- **Instrument Catalog:** metadata program GM dan sound pack tambahan.
- **Instrument Engine:** memainkan suara dan mengelola sound bank.
- **UI Layer:** menampilkan status dan menyediakan kontrol.
- **Storage:** menyimpan preferensi lokal bila diperlukan.

Modul-modul berkomunikasi melalui kontrak yang jelas. UI tidak seharusnya mengurus inferensi model atau detail program MIDI secara langsung.

---

## 13. Deploy dan Operasional di Vercel

Proyek direncanakan sebagai frontend browser-first, sehingga fungsi dasar tidak membutuhkan server backend khusus.

### Prinsip deployment

- Build aplikasi sebagai frontend statis.
- Pastikan output build dan asset path cocok dengan konfigurasi Vercel.
- Uji aplikasi di Preview Deployment dengan HTTPS sebelum production.
- Akses kamera baru dimulai setelah tindakan pengguna dan izin browser diberikan.
- Tangani kegagalan load model dan SoundFont dengan pesan yang jelas.
- Jangan menganggap file audio besar cocok dimasukkan seluruhnya ke bundle atau repository tanpa mengukur ukuran dan memeriksa limit hosting.
- Jika sound bank terlalu besar, evaluasi hosting aset terpisah/CDN yang mendukung CORS dan caching.
- Variabel dengan prefiks `VITE_` merupakan konfigurasi yang dapat terlihat oleh browser, jadi jangan simpan rahasia di dalamnya.

### Mengapa pendekatan browser-first

- Tidak memerlukan proses server yang terus hidup untuk melakukan tracking dan menghasilkan suara.
- Kamera dapat diproses pada perangkat pengguna.
- Infrastruktur lebih sederhana untuk deployment awal.
- Core app dapat digunakan tanpa akun, database, atau login.

### Risiko deployment

- Ukuran sound bank dan model tracking.
- Kebijakan browser tentang akses kamera dan audio.
- CORS bila aset suara disajikan dari origin lain.
- Variasi performa antardevice.
- Ketergantungan pada koneksi ketika model atau sound bank belum tersimpan lokal/cache.

---

## 14. Privasi dan Keamanan

Privasi adalah bagian dari desain produk, bukan tambahan di akhir.

- Minta akses kamera ketika pengguna memulai sesi.
- Tampilkan indikator yang jelas saat kamera berjalan.
- Berikan tombol stop yang menghentikan media stream.
- Proses frame kamera secara lokal secara default.
- Jangan upload atau menyimpan frame kamera tanpa fitur eksplisit, alasan yang jelas, dan persetujuan yang sesuai.
- Jangan mengidentifikasi wajah atau identitas personal; proyek membutuhkan landmark tangan untuk kontrol musik, bukan identifikasi pengguna.
- Jangan menyimpan landmark sebagai profil biometrik.
- Simpan preferensi lokal yang tidak sensitif saja, misalnya instrumen terakhir dan skala.
- Jangan menaruh secret, token API, atau kredensial di source frontend.
- Verifikasi lisensi sound bank, sample, model, font, icon, dan aset lain sebelum redistribusi publik.

---

## 15. Performa dan Kualitas

Kualitas produk bergantung pada tiga bagian yang berjalan beriringan: tracking, pemetaan gesture, dan audio. Mengoptimalkan satu bagian saja tidak cukup jika dua lainnya tersendat.

### Sasaran kualitas

- Gesture menghasilkan suara yang terasa responsif.
- UI tetap dapat digunakan ketika tracking berjalan.
- Jitter tidak menghasilkan note yang terus menyala dan mati.
- Tidak ada suara yang tersangkut setelah tangan hilang atau sesi berhenti.
- Pengguna dapat mengganti instrumen tanpa memulai ulang kamera.
- Startup tidak dipenuhi loading semua bank suara yang belum digunakan.
- Aplikasi memberi feedback saat proses memuat dan saat terjadi kegagalan.

### Strategi implementasi

- Batasi resolusi/frame rate tracking sesuai kebutuhan.
- Hindari membuat React render penuh pada setiap frame.
- Terapkan smoothing dan confidence threshold.
- Pisahkan inference ke worker bila terbukti diperlukan dan runtime/model mendukungnya.
- Lazy-load SoundFont dan aset tambahan.
- Pertahankan engine aktif selama sesi bila aman.
- Uji pada lebih dari satu kelas perangkat.

Angka target latency/FPS harus ditentukan berdasarkan pengukuran prototipe pada perangkat uji yang nyata. Jangan menyatakan target telah tercapai tanpa pengukuran.

---

## 16. Error Handling dan Recovery

Semua jalur penting perlu mempunyai status dan cara pulih yang jelas.

| Kondisi | Respons yang diharapkan |
|---|---|
| Pengguna menolak kamera | Jelaskan cara memberi izin; tetap sediakan uji suara mouse/keyboard |
| Kamera tidak tersedia | Tampilkan pesan; jangan crash; gunakan input alternatif |
| Kamera terputus saat sesi | Hentikan note aktif dan ubah status sesi |
| Model tracking gagal dimuat | Tampilkan error dan tombol coba lagi bila aman |
| Tidak ada tangan terdeteksi | Tampilkan panduan posisi/pencahayaan tanpa menganggapnya sebagai crash |
| Audio belum aktif | Minta interaksi pengguna untuk mengaktifkan audio |
| SoundFont gagal dimuat | Pertahankan UI; tampilkan status preset tidak tersedia dan opsi retry |
| Preset tidak ditemukan | Jangan berpura-pura suara sudah aktif; beri fallback/penjelasan |
| Tangan hilang saat note aktif | Kirim note-off untuk semua note milik tangan tersebut |
| Pengguna menghentikan sesi | Hentikan kamera, tracking, dan note aktif dengan benar |
| Asset gagal dari CDN | Beri pesan yang dapat dimengerti; logging tidak boleh memuat rahasia |

---

## 17. Roadmap Produk

Roadmap adalah urutan yang disarankan. Detail dapat diubah berdasarkan hasil implementasi, tetapi urutan inti bertujuan mengurangi risiko lebih awal.

### Phase 0 — Fondasi repository

- Bootstrap React + Vite + TypeScript.
- Konfigurasi lint, typecheck, dan build.
- Buat layout awal serta halaman status.
- Deploy placeholder ke Vercel.

**Kriteria selesai:** build berjalan lokal dan deploy preview berhasil.

### Phase 1 — Proof of concept audio

- Pilih sound bank GM yang sah dan sesuai ukuran.
- Integrasikan audio engine melalui adapter.
- Implementasikan tombol aktifkan audio, pilihan preset, note-on/note-off, volume, dan all-notes-off.
- Verifikasi beberapa keluarga preset dan satu mapping drum.

**Kriteria selesai:** suara nyata dapat dimainkan dan dihentikan tanpa kamera.

### Phase 2 — Proof of concept kamera

- Minta izin kamera dan tampilkan preview.
- Integrasikan hand tracking.
- Tampilkan pointer/landmark dan status tracking.
- Tangani cleanup, izin ditolak, dan kamera hilang.

**Kriteria selesai:** landmark terlihat stabil dan kamera dapat dihentikan dengan benar.

### Phase 3 — Gesture-to-note

- Implementasikan pointer, pinch start/end, dan note mapper.
- Hubungkan gesture ke audio engine.
- Buat mode air instrument melodis pertama.
- Tambahkan smoothing, hysteresis, hand-lost cleanup, dan input alternatif.

**Kriteria selesai:** pengguna dapat memainkan melodi sederhana melalui gerakan tangan tanpa note tersangkut.

### Phase 4 — Katalog dan kontrol musik

- Masukkan metadata 128 program GM.
- Tambahkan pencarian/filter kategori dan status ketersediaan.
- Tambahkan rentang oktaf, root/key, dan skala.
- Tambahkan lazy loading dan progress aset.

**Kriteria selesai:** katalog berfungsi dan ketersediaan suara dicerminkan dengan benar.

### Phase 5 — Drum, polyphony, dan polish UX

- Tambahkan drum mode.
- Kembangkan dukungan beberapa note/chord serta, jika siap, dua tangan.
- Tambahkan tutorial singkat, kontrol sensitivitas, dan feedback note.
- Perbaiki responsivitas dan aksesibilitas.

**Kriteria selesai:** kontrol yang lebih lanjut lolos uji fungsi dan cleanup.

### Phase 6 — Hardening dan rilis

- Uji browser dan perangkat sasaran.
- Ukur startup, audio response, tracking, dan penggunaan memori.
- Audit dependency dan lisensi aset.
- Lengkapi README, `THIRD_PARTY_NOTICES.md`, dan panduan penggunaan.
- Jalankan build production dan uji Preview Deployment.

**Kriteria selesai:** fitur yang dirilis lolos acceptance criteria dan batasan yang tersisa didokumentasikan.

---

## 18. Kriteria Penerimaan Produk

### Fungsi inti

- Pengguna dapat membuka aplikasi dari deployment HTTPS.
- Pengguna dapat memilih untuk memulai dan menghentikan kamera.
- Aplikasi memperlihatkan status izin, tracking, audio, dan loading.
- Tangan yang terdeteksi dapat mengontrol pointer/gesture.
- Gesture yang ditentukan dapat memicu note-on dan note-off.
- Instrumen yang didukung oleh sound bank menghasilkan suara yang sesuai dengan program yang dipilih.
- Volume dapat diatur.
- Nada dilepas ketika gesture berakhir, tangan hilang, sesi berhenti, atau terjadi error kritis.
- Kontrol alternatif memungkinkan pengujian suara tanpa kamera.

### Katalog instrumen

- Metadata program GM 0–127 tersedia dan konsisten.
- Perbedaan indeks program MIDI dan nomor tampilan tidak menghasilkan off-by-one.
- Status preset menggambarkan ketersediaan aktual dalam bank.
- Minimal beberapa keluarga suara diuji nyata saat integrasi awal; sebelum menyatakan katalog lengkap siap, cakupan bank dan mapping perlu diverifikasi.
- Sound pack tambahan memiliki catatan lisensi dan sumber.

### Kualitas dan deployment

- Lint/typecheck/test/build yang tersedia dijalankan dan hasilnya dilaporkan secara akurat.
- Tidak ada error console penting yang diketahui dan dibiarkan tanpa catatan.
- Asset model dan sound bank tidak 404 di deployment target.
- Kamera, audio, dan cleanup diuji melalui HTTPS.
- Tidak ada secret atau aset pihak ketiga yang hak redistribusinya tidak jelas.
- Dokumentasi penggunaan dan keterbatasan diperbarui.

---

## 19. Risiko Utama dan Strategi Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Sound bank besar | Loading lama atau batas hosting terlampaui | Pilih bank yang sesuai, ukur ukuran, lazy-load, evaluasi hosting aset terpisah |
| SoundFont tidak lengkap | Sebagian preset tidak terdengar sesuai | Audit preset bank dan tandai ketersediaan aktual |
| Lisensi sound pack tidak cocok | Risiko legal saat rilis publik | Verifikasi redistribusi dan atribusi sebelum memasukkan aset |
| Gesture jitter | Note berulang dan pengalaman buruk | Smoothing, hysteresis, confidence threshold, cooldown |
| Note tersangkut | Suara terus berjalan | Pelacakan note aktif dan cleanup pada semua jalur stop/error |
| Main thread tersendat | Tracking/UI menjadi lag | Hindari render per frame, profil performa, gunakan worker bila sesuai |
| Keterlambatan audio | Sulit memainkan musik langsung | Ukur latensi, minimalkan loading saat bermain, optimalkan audio graph |
| Izin kamera ditolak | Fitur utama tidak dapat dipakai | Jelaskan izin dan sediakan mouse/keyboard fallback |
| API/browser berbeda | Perilaku tidak konsisten | Uji browser target dan tangani fitur yang tidak didukung |
| Asset eksternal/CORS | Model atau suara gagal dimuat | Uji origin, CORS, caching, versioning, dan fallback error |

---

## 20. Metrik Evaluasi

Gunakan metrik untuk menilai apakah pengalaman inti benar-benar berfungsi. Data yang dikumpulkan untuk evaluasi harus meminimalkan privasi dan tidak memerlukan penyimpanan frame kamera.

### Metrik teknis

- Persentase build dan test yang berhasil.
- Waktu dari menekan Mulai sampai kamera/model siap.
- Waktu dari memilih instrumen sampai bank siap.
- Respons gesture-ke-audio berdasarkan pengukuran perangkat uji.
- Jumlah note tersangkut atau note-on duplikat selama sesi uji.
- Keberhasilan pemuatan preset lintas keluarga GM.
- Penggunaan CPU/memori pada perangkat uji.

### Metrik pengalaman

- Apakah pengguna dapat memainkan note pertama tanpa bantuan.
- Apakah pengguna memahami cara memulai/melepas note.
- Apakah pengguna berhasil mengganti instrumen.
- Apakah pesan error membantu pengguna pulih.
- Apakah kontrol tetap mudah digunakan pada ukuran layar yang berbeda.

Jangan mengklaim metrik tertentu telah dicapai sebelum benar-benar diukur. Untuk versi pertama, observasi manual dan checklist pengujian sudah cukup sebagai baseline.

---

## 21. Keputusan yang Masih Bisa Disesuaikan

Keputusan berikut tidak perlu menghambat bootstrap, tetapi perlu divalidasi selama prototipe:

- Nama/brand final aplikasi.
- Layout final area bermain dan pemilih instrumen.
- Apakah pinch dipakai untuk semua instrumen melodis atau beberapa mode memiliki gesture khusus.
- Apakah default memakai satu tangan atau langsung dua tangan.
- SoundFont GM spesifik yang akan dipakai, berdasarkan lisensi, ukuran, kualitas, dan dukungan preset.
- Apakah audio engine awal tetap menggunakan SpessaSynth atau diganti setelah pengujian.
- Rentang oktaf default dan jenis skala yang ditampilkan pertama kali.
- Apakah fitur metronom, recording, loop, atau ekspor MIDI masuk rilis awal.
- Cara terbaik menyimpan/mendistribusikan sound bank besar di lingkungan Vercel.

Claude Code atau developer boleh membuat keputusan teknis reversibel tanpa menunggu konfirmasi untuk detail kecil. Untuk keputusan yang berdampak besar terhadap lisensi, biaya, privasi, hosting, atau perubahan data eksternal, lakukan pemeriksaan yang tepat sebelum bertindak.

---

## 22. Panduan untuk Claude Code dan Contributor

- Baca dokumen ini sebelum menambah fitur produk yang besar.
- Baca `arsitektur.md` untuk kontrak modul, struktur folder, serta rancangan deployment yang lebih teknis.
- Baca `CLAUDE.md` untuk aturan kerja, delegasi, penggunaan skill/agent, keamanan, dan standar verifikasi.
- Jika implementasi yang ada berbeda dari spesifikasi ini, inspeksi kode dan test terlebih dahulu. Jangan menganggap dokumen lebih akurat daripada implementasi tanpa memeriksa alasannya.
- Bedakan fitur **sudah tersedia**, **sedang dikerjakan**, **direncanakan**, dan **belum didukung** dalam laporan.
- Perbarui dokumen apabila scope atau keputusan produk berubah secara nyata.
- Jangan menambah akun, database, analytics, atau backend hanya karena umum digunakan; core experience dirancang browser-first.
- Jangan memasukkan SoundFont/sample yang tidak jelas lisensinya.
- Jalankan build/test yang tersedia dan laporkan hasil asli sebelum menyatakan tugas selesai.

---

## 23. Hubungan dengan Dokumen Lain

| File | Tujuan |
|---|---|
| `PROJECT.md` | Definisi produk, tujuan, fitur, alur pengguna, scope, roadmap, acceptance criteria |
| `arsitektur.md` | Desain teknis, modul, alur data, struktur folder, deployment, dan detail implementasi |
| `CLAUDE.md` | Instruksi perilaku Claude Code, otonomi, skills/agents, keamanan, dan verifikasi |
| `README.md` | Cara mengenal, memasang, menjalankan, menguji, serta deploy aplikasi |
| `ROADMAP.md` (opsional) | Status milestone terkini bila tracking memerlukan file khusus |
| `THIRD_PARTY_NOTICES.md` (bila memakai aset eksternal) | Sumber, lisensi, dan atribusi library, model, SoundFont, sample, dan aset lain |

Dokumen ini menjelaskan **produk yang ingin dibangun**. Dokumen arsitektur menjelaskan **bagaimana sistem dirancang untuk membangunnya**. Keduanya saling melengkapi dan tidak menggantikan implementasi maupun hasil pengujian.

---

## 24. Ringkasan Singkat

Proyek ini merupakan aplikasi musik virtual berbasis web yang menggunakan webcam untuk mendeteksi gerakan tangan dan mengubahnya menjadi interaksi musik real-time. Aplikasi direncanakan memakai React, Vite, TypeScript, MediaPipe Hand Landmarker, mesin audio berbasis Web Audio, serta SoundFont untuk memainkan instrumen. Katalog dasar menargetkan 128 program General MIDI dan dapat diperluas dengan sound pack tambahan. Mode melodis memetakan gesture ke nada dan mode drum memetakan gesture ke perkusi. Aplikasi mengutamakan pemrosesan lokal, feedback visual yang jelas, kontrol alternatif tanpa kamera, penanganan note-off/cleanup yang benar, dan deployment frontend di Vercel.

**Definisi keberhasilan yang paling penting:** pengguna membuka aplikasi, memulai sesi, memilih instrumen, menggerakkan tangan, mendengar suara yang sesuai, memahami apa yang sedang dikontrol, lalu dapat menghentikan sesi tanpa suara atau kamera yang tertinggal aktif.
