import { useApp, useController } from "../../app/context";
import { Modal } from "./Modal";

const CREDITS = [
  {
    name: "GeneralUser GS v2.0.3",
    by: "S. Christian Collins",
    license: "GeneralUser GS License v2.0 (bebas dipakai, dimodifikasi, dan didistribusikan ulang)",
    url: "https://www.schristiancollins.com/generaluser",
    note: "Dikonversi ke SF3 (Ogg Vorbis) untuk memperkecil ukuran unduhan.",
  },
  {
    name: "MediaPipe Hand Landmarker (model & Tasks Vision)",
    by: "Google",
    license: "Apache License 2.0",
    url: "https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker",
  },
  {
    name: "spessasynth_lib / spessasynth_core",
    by: "Spessasus",
    license: "Apache License 2.0",
    url: "https://github.com/spessasus/spessasynth_lib",
  },
  { name: "React", by: "Meta Platforms, Inc.", license: "MIT", url: "https://react.dev" },
  { name: "Lucide Icons", by: "Lucide Contributors", license: "ISC", url: "https://lucide.dev" },
  { name: "Tailwind CSS", by: "Tailwind Labs", license: "MIT", url: "https://tailwindcss.com" },
];

export function AboutDialog() {
  const controller = useController();
  const open = useApp((s) => s.aboutOpen);
  return (
    <Modal open={open} onClose={() => controller.openAbout(false)} title="Tentang, privasi & lisensi">
      <div className="space-y-4 text-sm text-ink-muted">
        <section>
          <h3 className="mb-1 font-semibold text-ink">Privasi</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Kamera hanya aktif setelah Anda menekan “Mulai Bermain” dan dapat dihentikan kapan saja.</li>
            <li>
              Frame video diproses di browser Anda oleh MediaPipe. Tidak ada gambar, video, atau landmark yang diunggah
              atau disimpan.
            </li>
            <li>Yang disimpan hanya preferensi (instrumen, skala, efek, preset) di localStorage perangkat ini.</li>
            <li>Sound pack yang Anda muat dibaca lokal dan tidak dikirim ke mana pun.</li>
          </ul>
        </section>
        <section>
          <h3 className="mb-1 font-semibold text-ink">Aset & pustaka pihak ketiga</h3>
          <ul className="space-y-2">
            {CREDITS.map((c) => (
              <li key={c.name} className="rounded-xl bg-stage-900 p-3">
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-medium text-ink underline-offset-2 hover:underline"
                >
                  {c.name}
                </a>
                <p className="text-xs">
                  {c.by} · {c.license}
                </p>
                {c.note && <p className="text-xs text-ink-faint">{c.note}</p>}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-faint">Rincian lengkap ada di THIRD_PARTY_NOTICES.md pada repository.</p>
        </section>
        <section>
          <h3 className="mb-1 font-semibold text-ink">Catatan</h3>
          <p className="text-xs">
            General MIDI adalah standar penomoran program. Kualitas tiap suara bergantung pada sound bank yang aktif.
            SoundFont® adalah merek dagang Creative Technology Ltd.
          </p>
        </section>
      </div>
    </Modal>
  );
}
