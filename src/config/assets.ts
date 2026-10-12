/**
 * Lokasi aset runtime. Semua path relatif terhadap BASE_URL Vite agar tetap benar
 * di Vercel maupun bila aplikasi di-host pada sub-path.
 * VITE_* bersifat publik — tidak boleh berisi rahasia.
 */
const base = import.meta.env.BASE_URL;

function publicPath(path: string): string {
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

/**
 * Validasi URL aset dari konfigurasi: hanya path same-origin atau https://.
 * Pengguna tidak dapat memasukkan URL arbitrer (pack lokal dimuat lewat file picker).
 */
export function resolveAssetUrl(configured: string | undefined, fallback: string): string {
  const value = configured?.trim();
  if (!value) return publicPath(fallback);
  if (value.startsWith("/")) return publicPath(value);
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return url.toString();
  } catch {
    // jatuh ke fallback
  }
  console.warn(`URL aset tidak valid diabaikan: ${value}`);
  return publicPath(fallback);
}

export const ASSETS = {
  soundFontUrl: resolveAssetUrl(import.meta.env.VITE_SOUNDFONT_URL, "/soundfonts/GeneralUser-GS.sf3"),
  handModelUrl: resolveAssetUrl(import.meta.env.VITE_HAND_MODEL_URL, "/models/hand_landmarker.task"),
  mediapipeWasmBase: publicPath("/vendor/mediapipe/wasm"),
  spessaWorkletUrl: publicPath("/vendor/spessasynth/spessasynth_processor.min.js"),
  soundFontName: "GeneralUser GS v2.0.3",
} as const;

/** Sound pack pengguna dimuat dengan bank offset agar tidak menimpa preset GM. */
export const USER_PACK_BANK_OFFSET = 64;
export const USER_PACK_MAX_BYTES = 128 * 1024 * 1024;
export const USER_PACK_EXTENSIONS = [".sf2", ".sf3", ".sf4", ".dls"] as const;
