import { createContext, useContext } from "react";
import type { PerformanceController } from "../features/performance/performance-controller";
import type { AppState } from "../state/app-state";
import { useStore, type Store } from "../state/create-store";

export interface AppContextValue {
  controller: PerformanceController;
  store: Store<AppState>;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("AppContext belum disediakan");
  return ctx;
}

export function useController(): PerformanceController {
  return useAppContext().controller;
}

export function useApp<S>(selector: (s: AppState) => S): S {
  return useStore(useAppContext().store, selector);
}
