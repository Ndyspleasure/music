import { useSyncExternalStore } from "react";

export interface Store<T> {
  getState(): T;
  setState(update: Partial<T> | ((prev: T) => Partial<T>)): void;
  subscribe(listener: () => void): () => void;
}

/** Store minimal berbasis useSyncExternalStore (tanpa dependensi tambahan). */
export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    setState(update) {
      const patch = typeof update === "function" ? update(state) : update;
      let changed = false;
      for (const k of Object.keys(patch) as (keyof T)[]) {
        if (!Object.is(state[k], patch[k])) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      state = { ...state, ...patch };
      for (const l of listeners) l();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Selector harus mengembalikan nilai stabil (primitif atau referensi yang sama) agar tidak re-render terus. */
export function useStore<T extends object, S>(store: Store<T>, selector: (s: T) => S): S {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}
