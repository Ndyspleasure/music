import { useState, type ReactNode } from "react";
import { cx } from "../../utils/cx";
import { InstrumentPicker } from "../instrument-picker/InstrumentPicker";
import { EffectsPanel } from "../music-controls/EffectsPanel";
import { GestureSettings } from "../music-controls/GestureSettings";
import { LooperPanel } from "../music-controls/LooperPanel";
import { MusicControls } from "../music-controls/MusicControls";
import { PresetsPanel } from "../music-controls/PresetsPanel";

const TABS = [
  { id: "instrument", label: "Instrumen", render: () => <InstrumentPicker /> },
  { id: "music", label: "Musik", render: () => <MusicControls /> },
  { id: "fx", label: "Efek", render: () => <EffectsPanel /> },
  { id: "gesture", label: "Gesture", render: () => <GestureSettings /> },
  { id: "loop", label: "Looper", render: () => <LooperPanel /> },
  { id: "presets", label: "Preset", render: () => <PresetsPanel /> },
] as const satisfies readonly { id: string; label: string; render: () => ReactNode }[];

type TabId = (typeof TABS)[number]["id"];
const STORAGE_KEY = "gestura.tab";

function initialTab(): TabId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (TABS.some((t) => t.id === saved)) return saved as TabId;
  } catch {
    // abaikan
  }
  return "instrument";
}

export function SidePanel() {
  const [tab, setTab] = useState<TabId>(initialTab);
  const select = (id: TabId) => {
    setTab(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // abaikan
    }
  };
  const current = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div className="flex flex-col rounded-2xl border border-stage-700 bg-stage-850/80">
      <div
        role="tablist"
        aria-label="Panel kontrol"
        className="grid grid-cols-3 gap-1 border-b border-stage-700 p-2"
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          const i = TABS.findIndex((t) => t.id === tab);
          const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
          if (next) {
            select(next.id);
            document.getElementById(`tab-${next.id}`)?.focus();
          }
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => select(t.id)}
            className={cx(
              "h-9 rounded-lg px-2 text-sm font-medium transition-colors",
              tab === t.id ? "bg-stage-700 text-ink" : "text-ink-muted hover:bg-stage-800 hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id={`panel-${current.id}`} role="tabpanel" aria-labelledby={`tab-${current.id}`} className="p-4">
        {current.render()}
      </div>
    </div>
  );
}
