# Bike Manager - Production PWA

A secure, offline-first Progressive Web App for managing bike sales, credit tracking, and inventory with biometric authentication and encrypted backups.

## Features

### 🔒 Security
- **Biometric Authentication**: WebAuthn support for Touch ID, Face ID, Windows Hello
- **PIN Fallback**: 4-12 digit PIN with PBKDF2 key derivation (250k iterations)
- **Encrypted Storage**: Sensitive data encrypted at rest using AES-GCM
- **Encrypted Backups**: Export/import with compression and integrity checksums
- **Auto-Lock**: Configurable timeout (default: 5 minutes)
- **Content Security Policy**: Strict CSP headers prevent XSS attacks

### 📱 Mobile-First PWA
- **Installable**: Add to home screen on iOS, Android, Desktop
- **Offline Support**: Full functionality without internet
- **Auto-Updates**: Service worker detects and applies updates automatically
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Native Feel**: Standalone display mode, splash screens

### 📸 Camera & Images
- **In-App Camera**: Capture photos directly in the app
- **Multi-Shot Support**: Take multiple photos per bike
- **Smart Compression**: WebP/AVIF with quality optimization
- **Image Resizing**: Automatic downscaling to 1920px max dimension
- **Blob Storage**: Images stored efficiently in IndexedDB

### 💾 Data Management
- **IndexedDB Storage**: Fast, structured local database
- **Automatic Migration**: Seamless upgrade from localStorage
- **Encrypted Backups**: Export/import with `.enc.json` format
- **Compression**: Gzip compression for smaller backup files
- **Integrity Verification**: SHA-256 checksums prevent corruption
- **Storage Quotas**: Real-time storage usage monitoring

### 📊 Business Features
- **Bike Tracking**: Purchase price, sale price, repair costs
- **Credit Management**: Track customer credit and payments
- **Dashboard**: Real-time metrics and summaries
- **Search & Filter**: Quick access to bikes and records
- **Status Management**: Sold/unsold tracking with visual indicators

## GitHub Pages Deployment

### Prerequisites
- GitHub account
- Git installed locally
- This repository cloned to your machine

### Deployment Steps

#### 1. Prepare Repository
```bash
# Navigate to your project
cd /path/to/bike-manager

# Ensure you're on the correct branch
git checkout main  # or your primary branch

# Verify files
ls -la
# Should see: index.html, manifest.webmanifest, sw.js, icons/
```

#### 2. Enable GitHub Pages
1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select:
   - Branch: `main` (or your branch)
   - Folder: `/ (root)`
4. Click **Save**
5. Wait 1-2 minutes for deployment

#### 3. Access Your App
Your app will be available at:
```
https://<username>.github.io/<repository-name>/
```

For example:
- User: `johndoe`
- Repo: `bike-manager`
- URL: `https://johndoe.github.io/bike-manager/`

#### 4. Test PWA Features
1. Open the URL in Chrome/Edge/Safari
2. Look for the install prompt
3. Click "Install" to add to home screen
4. Test offline by disabling network in DevTools

### Custom Domain (Optional)
1. In Settings → Pages → Custom domain
2. Enter your domain (e.g., `bikes.example.com`)
3. Add a CNAME record in your DNS:
   ```
   bikes.example.com → <username>.github.io
   ```
4. Wait for DNS propagation (~24 hours)
5. Enable **Enforce HTTPS** after DNS resolves

## File Structure

```
bike-manager/
├── index.html              # Single-file PWA (all HTML/CSS/JS)
├── manifest.webmanifest    # PWA manifest
├── sw.js                   # Service worker
├── icons/
│   ├── icon-192.png       # App icon 192x192
│   └── icon-512.png       # App icon 512x512
├── gen_icons.py           # Icon generator script
└── README.md              # This file
```

## Browser Compatibility

| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| PWA Install | ✅ 90+ | ✅ 16.4+ | ⚠️ Limited | ✅ 90+ |
| IndexedDB | ✅ | ✅ | ✅ | ✅ |
| WebCrypto | ✅ | ✅ | ✅ | ✅ |
| WebAuthn | ✅ | ✅ 16+ | ✅ 95+ | ✅ |
| Camera API | ✅ | ✅ 14.3+ | ✅ | ✅ |
| Compression | ✅ 103+ | ⚠️ 16.4+ | ✅ 113+ | ✅ 103+ |

**Minimum Versions:**
- Chrome/Edge: 103+
- Safari: 16.4+
- Firefox: 113+

## Usage Guide

### First-Time Setup
1. **Open the app** in your browser
2. **Setup PIN**: Go to Settings → Setup PIN
3. **Enable Biometric** (optional): Settings → Enable Biometric
4. **Install PWA**: Click "Install" button in header

### Adding Bikes
1. Navigate to **Bikes** tab
2. Click **Add Photos** to use camera or upload images
3. Capture multiple photos if needed
4. Click **+** button to add bike details
5. Fill in: Name, Purchase Price, Sale Price, etc.
6. Save

### Managing Credit
1. Go to **Credit** tab
2. Click **+** to add credit entry
3. Enter customer name and amount
4. Track payments and status

### Backup Your Data
1. **Setup PIN first** (required for encryption)
2. Go to **Settings**
3. Click **Export Backup**
4. Save the `.enc.json` file securely
5. **Store backup in multiple locations** (cloud, USB, etc.)

### Restore Data
1. Go to **Settings**
2. Click **Import Backup**
3. Select your `.enc.json` file
4. Enter your PIN to decrypt
5. Confirm the import

## Security Best Practices

### PIN Security
- ✅ Use unique PIN (not your phone unlock PIN)
- ✅ Minimum 6 digits recommended (4-12 supported)
- ✅ Don't share or write down your PIN
- ⚠️ **If you forget your PIN, data cannot be recovered**

### Backup Strategy
- ✅ Export backups weekly (or after major changes)
- ✅ Store encrypted backups in multiple locations
- ✅ Test restore process periodically
- ✅ Keep backups encrypted (never decrypt and save plaintext)

### Biometric Auth
- ✅ Enable for convenience (falls back to PIN)
- ✅ Works with: Touch ID, Face ID, Windows Hello, fingerprint sensors
- ⚠️ Requires HTTPS (automatic on GitHub Pages)

### Data Privacy
- ✅ **All data stays on your device** (no server uploads)
- ✅ Sensitive data encrypted with AES-GCM
- ✅ PIN hash uses PBKDF2 with 250k iterations
- ✅ Backups are encrypted end-to-end
- ⚠️ Clear browser data = **permanent data loss** (backup first!)

## Troubleshooting

### PWA Won't Install
- Ensure you're using HTTPS (GitHub Pages has this by default)
- Try Chrome/Edge instead of Firefox
- Check for console errors (F12 → Console)
- Clear browser cache and reload

### Camera Not Working
- Grant camera permissions when prompted
- Check browser settings: `chrome://settings/content/camera`
- Try switching camera (front/back) using the switch button
- Ensure HTTPS is enabled (required for camera access)

### Biometric Auth Fails
- Ensure device supports WebAuthn (Touch ID, Windows Hello, etc.)
- Check browser supports WebAuthn (Chrome 90+, Safari 16+)
- Fall back to PIN if biometric unavailable
- Re-register biometric in Settings if corrupted

### Data Migration Issues
- Old data in localStorage will auto-migrate on first launch
- Check console for migration logs (F12 → Console)
- Manual export/import if auto-migration fails
- Contact support with console logs if persistent

### Storage Quota Exceeded
- Check storage usage: Settings → Storage
- Delete old bikes/images to free space
- Export backup, clear data, re-import essentials
- Desktop Chrome gives more storage than mobile

### Backup Won't Decrypt
- Verify you're using the correct PIN
- Ensure backup file is not corrupted (check file size)
- Try re-exporting if backup is recent
- Backups are **not recoverable** without correct PIN

## Development

### Local Testing
```bash
# Serve locally (requires Python)
python -m http.server 8000

# Open browser
open http://localhost:8000

# Or use Node.js
npx serve .
```

### Service Worker Testing
```bash
# Clear service worker cache
# Chrome: DevTools → Application → Service Workers → Unregister
# Then hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
```

### Debugging
- **Console Logs**: Press F12 → Console tab
- **IndexedDB Viewer**: F12 → Application → Storage → IndexedDB
- **Network Tab**: Monitor service worker caching
- **Lighthouse**: F12 → Lighthouse → Run audit

### Build Optimization
The app is already minified inline. For further optimization:
```bash
# Minify HTML (if editing)
npm install -g html-minifier
html-minifier --collapse-whitespace --remove-comments index.html -o index.min.html

# Compress images
npm install -g sharp-cli
sharp -i icons/icon-512.png -o icons/icon-512-opt.png --webp
```

## Performance

### Lighthouse Scores (Target)
- **Performance**: 95+
- **Accessibility**: 95+
- **Best Practices**: 95+
- **PWA**: 100
- **SEO**: 90+

### Storage Estimates
- **IndexedDB**: ~50MB typical (browser-dependent)
- **App Shell**: < 100KB (HTML+CSS+JS)
- **Images**: ~2-5MB per bike (with compression)
- **Backups**: ~10-50% smaller with gzip compression

## Privacy & Data Handling

### What's Stored Locally
- ✅ Bike records (encrypted if marked sensitive)
- ✅ Credit records (encrypted by default)
- ✅ Images (as binary blobs in IndexedDB)
- ✅ Settings (theme, preferences)
- ✅ Auth data (PIN hash, WebAuthn credentials)

### What's NOT Stored
- ❌ No server-side database
- ❌ No analytics tracking
- ❌ No third-party cookies
- ❌ No cloud sync (all local)

### Data Export
- All data exportable via encrypted backup
- Backup format: JSON with AES-GCM encryption
- Includes: bikes, credit, settings, image metadata
- **Images**: Currently not included in backup (future feature)

## Limitations

### Known Constraints
- **iOS Safari**: Install requires "Add to Home Screen" manual step
- **Firefox**: PWA install less prominent (use Desktop site)
- **Storage**: Quota varies by device (~50MB mobile, ~1GB desktop)
- **Images**: Not included in backup (stored separately)
- **Offline**: Initial install requires network

### Future Enhancements
- [ ] Image EXIF orientation auto-fix
- [ ] Bulk operations (edit, delete, export)
- [ ] Advanced analytics and charts
- [ ] Multi-device sync (optional cloud backup)
- [ ] Internationalization (i18n)
- [ ] Dark mode toggle

## License

MIT License - See repository for full details

## Support

- **Issues**: Open an issue on GitHub
- **Docs**: See this README
- **Security**: Report vulnerabilities privately via GitHub Security

---

**Version**: 1.0.0  
**Last Updated**: 2025-11-11  
**Maintained By**: Cursor AI Agent

### Quick Start Checklist

- [ ] Repository pushed to GitHub
- [ ] GitHub Pages enabled in Settings
- [ ] App accessible at `https://<user>.github.io/<repo>/`
- [ ] PWA installs successfully on test device
- [ ] PIN setup completed
- [ ] Biometric auth tested (if available)
- [ ] Backup exported and restore tested
- [ ] Camera access working
- [ ] Offline mode verified

**Ready to deploy? Push to GitHub and enable Pages!** 🚀
