# Task Context: Offline Storage Layer (Phase 1)

Session ID: 2026-05-20-offline-storage
Created: 2026-05-20T21:30:00Z
Status: in_progress

## Current Request
Phase 2 of the Offline Downloads feature — the Offline React Context (`client/src/contexts/offline-context.tsx`) that wraps the app and provides download state, progress tracking, online/offline detection, and the `downloadForOffline()` / `removeDownload()` actions.

## Context Files (Standards to Follow)
- `.opencode/context/core/standards/code-quality.md` — pure functions, immutability, error handling patterns
- `.opencode/context/core/essential-patterns.md` — input validation, error boundaries

## Reference Files (Source Material to Look At)
- `shared/schema.ts` — Track type definition (for storage schema)
- `client/src/lib/apiConfig.ts` — existing lib pattern (typed exports, camelCase)
- `client/src/lib/queryClient.ts` — existing lib pattern (error handling style)
- `client/src/lib/caseTransform.ts` — existing lib pattern (module structure)
- `docs/offline-downloads-plan.md` — the full plan document

## External Docs Fetched
- `idb` v8+ API (Context7): openDB, DBSchema typing, get/put/delete/getAll/clear/delete shortcuts on IDBDatabase

## Components
1. **offlineStorage.ts** — IndexedDB CRUD operations using `idb`
   - DBSchema definition for `tracks` and `downloads_meta` object stores
   - openDB singleton
   - 8 exported functions: saveTrack, getTrackBlob, getTrackMeta, getAllDownloadedTracks, removeTrack, getStorageInfo, isTrackDownloaded, clearAll

## Constraints
- Use `idb` package (promise-based IndexedDB wrapper)
- Must align with the Track type from shared/schema.ts
- Follow existing `client/src/lib/` patterns (camelCase exports, typed functions, JSDoc comments)
- Error handling per code-quality.md (Result-style: try/catch with meaningful errors)
- Package.json is root-only (no client/package.json)

## Exit Criteria
- [x] `idb` installed in root package.json
- [x] `client/src/lib/offlineStorage.ts` created with all 8 exported functions
- [ ] TypeScript compilation succeeds (no type errors in the new file)
