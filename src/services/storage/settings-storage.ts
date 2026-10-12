import { sanitizeSettings, type AppSettings } from "../../config/app-settings";
import type { KeyValueStore } from "./local-store";

/**
 * Hanya preferensi non-sensitif yang disimpan (instrumen, skala, efek, dll.).
 * Tidak pernah menyimpan frame kamera, video, atau data landmark.
 */
const SETTINGS_KEY = "gestura.settings.v1";
const PRESETS_KEY = "gestura.presets.v1";
const MAX_PRESETS = 30;

export interface UserPreset {
  id: string;
  name: string;
  createdAt: number;
  settings: AppSettings;
}

/** Bagian setelan yang disimpan dalam preset pengguna (bukan setelan UI/tutorial). */
export type PresetSettings = Omit<AppSettings, "tutorialDone">;

export class SettingsStorage {
  private store: KeyValueStore;

  constructor(store: KeyValueStore) {
    this.store = store;
  }

  loadSettings(): AppSettings {
    return sanitizeSettings(parse(this.store.get(SETTINGS_KEY)));
  }

  saveSettings(settings: AppSettings): void {
    this.store.set(SETTINGS_KEY, JSON.stringify(settings));
  }

  loadPresets(): UserPreset[] {
    const raw = parse(this.store.get(PRESETS_KEY));
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
      .filter((p) => typeof p.id === "string" && typeof p.name === "string")
      .map((p) => ({
        id: String(p.id),
        name: String(p.name).slice(0, 60),
        createdAt: typeof p.createdAt === "number" ? p.createdAt : 0,
        settings: sanitizeSettings(p.settings),
      }))
      .slice(0, MAX_PRESETS);
  }

  savePreset(name: string, settings: AppSettings): UserPreset[] {
    const trimmed = name.trim().slice(0, 60) || "Preset tanpa nama";
    const preset: UserPreset = {
      id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      createdAt: Date.now(),
      settings,
    };
    const list = [preset, ...this.loadPresets().filter((p) => p.name !== trimmed)].slice(0, MAX_PRESETS);
    this.store.set(PRESETS_KEY, JSON.stringify(list));
    return list;
  }

  deletePreset(id: string): UserPreset[] {
    const list = this.loadPresets().filter((p) => p.id !== id);
    this.store.set(PRESETS_KEY, JSON.stringify(list));
    return list;
  }
}

function parse(raw: string | null): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
