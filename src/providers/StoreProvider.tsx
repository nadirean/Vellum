import React, { createContext, useContext, useEffect, useRef } from 'react';

import { RootStore } from '@stores/RootStore';

export const StoreContext = createContext<RootStore | null>(null);

/**
 * Top-level provider that lazily instantiates a single {@link RootStore} instance stored via
 * `useRef` to survive re-renders, bootstraps it on mount, and disposes it on unmount so any
 * descendant can consume the global stores.
 */
export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const storeRef = useRef<RootStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = new RootStore();
  }

  useEffect(() => {
    storeRef.current?.bootstrap().catch(console.error);
    return () => {
      storeRef.current?.dispose();
    };
  }, []);

  return <StoreContext.Provider value={storeRef.current}>{children}</StoreContext.Provider>;
};

/**
 * Retrieves the full {@link RootStore} instance from context, returning access to all store slices
 * (player, UI, etc.). Throws a descriptive error if {@link StoreProvider} has not been mounted.
 */
export const useRootStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('StoreProvider missing');
  return ctx;
};

/** Shorthand hook that returns the player store slice, exposing playback state and actions. */
export const usePlayerStore = () => useRootStore().player;

/** Shorthand hook that returns the UI store slice, exposing cross-cutting UI state. */
export const useUIStore = () => useRootStore().ui;
