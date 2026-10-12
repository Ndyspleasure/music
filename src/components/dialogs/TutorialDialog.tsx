import { CheckCircle2, Circle } from "lucide-react";
import { useApp, useController } from "../../app/context";
import { cx } from "../../utils/cx";
import { Button } from "../ui/primitives";
import { Modal } from "./Modal";

/** Panduan interaktif: langkah tercentang otomatis saat pengguna melakukannya. */
export function TutorialDialog() {
  const controller = useController();
  const open = useApp((s) => s.tutorialOpen);
  const progress = useApp((s) => s.tutorialProgress);
  const session = useApp((s) => s.session);
  const audio = useApp((s) => s.audio.status);

  const steps = [
    {
      done: session === "running",
      title: "Mulai sesi",
      body: "Tekan “Mulai Bermain”, lalu izinkan kamera. Video hanya diproses di perangkat Anda.",
    },
    {
      done: progress.handSeen,
      title: "Tunjukkan tangan",
      body: "Angkat satu tangan sekitar 40–80 cm dari kamera, telapak menghadap kamera. Lingkaran pointer akan mengikuti ujung telunjuk.",
    },
    {
      done: progress.pinched,
      title: "Cubit untuk membunyikan",
      body: "Rapatkan ujung ibu jari dan telunjuk. Lingkaran mengecil lalu menyala kuning saat cubitan terbaca.",
    },
    {
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
          <li>Esc menghentikan semua bunyi kapan saja.</li>
        </ul>
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
