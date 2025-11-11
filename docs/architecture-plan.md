# P0 Architecture & Risk Plan

## 1. Goals & Guardrails
- Freeze all visual output: reuse existing templates, class names, copy, icon placements, and spacing exactly as in the current `index.html`.
- Deliver a production-ready, single-user, single-file (`index.html`) application plus `manifest.webmanifest` and `sw.js`, suitable for GitHub Pages hosting with offline-first behaviour.
- Strip every external dependency (Tailwind CDN, Lucide CDN, jsPDF, GitHub Gist sync, etc.) while keeping their *visual* output identical by either inlining minimal CSS/SVG or re-implementing functionality.
- Integrate the requested advanced capabilities: IndexedDB-backed local data, AES-GCM encryption, PIN + WebAuthn unlock, backup/restore, camera & multi-image capture, auto-updating PWA, strict validation, and modern Chrome API usage.
- Maintain zero network writes of user content; only the PWA install/updates and optional icon/font fetches may hit the network.

## 2. Current UI Surface Audit (frozen)
Observed pages/components (must stay pixel-identical):
- **Dashboard**: metric cards, reminders list, unsold bikes panel with sort dropdown.
- **Bikes**: segmented filters, search, sort menu, advanced filter drawer, bulk footer.
- **Credit**: totals strip, record list, export/share actions, bulk footer.
- **Expenses**: list with categories, totals.
- **PR / Contacts**: list with chips, actions.
- **Analytics**: locked state, metrics grid, transactions.
- **Settings**: cash adjustments, PIN management, backup/restore, logout/reset.
- **Global UI**: header with install + lock + add buttons, tab bar, modal sheets (form, confirm, PIN), loader overlay, toast stack.
- **Icons**: Lucide-based icons throughout, PDF/export icons, toggles, placeholders.
- **Typography**: Inter font, existing colour palette, rounded cards, subtle shadows.

## 3. Legacy Logic Identified for Removal or Replacement
- **GitHub Gist sync & PAT onboarding** → Replace with pure local IndexedDB storage and encrypted backup/export. Keep UI affordances (buttons) but rewire copy to local flows.
- **Tailwind CDN runtime** → Precompile required utility classes into compact CSS inside `<style>` using `:where()` selectors and CSS custom properties to mimic existing classes.
- **Lucide CDN** → Inline only the SVG paths actually used; expose a tiny `icon(name)` helper delivering identical markup.
- **jsPDF export** → Replace with encrypted backup/restore flow producing `.enc.json` files while leaving button text/placement unchanged (if text references PDF, show same copy but underlying action triggers backup).
- **LocalStorage primary storage** → Move to IndexedDB; keep LocalStorage only for short-lived feature flags (e.g., last-seen SW version).
- **Unscoped global state objects** → Refactor into encapsulated modules (IIFE namespaces) for `db`, `crypto`, `auth`, `camera`, `backup`, `pwa`, `ui`.
- **Unsafe toast/error handling** → Centralize to sanitized renderer.
- **Excess demo data/migrations** → Replace with schema-driven migrations keyed by version number.

## 4. Target Feature Set Mapping
| Existing UX Feature | New Under-the-hood Implementation |
| --- | --- |
| Bike, Credit, Expense, PR records | Store as unified `entries` with `meta.kind` (`bike`, `credit`, `expense`, `contact`), keeping current fields under `meta`. Route-specific selectors filter accordingly. |
| Sensitive dashboards & analytics lock | Tie to global `auth` lock; sensitive metrics and fields flagged via `data-sensitive` attribute. Data decrypted only when unlocked. |
| Bulk actions (bikes/credit) | Operate on filtered `entries` dataset in-memory; persist updates via `db.putEntry()`. |
| Add/Edit modals | Validate via HTML Constraint Validation + custom hooks per field set; block save until valid. |
| Reminders & notifications | Generated lazily from `entries` metadata; persisted derived state kept minimal. |
| Backup/Restore buttons | Trigger encrypted backup/export and import workflows with dry-run preview instead of PDF/gist flows. |
| Install prompt + update checks | `pwa` module listens for `beforeinstallprompt` and SW messages (`UPDATE_READY`). |

## 5. Data & Storage Architecture
- **IndexedDB (`app-v1`)**
  - `entries`: key `id`. Fields: `id`, `createdAt`, `updatedAt`, `title`, `body`, `tags`, `images` (array of image ids), `isSensitive`, `meta` (object), `cipher` (if encrypted: `algo`, `iv`, `salt`, `tag`), `checksum`.
  - `images`: key `id`, value `{ id, blob, width, height, type, sizeBytes, createdAt, entryId }`.
  - `settings`: key-value store (`id` string) for theme, feature toggles, inactivity timeout, latest SW version, view preferences.
  - `auth`: single record storing `{ pinHash, salt, iterations, webAuthnCredentials[], locked, lastUnlockAt }`.
  - `migrations`: optional store for tracking completed upgrades.
- **Encryption at rest**
  - Non-sensitive entries stored as plaintext JSON.
  - Sensitive entries wrap payload `ciphertext` + metadata; decrypted in-memory via `crypto.decryptEntry`.
  - Integrity: `checksum = SHA-256(serializedPlaintext)` stored for tamper detection post-decrypt.
- **Session key workflow**
  - PIN derived key using PBKDF2 (HMAC-SHA-256, 250k iterations, 128-bit salt) → AES-GCM key.
  - WebAuthn success yields wrapped key stored in `cryptoKey` memory cache + `sessionStorage` ephemeral pointer; cleared on lock/timeout/tab blur/unload.
  - Auto-lock timer (configurable) resets on active user input; tab visibility hidden triggers immediate lock if enabled.

## 6. Cryptography & Authentication Modules
- `cryptoModule`:
  - `deriveKey(pin, salt, iterations)` → AES-GCM `CryptoKey`.
  - `encryptPayload(key, data)` and `decryptPayload(key, cipherBlob)` using `crypto.subtle`.
  - `hashPin(pin, salt)` to store verification hash separate from encryption key.
  - `generateSalt()`, `randomIV()`, `zeroKey(key)` helpers.
- `authModule`:
  - Manages PIN setup/update, validation, inactivity timer, and lock state.
  - Registers WebAuthn credentials with RP ID derived from GitHub Pages domain. Stores credential IDs in `auth` store.
  - On unlock: prefer `navigator.credentials.get` with `publicKey` request; fallback to PIN modal.
  - Maintains `unlockSession` with expiry; revokes on inactivity or manual lock.

## 7. Camera & Image Pipeline
- Feature detection: prefer `navigator.mediaDevices.getUserMedia` + `ImageCapture`; fallback to `<input type="file" accept="image/*" capture="environment" multiple>`.
- Capture flow:
  1. Open modal (existing UI) → request permissions lazily.
  2. Queue multiple frames in memory (Blob URLs) with delete-before-save.
  3. Normalize orientation via EXIF (`createImageBitmap` or manual canvas rotate).
  4. Resize/compress to max dimension 1920px via offscreen canvas → encode WebP or fallback to JPEG.
  5. Store processed `Blob` in `images` store; append reference IDs to entry.
  6. Use `loading="lazy"` thumbnails; revoke object URLs on modal close/unmount.
- Storage quota management via `navigator.storage.estimate`; warn and block saves when exceeding threshold (configurable).

## 8. Backup & Restore Strategy
- **Export**
  1. Fetch all stores, assemble JSON `{ version, entries, images(meta only), settings, auth sans secrets }`.
  2. Serialize plaintext, hash with SHA-256, optionally compress via `CompressionStream('gzip')`.
  3. Encrypt resulting Uint8Array with unlock key (requires unlocked session).
  4. Package `{ version:1, kdf, iterations, salt_b64, iv_b64, cipher, payload_gzip_b64, checksum_b64 }`.
  5. Offer File System Access API save (`showSaveFilePicker`); fallback to blob download; copy to clipboard option.
- **Import**
  1. Read file (File System API or `<input>` fallback).
  2. Parse header, verify version; if unknown version, prompt confirm.
  3. Ask for biometric or PIN → derive key → decrypt.
  4. Verify checksum, validate schema via hand-rolled validator (no heavy libs).
  5. Dry-run preview diff (counts per kind, conflicts); allow merge or replace.
  6. Apply transactionally with IndexedDB version bump if needed.

## 9. PWA & Auto-Update
- `manifest.webmanifest`: `start_url: '.'`, `scope: '.'`, `display: 'standalone'`, reuse theme/background colours, reference `icons/icon-192.png` & `icon-512.png` (static). Provide purpose `any maskable`.
- `sw.js`:
  - Cache name `app-shell-v{hash}`; inject build-time version via placeholder.
  - Install: pre-cache `index.html`, `manifest`, icons.
  - Fetch:
    - Network-first for `index.html`.
    - Stale-while-revalidate for icons/static.
    - Cache storage requests in background catch fallback.
  - Activate: `self.skipWaiting()` on message `SKIP_WAITING`; `clients.claim()`.
  - Post message `UPDATE_AVAILABLE` when new SW waiting; `pwaModule` shows in-app snackbar with reload button -> `postMessage('SKIP_WAITING')`.
- Ensure relative paths and root scope for GitHub Pages compatibility.

## 10. Validation, Accessibility & Performance
- Use HTML attributes (`required`, `min`, `max`, `pattern`, `inputmode`) on all inputs; custom validity messages stored in a map to keep copy centralized.
- Sanitize all string inputs (trim, collapse whitespace), dedupe tags, enforce length bounds.
- Strict image validation (types, size limit 8 MB, total quota threshold from storage estimate).
- Manage focus for modals/dialogs; trap focus when open; restore on close.
- Respect `prefers-reduced-motion` by disabling view transitions when requested.
- Batching DOM updates via `requestAnimationFrame`/`requestIdleCallback` for expensive lists.
- Inline CSS/JS minified; use CSS custom properties for palette to shrink duplication.

## 11. Implementation Phases Alignment
- **P1**: collapse assets -> `index.html` with embedded CSS/JS modules; stub modules for DB/auth/crypto/camera/backup/pwa; replace CDN resources.
- **P2**: implement IndexedDB schema, migrations, and new state management bridging existing UI.
- **P3**: crypto lock, PIN workflow, sensitive masking.
- **P4**: WebAuthn registration/assertion + session handling.
- **P5**: Camera + multi-image processing pipeline.
- **P6**: Backup/restore (encrypted + gzip) & schema validator.
- **P7**: PWA enhancements (manifest, SW, update checks).
- **P8**: Hardening, CSP meta tag, error handling, final minification & README.

## 12. Risk Log & Mitigations
- **WebAuthn on GitHub Pages**: RP ID must match `*.github.io`; need build-time configuration or derive from `location.hostname`. Provide PIN fallback and user messaging if unavailable.
- **IndexedDB quota on low-end devices**: Large image blobs may exceed quota. Mitigate via compression, size limits, quota checks, and backup reminders.
- **iOS PWA limitations**: No WebAuthn or File System Access; implement feature detection fallbacks (PIN only; download/upload backups) and communicate gracefully.
- **Browser support gaps (CompressionStream, View Transitions)**: Provide feature detection with fallbacks (no-op animation, use JS gzip polyfill only if essential, else skip compression).
- **CSP restrictions**: Inline script/style require `nonce` or `'unsafe-inline'`. We'll generate `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self'; img-src 'self' data: blob:; script-src 'self'; connect-src 'self'; font-src 'self' data:; worker-src 'self';">` and rely on inline modules (allowed). Need to avoid inline event handlers.
- **Large single-file maintenance**: Use internal module pattern with clear sections, documented minimal comments, and build script to re-minify if needed (documented in README).

## 13. Assumptions & Open Questions
- App remains single-user; no multi-device sync required.
- Existing dataset semantics (fields, calculations) remain authoritative; we mirror logic even if upgraded data model is more generic.
- Font fidelity: Inter is required for visual parity; plan to embed subsetted font (WOFF2 base64) directly in CSS.
- External sharing/export copy can be repurposed while keeping visible labels; user accepts that underlying action now drives encrypted backup instead of PDF.
- GitHub Pages hosts at project root; service worker scope `.` suffices.

## 14. Next Steps
1. Snapshot existing UI class usage to generate minimal CSS bundle.
2. Set up build pipeline script (`gen_icons.py` or new helper) if needed to regenerate inline assets before final minification.
3. Begin P1 refactor: consolidate HTML/CSS/JS, stub modules, and ensure app boots with current dummy data locally stored.

