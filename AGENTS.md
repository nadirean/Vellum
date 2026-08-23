# AGENTS.md

## Stack

Expo SDK 55 + React Native 0.83 + React 19.2, TypeScript, Yarn 4 (node-modules linker), Node
`v24.13.1` (`.nvmrc`). Android-focused: `app.json` configures only Android (package `com.vellum`).
No test setup exists. Lint (ESLint flat config, `eslint.config.mjs`) and format (prettier) are
configured.

## Commands

- `yarn start` — dev server with dev client (`expo start --dev-client`); app needs a dev build, not
  Expo Go.
- `yarn android` — `expo run:android`; generates the `android/` dir (gitignored) and runs a native
  build.
- `yarn iba` — `expo run:android --variant release` (release build).
- `yarn typecheck` — `tsc --noEmit`; the verification step before pushing.
- `yarn lint` — `expo lint`; runs ESLint (import order + prettier are enforced as errors).
- `yarn lint --fix` — auto-fix import sorting and formatting (run after adding files).
- `yarn format` — `prettier --write`.

## Path aliases (tsconfig.json; resolved at runtime via `experiments.tsconfigPaths` in app.json)

- Per-folder aliases under `app/`: `@components/*`, `@consts/*`, `@providers/*`, `@router/*`,
  `@screens/*`, `@stores/*`, `@type/*`, `@utils/*` (e.g. `@type/RouterTypes` →
  `app/types/RouterTypes`).
- `@screens/*` → `app/screens/*` (screens are NOT nested under the router); types live in
  `app/types/`, separate from consts.

## Architecture

- Entry: `"main": "expo/AppEntry"` → root `App.tsx` (default export — the app shell:
  `GestureHandlerRootView` + `StoreProvider` + `NavigationContainer` + splash logic).
  `StoreProvider` (`app/providers/StoreProvider.tsx`) creates a single `RootStore` and wraps the
  navigation stack. Screens consume store slices via `usePlayerStore()` / `useUIStore()` and are
  wrapped in `observer()` from `mobx-react-lite`.
- All app code lives under `app/`: `router/` (`Routes.tsx` — the navigator), `screens/`
  (`*Screen.tsx` files), `types/` (`RouterTypes.ts` = param list + global nav decl,
  `LibraryTypes.ts` = domain types), plus `stores/`, `providers/`, `components/`, `consts/`,
  `utils/`.
- `consts/` holds all shared constants, split per domain: `theme.ts`, `sizes.ts`, `playback.ts`
  (rates, timing), `files.ts` (audio/image extensions), `storage.ts` (MMKV keys), `notifications.ts`
  (channel/category IDs + `PlaybackAction`), and `regexes.ts` — every regex used in the app lives
  here.
- Stores (`app/stores/`) are MobX classes using
  `makeAutoObservable(this, { internalField: false, ... }, { autoBind: true })`. Non-observable
  fields (native player, listeners, timers, reaction disposers) must be listed in the overrides
  object so they aren't treated as observables.
- `PlayerStore` owns ALL playback state (book, chapter, position, rate, durations). Derived values
  are computed getters (`totalBookDurationMs`, `bookProgress`, …). `RootStore.bootstrap()` hydrates
  persisted state and calls `player.setup()`; `dispose()` tears down listeners, timers, and
  reactions via the StoreProvider mount effect.
- Background work lives in `PlayerStore.setup()` as MobX `reaction`s + plain subscriptions: progress
  persists every 5s, on pause, on background, and before switching books; a notification reaction
  keeps the playback notification in sync.
- Async flows (e.g. `loadBook`, `loadChapterAudio`) are auto-actions; observable writes that happen
  _after_ an `await` must be wrapped in `runInAction(...)` (MobX strict mode).
- Persistence is synchronous via MMKV (`react-native-mmkv`, JSI — requires a native build, not Expo
  Go). All reads/writes go through `app/utils/localStore.ts` (a single `createMMKV()` instance);
  keys live in `app/consts/storage.ts`. `save*` calls are synchronous — no awaits.
- First run: App reads base folder from MMKV; no folder → `FolderSetup`, else `Library`.
- Each subfolder of the base folder is one audiobook. Title/author parsed from `Title [Author]`
  folder names; otherwise author = "Unknown Author" (`app/utils/scanner.ts:124`).
- Library re-scans only when the base folder changes (`app/screens/LibraryScreen.tsx:46`).
- Book progress is a whole-blob map `Record<bookId, BookProgress>` under `@vellum/bookProgress.v1`,
  written through synchronously on every save via `LocalStore.saveBookProgress`. Saved every 5s, on
  pause, on background, and before switching books.
- Cover focus (vertical crop 0–100, default 50) persisted per book under `@vellum/coverFocus.v1`
  (whole-blob `Record<bookId, number>`), managed by `UIStore` (`getCoverFocusY`/`setCoverFocusY`).
- Library sort preference (`recent`/`title`/`author` × direction, default recent-descending)
  persisted under `@vellum/librarySort.v1`, managed by `UIStore`; applied in
  `LibraryScreen` via `sortAudiobooks` (`app/utils/sorting.ts`) using the progress map's
  `lastPlayedAt` for recency.
- Chapter durations measured at book load with a temp player, batched 3 at a time; reused when all
  stored durations are positive (`scanChapterDurations`).
- The seek bar is the native `@react-native-community/slider`, living in
  `app/components/PlayerProgress.tsx`; it's "write-only" during drag, so the component mirrors a
  local `isSeeking`/`seekPositionMs` back into `value` instead of feeding it live progress. The
  CoverFocusModal drag uses `react-native-gesture-handler` `Gesture.Pan` + a reanimated
  `useSharedValue` so the image tracks the finger on the UI thread.

## Gotchas

- `android/`, and `expo-env.d.ts` are gitignored and generated by `expo run:*` — don't
  hand-create them.
- Audio uses the new `expo-audio` API (`createAudioPlayer`, `player.replace()`), not deprecated
  `expo-av`.
- MobX strict mode is on: mutating an observable outside an action logs a warning. Since the store
  instance is stable, async callbacks read/write `this.*` directly (no ref mirrors needed), but wrap
  post-`await` writes in `runInAction`.
- Don't mark store fields `private` if they're referenced in the `makeAutoObservable` overrides
  object — TypeScript excludes private members from `AnnotationsMap`.
- Gestures need `GestureHandlerRootView` wrapping the app root (`App.tsx`); RNGH 2.30 + worklets 0.7
  are already deps. No `babel.config.js` exists — `babel-preset-expo` auto-adds the
  `react-native-worklets/plugin` (or `react-native-reanimated/plugin`) when present.
- Notification category registers only the TOGGLE action button; skip-back/forward work via
  notification responses (see `app/utils/notifications.ts`).

# Strict Execution Restraints
- **Never attempt to commit, branch, or push code** (e.g., `git commit`, `git checkout`, `git push`). The user handles version control.
- **Do not install or update dependencies** (`yarn add`, `pip install`). If a package is missing, simply state the package name in text and stop.

## Strict Search, Packaging & Documentation Protocols
- **Dynamic Search -> Semble:** For quick code discovery, finding specific file implementations, or searching for logic, always run `semble_search` first. Keep queries conceptual and concise.
- **Wholesale Aggregation -> Repomix:** If the user requests a deep architectural audit, major structural refactoring, or needs you to ingest a massive context of interrelated files, use the `pack_codebase` tool from the Repomix MCP server. Always pass `compress: true` to strip implementation details and save ~70% on token counts.
- **Up-to-Date Documentation -> Context7:** When writing React Native, Expo Router, Wagtail, or PyTorch logic, do not guess APIs or import structures. Use the Context7 tools:
  1. First, call `resolve-library-id` with the package name (e.g., "expo-router").
  2. Call `query-docs` with the resolved ID to get clean, latest official code examples.