## Refactor Plan Overview

- **Objective**: Rebuild the current Bike Manager experience into a production-grade, security-focused single-file PWA hosted on GitHub Pages. Preserve the exact UI while replacing the legacy data model, remote dependencies, and network features with local-first, cryptographically protected workflows.
- **Scope Lock**: No visual or UX regressions. Only `index.html`, `manifest.webmanifest`, and `sw.js` may ship. All scripts/styles must be inlined into `index.html`. External CDNs, Tailwind runtime, Lucide bundle, and jsPDF use will be removed.
- **Cut Features**: GitHub Gist sync, PAT modal, PDF export, remote icon font/CDNs, unused analytics extras, legacy cash adjust hacks, and any debugging overlays. Keep navigation, forms, toasts, and visible copy intact.
- **Key Additions**: Local IndexedDB stores, AES-GCM encryption for sensitive data, PBKDF2-derived keys from PIN, WebAuthn unlock with PIN fallback, secure backup/restore, multi-image capture/upload, and hardened PWA/service worker with auto-update UX.

## UI Freeze & Asset Strategy

- Snapshot current DOM structure and Tailwind-derived classes; reuse the resulting CSS by extracting computed rules into a compact custom stylesheet embedded in `<style>`.
- Replace Lucide icon runtime with inline `<svg>` templates matching current visuals. Cache icon paths in a small map for reuse.
- Keep existing HTML structure to guarantee layout fidelity; route logic swaps sections by `hidden` class just as today.
- Maintain existing toast, modal, and navigation markup; only update data attributes/IDs if required for new logic, ensuring ARIA roles remain.
- Fonts: inline minimal `@font-face` definition using existing Inter subset (hosted via base64 or optional GH Pages static). If size is prohibitive, rely on system stack while keeping fallback identical in appearance metrics (verify typography).

## Module Map (all bundled inside `<script type="module">`)

- `boot` – feature detection, initial loading spinner, service worker registration, storage quota check, settings bootstrap, state hydration, and View Transition wrappers.
- `db` – thin IndexedDB helper (promises + request management) with stores: `entries`, `images`, `settings`, `auth`. Provides `openDB(version, upgrades)`, CRUD helpers, batch ops, and migration harness.
- `crypto` – WebCrypto utilities: random bytes, PBKDF2 deriveKey (250k iterations), AES-GCM encrypt/decrypt, SHA-256 digest, zeroization helpers, session key caching with shared memory guard.
- `auth` – PIN lifecycle, inactivity timer, lock state machine, WebAuthn register/assert flows, key wrapping for biometric unlock, sensitive field masking/unmasking, and redaction toggles.
- `data` – schema validators (Constraint API + custom), entry CRUD orchestrations, image references, tag dedupe, metrics calculations, summary pipelines, plus migrations from legacy localStorage if discovered.
- `images` – capture pipeline: `getUserMedia` + `ImageCapture` (if available), EXIF orientation correction via `createImageBitmap`/`OffscreenCanvas`, compression to WebP/AVIF with fallback to JPEG, URL lifecycle management, quota enforcement, optional Wake Lock while capturing batch.
- `backup` – export/import flows: JSON schema validation, optional CompressionStream gzip, AES encryption, File System Access integration, manual upload/download fallback, checksum verification, merge-or-replace diff preview.
- `pwa` – manifest sync, service worker messaging (`SKIP_WAITING`, `UPDATE_AVAILABLE`), update snackbar, offline fallback detection, `beforeinstallprompt` gating, prefetch hints.
- `ui` – DOM querying, event delegation, form wiring, list renders, toast & dialog helpers, focus management, reduced-motion respect, and View Transition wrappers to maintain smooth state changes without layout shifts.

Each module is defined as an IIFE returning a minimal API object. Modules share state through a central `AppState` singleton, injected explicitly to avoid global bloat.

## Data Model & Storage Plan

- `entries` store (`keyPath: id`, `autoIncrement: false`):
  - Persist `EntryRecord` matching provided schema.
  - Fields `title`, `body`, `tags`, `meta` stored as JSON; `isSensitive` flag controls encryption.
  - For sensitive entries or when global lock active, encrypt body, tags, meta payload under derived AES key; store ciphertext + IV + authTag in record; non-sensitive metadata (id, timestamps, isSensitive, imageIds) stays plaintext.
- `images` store (`keyPath: id`):
  - Blob payload saved via `put({id, blob, width, height, type, size, createdAt})`.
  - Use separate metadata map in `entries` referencing `id`; revoke object URLs on unmount.
- `settings` store (`keyPath: key`):
  - Contains app version, theme toggles, feature flags, auto-lock config, PWA hints, last backup timestamp.
  - Non-sensitive values stored directly; sensitive toggles hashed if needed.
- `auth` store (`keyPath: key`):
  - `pinParams`: `{ salt, iterations, hash }`.
  - `webauthnCredentialIds`: array of base64 credential IDs.
  - `lockState`: persisted booleans (`enabled`, `biometricPreferred`, `lastUnlock` timestamp).
  - No raw secrets persisted; only salted hashes and metadata.

Versioning: store `schemaVersion` in `settings`. On `onupgradeneeded`, run sequential migrators (initial import from legacy localStorage, future evolutions). Perform integrity checks using SHA-256 after migrations.

## Security & Auth Flow

- **PIN Setup**: New users prompted to set 4–12 digit PIN. Validate via pattern + Constraint API. Derive key with PBKDF2 (`salt=crypto.getRandomValues`, iterations 250000, hash `SHA-256`). Store `salt` & derived key hash (not key).
- **Unlock**: Prompt biometric first if `webauthnAvailable`. Use `navigator.credentials.get` with platform authenticator. On success, unwrap session key (AES-GCM key encrypted with WebAuthn public key). On failure/unavailability, ask for PIN: derive key, verify hash, then decrypt stored encrypted master key.
- **Session Key**: Keep AES key in memory only; attach to `crypto` module closure. On lock, zeroize (overwrite buffers) and revoke references.
- **Auto Lock**: Idle timer configurable 30s–10m; also trigger on blur (if enabled) or manual lock. Sensitive DOM nodes get `.sensitive-mask` toggled plus content replaced with placeholders when locked.
- **Backup**: Use derived key (or session key) to encrypt backup. Structure per `definitions_api_shapes.backup_file`. When compressing, apply CompressionStream before encryption (privacy). Provide optional clipboard copy of base64 payload.

## Media Capture & Validation

- Feature detect `navigator.mediaDevices.getUserMedia`. If available, present in-app camera modal; else fallback to `<input type="file" multiple capture="environment" accept="image/*">`.
- Allow multi-shot queue before save; display thumbnails with delete actions mirroring current UI style.
- On capture/upload:
  - Normalize orientation using EXIF via `ImageBitmap`/`canvas`.
  - Resize down to max dimension 1920px.
  - Encode to WebP (preferred) or JPEG fallback.
  - Enforce per-image ≤ 8 MB and total storage cap with `navigator.storage.estimate`.
  - Store metadata + blob in `images` store; link IDs to entry record.

## PWA & Update Lifecycle

- `manifest.webmanifest`: trimmed JSON with relative paths (`"start_url": ".", "scope": "."`). Use existing icons, optionally embed data URI for 192px fallback.
- `sw.js`: ~80 LOC, ESM-friendly. Cache names include version string from `__APP_VERSION__`. During `install`, pre-cache `index.html`, `manifest`, `icons`. `fetch` uses network-first for `index.html` (to pick up updates), stale-while-revalidate for other assets, bypass non-GET requests. On `activate`, call `clients.claim()` and prune old caches. Listen for `message {type:'SKIP_WAITING'}` to call `skipWaiting`.
- App registers SW, then listens for `updatefound` to show snackbar button "Update ready" that posts `SKIP_WAITING`. Upon controllerchange, prompt reload via toast.
- Ensure service worker scope is repo root (`./sw.js`) for GitHub Pages compatibility.

## CSP & Hardening

- Add `<meta http-equiv="Content-Security-Policy">` permitting only `'self'`, `blob:` for workers, `data:` for images/fonts, and `unsafe-inline` removed by inlining hashed event handlers (use `addEventListener` instead of inline). No external scripts/styles permitted.
- Use `<meta name="referrer" content="no-referrer">`, disable `X-UA-Compatible` legacy needs.
- Input sanitization via `textContent` escape helper and validation; no innerHTML from user data except sanitized templates.
- Centralized error handler logging to `console.error` in dev mode only; user sees friendly toast.

## Risk Log & Mitigations

- **WebAuthn Availability**: Some devices/browsers (esp. iOS < 16.4) may lack platform authenticators. Mitigation: detect support, surface PIN fallback, allow users to disable biometric requirement.
- **Storage Quotas**: IndexedDB limits vary (notably iOS Safari). Mitigation: use `navigator.storage.estimate` and show quota warnings; allow user to trim images; compress aggressively.
- **PWA Limitations on iOS**: Background sync & WebAuthn coverage limited; document caveats in README. Ensure offline caching works within iOS PWA constraints.
- **Large Single File Maintenance**: Hard to manage monstrous inline JS/CSS. Mitigation: structure using internal module pattern, include build comments for future tooling, keep sections logically ordered.
- **Crypto UX**: Forgotten PIN or failed biometrics locks user out. Mitigation: provide reset flow requiring existing unlock or full data wipe; document in README.
- **Camera Permissions**: Users may deny; ensure fallback upload path and clear messaging.
- **CompressionStream Support**: Not universal; detect and fallback to plain encryption or use gzip polyfill? Instead, fallback to raw JSON encryption when unsupported.
- **GitHub Pages Caching**: Aggressive CDN caching could delay updates. Mitigation: append version query on `index.html` fetch when announcing update; instruct users to hard refresh in README.

## Next Steps (Phase Gate)

- ✅ Complete detailed UI snapshot (screenshots/DOM map) to ensure zero regressions.
- → Approve this architecture and risk mitigation with stakeholders.
- Upon approval, proceed to P1:
  - Extract inline CSS/JS into single-file modules.
  - Remove external CDNs.
  - Scaffold IndexedDB + state modules with no-op implementations while preserving current UI.
