import { DEFAULT_SETTINGS, type AppSettings } from "../config/app-settings";
import { buildCatalog, type InstrumentCatalog } from "../features/instruments/catalog";
import type { LooperSnapshot } from "../features/recording/looper";
import type { EngineStatus, SoundBankStatus } from "../services/audio/InstrumentEngine";
import type { CameraErrorKind } from "../services/camera/camera-errors";
import type { UserPreset } from "../services/storage/settings-storage";

export type SessionStatus = "idle" | "starting" | "running" | "stopping";
export type CameraStatus = "off" | "requesting" | "active" | "error";
export type TrackerStatus = "idle" | "loading" | "ready" | "error";

export interface Toast {
  id: number;
  message: string;
  kind: "info" | "warning" | "error" | "success";
}

export interface AppState {
  settings: AppSettings;
  session: SessionStatus;
  camera: { status: CameraStatus; error?: string; errorKind?: CameraErrorKind; deviceId?: string };
  cameraDevices: { id: string; label: string }[];
  tracker: { status: TrackerStatus; error?: string };
  handsDetected: number;
  audio: { status: EngineStatus; error?: string };
  bank: { status: SoundBankStatus; progress: number; error?: string };
  userPack: { status: SoundBankStatus; name?: string; presetCount: number; error?: string };
  catalog: InstrumentCatalog;
  /** Note aktif kanal live (diperbarui saat note berubah, bukan per frame). */
  activeNotes: readonly number[];
  activeDrumNotes: readonly number[];
  looper: LooperSnapshot;
  presets: UserPreset[];
  tutorialOpen: boolean;
  tutorialProgress: { handSeen: boolean; pinched: boolean; noteFromGesture: boolean };
  aboutOpen: boolean;
  toasts: Toast[];
}

export function initialAppState(settings: AppSettings = DEFAULT_SETTINGS): AppState {
  return {
    settings,
    session: "idle",
    camera: { status: "off" },
    cameraDevices: [],
    tracker: { status: "idle" },
    handsDetected: 0,
    audio: { status: "idle" },
    bank: { status: "none", progress: 0 },
    userPack: { status: "none", presetCount: 0 },
    catalog: buildCatalog({ mainPresets: [] }),
    activeNotes: [],
    activeDrumNotes: [],
    looper: { state: "idle", loopLength: null, layers: [] },
    presets: [],
    tutorialOpen: false,
    tutorialProgress: { handSeen: false, pinched: false, noteFromGesture: false },
    aboutOpen: false,
    toasts: [],
  };
}
