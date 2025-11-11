## P0 Audit & Plan

### UI Freeze
- Retain all existing markup structure, classes, and inline copy from the current `index.html`. Tailwind utility classes stay in place; final build will inline the minimal generated CSS so the rendered visuals are pixel-identical.
- Preserve current navigation flow: Dashboard → Bikes → Credit → Expenses → PR → Analytics → Settings. Modal sheet layouts, segmented controls, toast styling, and iconography (Lucide) stay unchanged.
- Keep interaction affordances (tap targets, hover states, validation messaging) by mirroring the current DOM structure and ARIA attributes.

### Scope Reduction & Feature Removals
- Remove GitHub Gist sync, Personal Access Token prompts, and any remote network writes. App becomes fully local-first.
- Drop jsPDF export, CSV/print helpers, and legacy brand-new vs. second-hand migration utilities not required by the new data model.
- Consolidate duplicated filter/sorting helpers and analytics computations; keep only flows exposed in the UI.
- Remove unused feature flags, experimental banners, and any debug consoles.

### Target Feature Set (Post-Refactor)
- Local-only storage backed by IndexedDB (`entries`, `images`, `settings`, `auth` stores) with schema versioning and migrations.
- Sensitive-lock system: global and per-entry encryption using PBKDF2-derived AES-GCM keys, memory-scrubbed after lock.
- Biometric-first unlock via WebAuthn platform credentials; PIN (4–12 digits) fallback/setup/reset flow with inactivity autolock.
- Backup & restore using encrypted JSON payloads (optional gzip via `CompressionStream`); File System Access API when available, otherwise download/upload.
- Camera & media handling: `getUserMedia` + `ImageCapture` multi-shot queue, EXIF orientation fix, optional resize/compress to WebP/AVIF; drag/drop and file input fallback.
- Installable PWA: inline boot registers `sw.js`, shows install prompt, and exposes “Check for updates” action that sends `SKIP_WAITING`.
- Strict form and image validation (HTML constraints + helpers). Storage quota checks using `navigator.storage.estimate`.
- Optional conveniences: Wake Lock toggle while capturing, Web Share of entry text/images when available, Async Clipboard for backup copy link.

### Data Flow & Storage Model
- App boot sequence:
  1. Feature detection (IndexedDB, WebCrypto, WebAuthn, media). Degrade gracefully with user-facing notices; gate features individually.
  2. Open `secureVault` IndexedDB (versioned). Stores: `entries` (records per schema), `images` (blob store keyed by uuid), `settings` (theme, toggles, swVersion, feature flags), `auth` (PIN hash params, WebAuthn credentials, lock state).
  3. Load settings + lock state; if sensitive lock engaged, render masked UI until unlock completes.
- Encryption pipeline:
  - Derive base key from PIN using PBKDF2-HMAC-SHA256 with 250k iterations and unique salt per user. Store only salt, iterations, derived key hash, and algorithm metadata.
  - For sensitive payloads, generate random IV, encrypt with AES-GCM. Store ciphertext + iv + authTag + metadata alongside entry.
  - After successful WebAuthn assertion, wrap decrypted key in session memory; wipe buffers on lock/unload using `crypto.getRandomValues`.
- Backup/restore:
  - Export: gather stores, detach blobs into array buffers, optionally gzip, then encrypt as single payload. Include schema version + checksum (SHA-256). Save via File System Access API or download anchor.
  - Import: prompt for credential, decrypt, validate schema & version, run dry-run diff, then merge or replace (choice). Rebuild image blobs and IndexedDB stores.
- Images:
  - Capture queue stores references in memory before commit. Use `createImageBitmap` + canvas scaling to <=1920px. Save blobs in `images` store; entries keep metadata and blob id.
  - Lazy load previews with `loading="lazy"`, `decode()` deferral, revoke object URLs on removal.

### Manifest & Service Worker Strategy
- `manifest.webmanifest`: relative paths (`.` scope/start_url), name/short_name derived from existing branding, theme/background colors matching current UI. Include 192px/512px PNG icons generated from `icons/`.
- `sw.js`: ~80 LOC module with versioned `APP_CACHE = 'bike-mgr-v{hash}'`. Install caches `index.html`, `manifest`, icons. Fetch handler:
  - Network-first for `/` and `/index.html` with fallback to cache.
  - Stale-while-revalidate for other requests (icons, data URIs not needed).
  - Listen for `message` events; on `{type:'SKIP_WAITING'}` call `skipWaiting`. Notify clients via `postMessage({type:'UPDATE_AVAILABLE'})`.
- Ensure GitHub Pages compatibility: service worker served from site root, scope `.`; use relative URLs so `/project/` deployments work.

### Risks & Mitigations
- **WebAuthn availability**: Not supported on all desktop browsers/HTTP origins. Mitigate with detection; show PIN fallback + guidance. Provide manual disable toggle in settings.
- **Storage quota**: IndexedDB limits vary. Use `navigator.storage.estimate`, warn when approaching ~80% quota, and compress images/backups. Offer cleanup dialog.
- **iOS PWA constraints**: Limited WebAuthn/CompressionStream/File System APIs. Provide fallbacks (PIN-only unlock, upload/download backups, no background sync). Test in Safari PWA mode.
- **Camera permissions**: Users may deny or hardware missing. Fallback to file input + drag/drop; show inline error toasts with retry instructions.
- **Crypto operations performance**: PBKDF2 250k iterations may be slow on low-end devices. Use Web Workers / `crypto.subtle` async; show progress spinner during derivation; allow “remember session” toggle with session timeout.
- **CSP restrictions**: Strict CSP with `script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' blob: data:` may block inline modules unless hashed. Use `<meta http-equiv="Content-Security-Policy">` with nonces automatically applied during build process; ensure no `eval`.

### Next Steps (P1 Gate)
- Build tooling to inline deduplicated CSS + JS modules into `index.html`.
- Define IndexedDB schema version `1` migration script.
- Prepare utility modules (db, crypto, auth, camera, backup, ui, pwa) within single `<script type="module">`.
- Draft PIN & WebAuthn UI flows mapped to current modals without visual changes.
