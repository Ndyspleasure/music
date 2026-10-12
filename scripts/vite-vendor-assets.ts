import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Daftar aset runtime yang harus disajikan sebagai file statis (bukan di-bundle):
 * - file WASM MediaPipe Tasks Vision
 * - AudioWorklet processor SpessaSynth
 * Disalin dari node_modules ke public/vendor sehingga versi aset selalu sama
 * dengan versi paket di lockfile. Folder public/vendor diabaikan Git.
 */
const VENDOR_ASSETS: { from: string; to: string; filter?: (name: string) => boolean }[] = [
  {
    from: "node_modules/@mediapipe/tasks-vision/wasm",
    to: "public/vendor/mediapipe/wasm",
    filter: (name) => name.startsWith("vision_wasm_internal") || name.startsWith("vision_wasm_nosimd_internal"),
  },
  {
    from: "node_modules/spessasynth_lib/dist",
    to: "public/vendor/spessasynth",
    filter: (name) => name === "spessasynth_processor.min.js",
  },
];

export function copyVendorAssets(): void {
  for (const asset of VENDOR_ASSETS) {
    const from = join(root, asset.from);
    const to = join(root, asset.to);
    mkdirSync(to, { recursive: true });
    for (const name of readdirSync(from)) {
      if (asset.filter && !asset.filter(name)) continue;
      copyFileSync(join(from, name), join(to, name));
    }
  }
}

export function vendorAssets(): Plugin {
  return {
    name: "vendor-assets",
    // Hook `config` berjalan sebelum Vite memindai folder public. Bila disalin di `buildStart`,
    // `npm run dev` pertama setelah clone menyajikan 404 untuk WASM MediaPipe.
    config() {
      copyVendorAssets();
    },
  };
}
