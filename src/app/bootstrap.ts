import { ASSETS } from "../config/assets";
import { PerformanceController } from "../features/performance/performance-controller";
import { SpessaSynthEngine } from "../services/audio/SpessaSynthEngine";
import { CameraService } from "../services/camera/CameraService";
import { browserStore } from "../services/storage/local-store";
import { SettingsStorage } from "../services/storage/settings-storage";
import { MediaPipeHandTracker } from "../services/tracking/MediaPipeHandTracker";
import { initialAppState, type AppState } from "../state/app-state";
import { createStore } from "../state/create-store";
import type { AppContextValue } from "./context";

/** Satu instance controller/engine per halaman (tidak dibuat ulang per render React). */
export function bootstrap(): AppContextValue {
  const store = createStore<AppState>(initialAppState());
  const controller = new PerformanceController({
    store,
    engine: new SpessaSynthEngine({ workletUrl: ASSETS.spessaWorkletUrl }),
    camera: new CameraService(),
    createTracker: () =>
      new MediaPipeHandTracker({ wasmBasePath: ASSETS.mediapipeWasmBase, modelAssetPath: ASSETS.handModelUrl }),
    storage: new SettingsStorage(browserStore),
    soundFontUrl: ASSETS.soundFontUrl,
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") controller.handleVisibilityHidden();
  });
  window.addEventListener("pagehide", () => {
    controller.flushSettings();
    controller.panic();
  });

  // Hook debug opsional (?debug=1) untuk pengujian otomatis di browser nyata.
  if (new URLSearchParams(location.search).has("debug")) {
    Object.assign(window, { __gestura: { controller, store } });
  }
  return { controller, store };
}
