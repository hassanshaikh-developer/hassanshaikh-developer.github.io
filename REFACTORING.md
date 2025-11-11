# Bike Manager PWA - Single-File Refactoring

## Overview
This document outlines the refactoring of the Bike Manager app into a production-grade, mobile-first, single-file PWA.

## Key Changes

### 1. Single File Structure
- All HTML, CSS, and JavaScript consolidated into `index.html`
- Only two additional files: `manifest.webmanifest` and `sw.js` (required for PWA)

### 2. Removed Dependencies
- ❌ Tailwind CSS CDN → Inline CSS utilities
- ❌ Lucide Icons CDN → Inline SVG icons
- ❌ jsPDF CDN → Minimal PDF generation (if needed) or removed
- ❌ Google Fonts CDN → System fonts fallback
- ❌ GitHub Gist sync → Local-only storage

### 3. New Features Added
- ✅ IndexedDB for structured data storage
- ✅ WebCrypto API for encryption (PBKDF2 + AES-GCM)
- ✅ WebAuthn biometric authentication
- ✅ PIN fallback authentication
- ✅ Camera capture with multi-image support
- ✅ Encrypted backup/restore
- ✅ PWA auto-update mechanism
- ✅ Content Security Policy

### 4. Data Model
- **Entries**: bikes, expenses, pr (contacts), cashEntries, payments, brandNewDeliveries
- **Images**: Stored as Blobs in IndexedDB
- **Settings**: Theme, PIN hash, WebAuthn credentials, lock state
- **Auth**: PIN hash + salt + params, WebAuthn credential IDs

### 5. Security
- Sensitive data encrypted at rest using AES-GCM
- PIN derived key via PBKDF2 (250k iterations)
- WebAuthn for biometric unlock
- Session-only key material (never persisted)
- Auto-lock on inactivity/timeout

## File Structure

```
/workspace/
├── index.html          # Single-file app (all HTML/CSS/JS)
├── manifest.webmanifest # PWA manifest
├── sw.js               # Service worker
└── icons/              # PWA icons
    ├── icon-192.png
    └── icon-512.png
```

## Implementation Notes

### CSS
- Extracted only used Tailwind utilities
- Preserved all custom CSS
- Added CSS custom properties for theming

### JavaScript Modules (Inline)
1. **DB Module**: IndexedDB operations, migrations
2. **Crypto Module**: PBKDF2, AES-GCM encryption/decryption
3. **Auth Module**: PIN setup/reset, WebAuthn, lock/unlock
4. **Camera Module**: Multi-shot capture, EXIF orientation, compression
5. **Backup Module**: Encrypted export/import, CompressionStream
6. **PWA Module**: Install prompt, update checking
7. **Main App**: UI bindings, rendering, business logic

### Migration Path
- Migrate from localStorage to IndexedDB on first load
- Preserve all existing data
- No data loss during migration

## Testing Checklist
- [ ] Visual UI identical to original
- [ ] Works fully offline
- [ ] Installable as PWA
- [ ] Biometric unlock works
- [ ] PIN fallback works
- [ ] Camera capture works
- [ ] Backup/restore works
- [ ] Encryption/decryption works
- [ ] Auto-update works
- [ ] No console errors
- [ ] Lighthouse PWA score >= 95

## Browser Support
- Target: Chrome (latest) on Android, iOS, Desktop
- Fallbacks for older browsers where possible
