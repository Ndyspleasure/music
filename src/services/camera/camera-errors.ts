export type CameraErrorKind =
  | "permission-denied"
  | "not-found"
  | "in-use"
  | "overconstrained"
  | "insecure-context"
  | "unsupported"
  | "aborted"
  | "unknown";

export class CameraError extends Error {
  public readonly kind: CameraErrorKind;

  constructor(kind: CameraErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.kind = kind;
    this.name = "CameraError";
  }
}

const MESSAGES: Record<CameraErrorKind, string> = {
  "permission-denied":
    "Izin kamera ditolak. Klik ikon kamera/gembok di bilah alamat browser, izinkan kamera untuk situs ini, lalu tekan Mulai lagi. Anda tetap bisa bermain dengan mouse atau keyboard.",
  "not-found": "Kamera tidak ditemukan. Sambungkan webcam lalu coba lagi, atau mainkan dengan mouse/keyboard.",
  "in-use":
    "Kamera sedang dipakai aplikasi lain atau tidak dapat dibaca. Tutup aplikasi lain yang memakai kamera lalu coba lagi.",
  overconstrained: "Kamera tidak mendukung resolusi yang diminta. Coba pilih kamera lain.",
  "insecure-context": "Akses kamera membutuhkan HTTPS (atau localhost). Buka aplikasi melalui alamat https://.",
  unsupported:
    "Browser ini tidak mendukung akses kamera (getUserMedia). Gunakan Chrome, Edge, Firefox, atau Safari versi terbaru.",
  aborted: "Permintaan kamera dibatalkan.",
  unknown: "Kamera gagal dimulai karena kesalahan yang tidak diketahui.",
};

export function cameraErrorMessage(kind: CameraErrorKind): string {
  return MESSAGES[kind];
}

/** Terjemahkan error getUserMedia (DOMException) menjadi CameraError yang ramah pengguna. */
export function toCameraError(err: unknown): CameraError {
  if (err instanceof CameraError) return err;
  const name = typeof err === "object" && err !== null && "name" in err ? String((err as { name: unknown }).name) : "";
  let kind: CameraErrorKind;
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      kind = "permission-denied";
      break;
    case "NotFoundError":
    case "DevicesNotFoundError":
      kind = "not-found";
      break;
    case "NotReadableError":
    case "TrackStartError":
      kind = "in-use";
      break;
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      kind = "overconstrained";
      break;
    case "AbortError":
      kind = "aborted";
      break;
    default:
      kind = "unknown";
  }
  return new CameraError(kind, MESSAGES[kind], { cause: err });
}
