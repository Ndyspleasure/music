import { CheckCircle2, Circle } from "lucide-react";
import { useApp, useController } from "../../app/context";
import { cx } from "../../utils/cx";
import { HandGuide } from "../hand-guide/HandGuide";
import { Button, Toggle } from "../ui/primitives";
import { Modal } from "./Modal";

/** Panduan interaktif: langkah tercentang otomatis saat pengguna melakukannya. */
export function TutorialDialog() {
  const controller = useController();
  const open = useApp((s) => s.tutorialOpen);
  const progress = useApp((s) => s.tutorialProgress);
  const session = useApp((s) => s.session);
  const audio = useApp((s) => s.audio.status);
  const fingers = useApp((s) => s.settings.noteInput === "fingers");
  const showGuide = useApp((s) => s.settings.showHandGuide);

  const steps = [
    {
      done: session === "running",
      title: "Mulai sesi",
      body: "Tekan “Mulai Bermain”, lalu izinkan kamera. Video hanya diproses di perangkat Anda.",
    },
    {
      done: progress.handSeen,
      title: "Tunjukkan tangan",
      body: fingers
        ? "Angkat satu atau dua tangan sekitar 40–80 cm dari kamera, telapak menghadap kamera. Nama nada muncul di ujung tiap jari."
        : "Angkat satu tangan sekitar 40–80 cm dari kamera, telapak menghadap kamera. Lingkaran pointer akan mengikuti ujung telunjuk.",
    },
    fingers
      ? {
          done: progress.pinched,
          title: "Sentuhkan jari ke ibu jari",
          body: "Tempelkan ujung ibu jari ke ujung telunjuk, jari tengah, jari manis, atau kelingking. Label jari menyala kuning saat sentuhan terbaca.",
        }
      : {
          done: progress.pinched,
          title: "Cubit untuk membunyikan",
          body: "Rapatkan ujung ibu jari dan telunjuk. Lingkaran mengecil lalu menyala kuning saat cubitan terbaca.",
        },
    fingers
      ? {
          done: progress.noteFromGesture,
          title: "Mainkan melodi",
          body: "Tangan di sisi kiri layar: telunjuk→kelingking = Do Re Mi Fa. Tangan di sisi kanan layar: Sol La Si Do. Tangan tidak perlu berpindah — cukup ganti jari. Buka jari untuk berhenti.",
        }
      : {
          done: progress.noteFromGesture,
          title: "Mainkan melodi",
          body: "Sambil mencubit, geser tangan ke kiri–kanan untuk berpindah nada. Buka cubitan untuk berhenti.",
        },
    {
      done: false,
      title: "Jelajahi",
      body: "Ganti instrumen (128 program GM + variasi), coba mode Akor atau Drum, rekam loop, dan atur efek. Tanpa kamera? Pakai keyboard di layar atau tombol A–L di keyboard komputer.",
    },
  ];

  return (
    <Modal open={open} onClose={() => controller.openTutorial(false)} title="Cara bermain">
      <div className="mb-4 rounded-xl border border-stage-700 bg-stage-900 p-3">
        <HandGuide />
      </div>
      <ol className="flex flex-col gap-3">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className={cx("flex gap-3 rounded-xl border p-3", step.done ? "border-ok/40 bg-ok/5" : "border-stage-700")}
          >
            {step.done ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" aria-label="Selesai" />
            ) : (
              <Circle className="mt-0.5 h-5 w-5 shrink-0 text-ink-faint" aria-label="Belum" />
            )}
            <div>
              <p className="text-sm font-semibold">
                {i + 1}. {step.title}
              </p>
              <p className="mt-0.5 text-sm text-ink-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 rounded-xl bg-stage-900 p-3 text-xs text-ink-muted">
        <p className="mb-1 font-semibold text-ink">Tips</p>
        <ul className="list-disc space-y-1 pl-4">
          <li>Cahaya dari depan dan latar yang tidak ramai membuat deteksi jauh lebih stabil.</li>
          <li>Nada terasa melompat-lompat? Pilih sensitivitas “Stabil” di tab Gesture.</li>
          <li>Dua tangan bisa bermain bersamaan; tiap tangan memegang nadanya sendiri.</li>
          <li>
            Lebih suka memilih nada dengan posisi tangan? Ganti “Cara memilih nada” ke “Posisi tangan” di tab Musik.
          </li>
          <li>
            Jari manis sering ikut jari tengah. Saat menyentuh satu jari, biarkan jari lain tetap lurus dan agak
            renggang. Bilah kecil di bawah tiap label jari menunjukkan seberapa dekat jari itu ke ibu jari.
          </li>
          <li>Esc menghentikan semua bunyi kapan saja.</li>
        </ul>
      </div>
      <div className="mt-4">
        <Toggle
          label="Tampilkan panduan tangan di layar kamera"
          hint="Bisa juga dinyalakan/dimatikan lewat tombol “Panduan” di pojok kanan atas kamera."
          checked={showGuide}
          onChange={(showHandGuide) => controller.updateSettings({ showHandGuide })}
        />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        {audio !== "ready" && (
          <Button onClick={() => void controller.ensureAudio().catch(() => undefined)}>Tes suara</Button>
        )}
        <Button variant="primary" onClick={() => controller.openTutorial(false)}>
          Mengerti
        </Button>
      </div>
    </Modal>
  );
}
