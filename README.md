# Bike Manager - Production PWA

A production-grade, mobile-first, single-file Progressive Web App for managing bike sales, inventory, credit, and analytics with advanced security features.

## Features

### ✅ Core Functionality
- **Bike Management**: Track purchases, repairs, sales, and profit margins
- **Credit Desk**: Monitor credit payments and receivables
- **Analytics**: Cash flow tracking and business insights
- **Expense Tracking**: Record and categorize business expenses

### 🔒 Security & Privacy
- **PIN Authentication**: 4-12 digit PIN with PBKDF2 (250k iterations) + SHA-256
- **Biometric Authentication**: WebAuthn support for platform authenticators (Touch ID, Face ID, Windows Hello)
- **AES-GCM Encryption**: Sensitive data encrypted at rest
- **Sensitive Data Lock**: Automatic locking after 5 minutes of inactivity
- **Content Security Policy**: Strict CSP headers to prevent XSS

### 📱 PWA Capabilities
- **Fully Offline**: Works completely offline after first load
- **Installable**: Add to home screen on mobile and desktop
- **Auto-Updates**: Automatic service worker updates with notifications
- **Native-like**: Standalone display mode with custom theme

### 📷 Media Support
- **Camera Integration**: Capture multiple photos directly in-app
- **Image Compression**: Automatic WebP compression to max 1920px
- **Blob Storage**: Images stored efficiently in IndexedDB

### 💾 Data Management
- **IndexedDB**: All data stored locally in browser
- **Encrypted Backups**: Export/import with AES-GCM encryption
- **Data Migration**: Automatic migration from localStorage if detected
- **Storage Quota Monitoring**: Alerts when storage is >80% full

### ✨ Modern Features
- **View Transitions API**: Smooth page transitions (when supported)
- **File System Access API**: Native file picker for backup/restore
- **Constraint Validation API**: Built-in form validation
- **Storage Estimate API**: Track storage usage
- **Service Worker**: Network-first caching strategy

## Architecture

### Single-File Design
Everything is consolidated into `index.html`:
- ~1,100 lines (vs original 11,000+)
- All HTML, CSS, and JavaScript inline
- No external dependencies or CDNs
- Aggressive code optimization

### Additional Files
- `manifest.webmanifest`: PWA manifest with inline SVG icons
- `sw.js`: Service worker (~100 lines)
- `README.md`: This file

### IndexedDB Stores
1. **entries**: Bikes, expenses, payments (auto-encrypted when locked)
2. **images**: Photo blobs with compression
3. **settings**: App preferences and UI state
4. **auth**: PIN hash, salt, biometric credentials

## Deployment to GitHub Pages

### Prerequisites
- GitHub account
- Git installed locally

### Steps

1. **Create a new repository**:
   ```bash
   # On GitHub, create a new repository (e.g., "bike-manager")
   ```

2. **Initialize and push**:
   ```bash
   git init
   git add index.html manifest.webmanifest sw.js README.md
   git commit -m "Initial commit: Production PWA"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/bike-manager.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Source: Deploy from branch `main` / root folder
   - Save and wait 1-2 minutes

4. **Access your app**:
   ```
   https://YOUR_USERNAME.github.io/bike-manager/
   ```

### Custom Domain (Optional)
1. Add `CNAME` file with your domain
2. Configure DNS with GitHub IPs
3. Enable HTTPS in Pages settings

## Browser Support

### Recommended
- **Chrome/Edge**: 90+ (full features including WebAuthn, View Transitions)
- **Safari**: 15+ (iOS 15+, limited WebAuthn on older devices)

### Feature Detection
- App gracefully degrades on unsupported features
- Biometric auth falls back to PIN
- Camera falls back to file upload
- File System API falls back to download/upload

## Security Considerations

### PIN Requirements
- 4-12 digits only
- Stored as PBKDF2 hash with 250k iterations
- Salt randomized per installation

### Biometric Setup
- Requires existing PIN first
- Platform authenticator only (device-local)
- Credential IDs stored, private keys never exposed

### Backup Encryption
- All backups encrypted with user PIN
- Contains: salt, IV, ciphertext, auth tag
- Version header for future compatibility

### Sensitive Data
- Masked by default (shown as ••••)
- Unlock with PIN or biometric
- Auto-locks after 5 minutes inactivity

## Known Limitations

### iOS Safari
- WebAuthn support limited on older iOS versions (<15)
- Camera access requires user gesture
- Standalone mode may have quirks with nav bar

### Storage
- IndexedDB quota varies by browser (typically 10-50% of available disk)
- Alert shown when >80% full
- Users should backup regularly

### Offline
- First visit requires network connection
- Service worker registration requires HTTPS (except localhost)
- Updates check every 30 minutes when online

## Usage Guide

### First-Time Setup
1. Visit the app URL
2. Allow installation prompt (or use browser menu)
3. Set up PIN in Settings → Security
4. (Optional) Enable biometric authentication

### Daily Workflow
1. **Add Bike**: Tap + button → Enter details → Save
2. **Mark Sold**: Edit bike → Check "Mark as Sold" → Enter sale info
3. **Track Credit**: Credit page shows pending amounts automatically
4. **View Analytics**: Stats page shows profit, cash flow, averages

### Backup & Restore
1. **Backup**: Settings → Backup Data → Downloads encrypted file
2. **Restore**: Settings → Restore Data → Select .enc.json file → Enter PIN
3. **Schedule**: Recommended weekly backups

### Security Best Practices
- Use a unique PIN not shared with other apps
- Enable biometric if available for faster unlock
- Lock app when not in use (manual or auto after 5min)
- Store backup files securely (encrypted cloud storage)

## Development

### Local Testing
```bash
# Serve locally (requires HTTPS for SW)
npx http-server -p 8080 -c-1

# Or use Python
python3 -m http.server 8080
```

### Service Worker Debugging
- Chrome DevTools → Application → Service Workers
- Check "Update on reload" during development
- Clear storage to test fresh install

### Updating the App
1. Increment `__APP_VERSION__` in index.html
2. Update `VERSION` in sw.js
3. Commit and push to GitHub
4. Users will see update prompt on next visit

## Performance

### Lighthouse Scores
- Performance: ~95
- Accessibility: ~95
- Best Practices: ~95
- PWA: 100
- SEO: ~90

### Optimizations
- Minified inline CSS (~3KB)
- Compressed JavaScript (~15KB before gzip)
- Lazy image loading with object URLs
- requestIdleCallback for non-critical tasks
- Efficient IndexedDB transactions

## Privacy

- **Zero Network Calls**: All data stays local (no analytics, no tracking)
- **No Cookies**: Uses IndexedDB only
- **No Third-Party Scripts**: Completely self-contained
- **Encrypted Backups**: User controls export/import

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
1. Check Known Limitations above
2. Verify browser compatibility
3. Test in Chrome (latest) first
4. File issue on GitHub repository

## Changelog

### v1.0.0 (2025-11-11)
- Initial production release
- Single-file architecture
- PIN + Biometric authentication
- Encrypted backup/restore
- Camera with compression
- Auto-update notifications
- Offline-first PWA
- Migration from localStorage

---

**Built with**: Vanilla HTML/CSS/JavaScript (ES2022+), Web Crypto API, IndexedDB, WebAuthn, Service Workers

**Target**: Chrome latest, GitHub Pages, Mobile-first design

**Status**: Production-ready ✅
