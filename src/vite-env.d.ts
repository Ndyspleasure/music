/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SOUNDFONT_URL?: string;
  readonly VITE_HAND_MODEL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
