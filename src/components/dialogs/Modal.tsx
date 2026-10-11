import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

/** Dialog modal berbasis <dialog> native (fokus terkunci, Esc menutup). */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="modal-title"
      className="m-auto w-[min(640px,calc(100vw-2rem))] rounded-2xl border border-stage-600 bg-stage-850 p-0 text-ink shadow-2xl backdrop:bg-stage-950/70 backdrop:backdrop-blur-sm"
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <header className="flex items-center justify-between border-b border-stage-700 px-5 py-4">
            <h2 id="modal-title" className="text-base font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-ink-muted hover:bg-stage-700 hover:text-ink"
              aria-label="Tutup"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </header>
          <div className="scrollbar-thin overflow-y-auto px-5 py-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}
