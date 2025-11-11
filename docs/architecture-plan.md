# P0 Architecture & Risk Plan

## UI Freeze & Scope
- Preserve the existing single-page shell with header, bottom navigation, and the 7 views (`dashboard`, `bikes`, `credit`, `analytics`, `expenses`, `pr`, `settings`); zero DOM layout, copy, or spacing adjustments during refactor.
- Keep all modal sheets, form flows, segmented controls, and toasts identical in markup; only rewire behaviour behind event handlers.
- Maintain current iconography sizes/placements by inlining the Lucide glyphs already used; no runtime fetches.
- Respect current light theme palette and typography (Inter); ship required font weights inline via `@font-face`.

## Features to Retire or Re-scope (Logic Only)
- Remove GitHub Gist sync, PAT prompts, and any remote storage toggles—everything becomes purely local.
- Drop PDF export (jsPDF), quick share via external APIs, and other network-only helpers; replace with local backup workflow.
- Replace Tailwind CDN + runtime config with a trimmed static CSS map that covers the class names actually used.
- Collapse all disparate helpers (`state` object, global renderers) into purpose-scoped modules; eliminate dead analytics code while keeping the UI placeholders populated from the new data model.
- Consolidate toast/notifier implementations to a single minimal helper.

## Target Feature Set Alignment
- Keep all visible dashboards, lists, card stacks, chips, and buttons functional with data backed by the new storage model.
- Add required capabilities without altering UI: local encryption lock, WebAuthn + PIN flows, backup/import, camera & multi-select image management, quota warnings, and SW-driven updates.

## Data Model & Storage (IndexedDB Only)
| Store | Key | Value shape | Notes |
| --- | --- | --- | --- |
| `entries` | `id` (UUID v4) | `{ id, createdAt, updatedAt, title, body, tags[], images[], isSensitive, meta, encrypted?: { iv, authTag, data } }` | `meta.type` flags (`bike`, `credit`, `expense`, `pr`, `cash`, etc.) map UI sections to shared schema. |
| `images` | `imageId` | Blob | Blobs stored separately; entry `images[]` keeps refs plus metadata snapshot. |
| `settings` | single key records | `{ key, value }` | Includes theme, inactivity timeout, feature toggles, SW/app version, last backup timestamp. |
| `auth` | `pin`/`webauthn`/`lock` keys | PIN hash params, WebAuthn credential IDs, last-lock timestamp, inactivity thresholds. |

- Database name: `bike-manager-v2`; versioned upgrades with migrations in `onupgradeneeded`.
- Encode encrypted entry payloads as `{ cipher: base64, iv: base64, tag: base64, salt: base64, version }` where `cipher` holds AES-GCM ciphertext of the canonical entry JSON.
- Use a lightweight inlined IDB helper (Promise-based wrapper for `openDB`, `tx`, `store.getAll`, etc.).

## Sensitive Data & Crypto
- Primary key derived from PIN via `PBKDF2-HMAC-SHA-256` with 250k iterations, 16-byte random salt per user, producing 256-bit key; parameters persisted in `auth` store.
- For biometric unlock, generate a random 256-bit session key encrypted (wrapped) with the PBKDF2 key; after successful WebAuthn assertion, unwrap into memory-only buffer.
- All sensitive entries (flagged `isSensitive` or when global lock enabled) encrypted per-entry before persistence; decrypt on unlock and cache in memory-limited map. Zero out buffers when locking or navigating away (`pagehide`/`visibilitychange`).
- Store derived key material only in memory; persisted data never contains raw keys or plaintext.
- Use `crypto.subtle.digest('SHA-256', ...)` to hash backups for integrity verification (stored alongside ciphertext).

## Authentication & Locking Flow
- On first launch, force PIN setup (4–12 digits) with constraint validation; store salted PBKDF2 hash.
- Optional biometric toggle in `settings` view: WebAuthn registration (platform authenticator, resident key preferred, user verification required). Store credential ID + user handle internally.
- Unlock process: try WebAuthn assertion first; on failure/unavailable, focus PIN modal. Successful unlock caches session key in memory and starts inactivity timer (configurable 30s–10m) with optional `blur` immediate lock.
- When locked, add `.sensitive-mask` class (already present) and block form submissions. Show dedicated unlock button for analytics tiles and other redacted sections.

## Media Capture & Image Handling
- Camera flow launched from existing buttons (no UI changes). Attempt `navigator.mediaDevices.getUserMedia` with `{ video: { facingMode: 'environment' } }`; fallback to hidden file input (`capture="environment"`, `multiple`).
- Use `ImageCapture` when available for stills; otherwise draw to canvas, auto-rotate via EXIF orientation (use DataView parsing of JPEG headers).
- Compress to WebP (quality 0.82) or fallback to JPEG if unsupported; cap longest side at 1920px. Enforce per-image size ≤ 8 MB and overall quota using `navigator.storage.estimate()`.
- Store processed image blobs in `images` store; `createObjectURL` lazily for previews, revoking on list teardown.

## Backup & Restore
- Export path: fetch all stores, build canonical JSON, optionally run through `CompressionStream('gzip')`, then encrypt with user PIN key (or session key) → produce `.enc.json` payload:  
  ```json
  { "version":1,"kdf":"PBKDF2-HMAC-SHA-256","iterations":250000,"salt_b64":"...", "iv_b64":"...", "cipher":"AES-GCM", "payload_gzip_b64":"...", "auth_tag_included":true, "sha256_b64":"..." }
  ```
- Offer File System Access API save dialog; fallback to `URL.createObjectURL` download. Provide clipboard copy via Async Clipboard when permitted.
- Import: read file, verify JSON schema (strict), re-derive key with supplied PIN, decrypt, optional gunzip via `DecompressionStream`, validate payload against schema (Ajv-like inline validator), then merge or replace via user choice with dry-run summary (counts, conflicts).

## PWA Strategy
- `index.html` becomes single entry point (inline CSS/JS). Use relative URLs for `manifest.webmanifest` and `sw.js` served from repo root to satisfy GitHub Pages.
- Service worker (~80 LOC) with versioned `CACHE_NAME = 'bmgr-${APP_VERSION}'`, install network-first for `index.html`, stale-while-revalidate for other assets, `skipWaiting` + `clients.claim`.
- In-app update checker posts `SKIP_WAITING` to SW and shows toast/snackbar prompting reload via `window.location.reload()`.
- `manifest.webmanifest`: `start_url": ".", "scope": ".", "display": "standalone"`, theme colors derived from existing palette, icons referencing `./icons/...` (reuse generated assets).

## Validation & UX Hardening
- Leverage Constraint Validation API with custom validity messages per input; enforce title length (1–120), tag constraints, numeric ranges.
- Validate image MIME and size before storing; show actionable toasts (no stack traces).
- Centralize strings for toasts/dialog copy within `i18n` map so future localization is feasible.
- Maintain focus management for modals and respect `prefers-reduced-motion` (skip view transitions when true).
- Add strict CSP meta: `default-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' blob: data:; style-src 'self'; font-src 'self' data:; media-src 'self' blob:; frame-src 'none';`.

## Internal Module Layout (All Inline in `<script type="module">`)
- `bootstrap`: feature detection, font loading, view transitions disable fallback.
- `db`: tiny IDB wrapper + schema migration.
- `crypto`: key derivation, encrypt/decrypt, random helpers, zero-fill.
- `auth`: PIN lifecycle, WebAuthn registration/assertion, inactivity timers.
- `state`: reactive store, view-model shaping for each UI tab, in-memory caches.
- `camera`: capture pipeline, upload & drag/drop integration, queue management.
- `backup`: export/import, schema validation, compression.
- `pwa`: SW registration, update channel, install prompt hints.
- `ui`: event binding, rendering, diff-less DOM updates, toast system, validation hooks.

## Tooling & Build Notes
- Keep source readable but trimmed; rely on terser syntax (optional chaining, logical assignment) while staying ES2022.
- Inline minified CSS tailored to used class set; compute once with Tailwind CLI + purge to reduce footprint, then hand-tune variables.
- Include small self-check tests (assertions) in `crypto` and `validators` modules, guarded behind `if (import.meta.env?.MODE === 'development')` style flag (stripped in production build step).

## Risk Register & Mitigations
- **WebAuthn availability**: Provide explicit PIN fallback, detect `PublicKeyCredential` upfront, show informative message if unsupported.
- **iOS PWA limitations**: No `CompressionStream`/`FileSystemHandle`; ensure fallbacks to download/upload and sequential gzip polyfill via worker when necessary.
- **Storage quotas**: Use `navigator.storage.estimate()` to preflight before large imports or photo batches; warn and allow user to trim images.
- **Large inline bundle**: Monitor final `index.html` load; enable gzip via GitHub Pages; lazy-load heavy work using `requestIdleCallback`.
- **Camera permissions**: Gracefully degrade to file input, remember denials, prompt user with guidance.
- **Crypto performance**: PBKDF2 250k iterations may lag on low-end devices—show spinner and allow cancel/redo.
- **View transition parity**: Wrap in capability detection to avoid regressions on browsers lacking API.

## Next Steps
1. **P1 Single-File Refactor** – collapse HTML/CSS/JS, wire IDB scaffolding, ensure UI parity (include baseline tests/screenshots).
2. **P2 Crypto & Sensitive Lock** – implement encryption, PIN, lock UX, and memory hygiene.
3. **P3 Biometrics** – WebAuthn registration/assertion flows with session wrapping.
4. **P4 Media Pipeline** – camera queue, processing, quota enforcement.
5. **P5 Backup/Restore** – encrypted backups with compression + integrity.
6. **P6 PWA & Auto-Update** – new SW, manifest tuning, install prompt logic.
7. **P7 Hardening & Polish** – CSP, validation edge cases, docs and deploy checklist.

