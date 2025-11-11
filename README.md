# Bike Manager PWA

A production-grade, mobile-first Progressive Web App for managing bike inventory, built as a single-file application with advanced security features.

## 🎯 Features

### Core Functionality
- **Bike Inventory Management**: Track bikes with detailed information including brand, model, pricing, status, and notes
- **Dashboard**: Real-time overview of total bikes, stock levels, sold items, and total inventory value
- **Search & Filter**: Quickly find bikes by brand or model
- **Image Support**: Multi-image capture and upload with automatic compression

### Security & Privacy
- **PIN Authentication**: 4-12 digit PIN with PBKDF2 (250,000 iterations) key derivation
- **Biometric Authentication**: WebAuthn support for platform authenticators (Face ID, Touch ID, Windows Hello)
- **Encryption at Rest**: AES-GCM 256-bit encryption for sensitive bike data
- **Auto-Lock**: Configurable inactivity timeout (5 minutes default)
- **Session Management**: Secure key handling with memory cleanup on lock

### Data Management
- **Encrypted Backups**: Export/import with full encryption, checksum verification
- **IndexedDB Storage**: Fully local database with no network dependencies
- **Image Optimization**: Automatic compression to WebP with configurable size limits
- **Quota Management**: Storage estimation and limits

### PWA Features
- **Offline First**: Full functionality without internet connection
- **Installable**: Add to home screen on mobile and desktop
- **Auto-Updates**: Service worker with version management
- **Responsive**: Mobile-first design that works on all screen sizes

## 🚀 Deployment to GitHub Pages

### Prerequisites
- GitHub account
- Git installed locally

### Steps

1. **Create a GitHub repository**
   ```bash
   # Initialize git (if not already done)
   git init
   
   # Add your files
   git add .
   git commit -m "Initial commit: Bike Manager PWA"
   
   # Add remote (replace with your repo URL)
   git remote add origin https://github.com/YOUR_USERNAME/bike-manager.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Under "Source", select "Deploy from a branch"
   - Select branch: `main` and folder: `/ (root)`
   - Click "Save"

3. **Access your app**
   - Your app will be available at: `https://YOUR_USERNAME.github.io/bike-manager/`
   - Wait 1-2 minutes for initial deployment

### Important Notes for GitHub Pages

- **HTTPS Required**: GitHub Pages provides HTTPS automatically, which is required for:
  - Service Workers
  - WebAuthn (biometric authentication)
  - Camera access
  - Secure Context APIs

- **Relative Paths**: All paths in this app use relative references (`.` and `./`) which work correctly on GitHub Pages

- **Service Worker Scope**: The service worker is registered with `scope: './'` which works from the repository root

## 📱 Installation & Usage

### First Time Setup

1. **Open the app** in Chrome (mobile or desktop)
2. **Create a PIN**: On first launch, you'll be prompted to create a 4-12 digit PIN
3. **Optional: Enable Biometrics**:
   - Go to Settings
   - Toggle "Enable Biometric Authentication"
   - Follow the prompts to register your device's biometric sensor

### Installing as PWA

#### Android (Chrome)
1. Open the app in Chrome
2. Tap the "Install App" button, or
3. Tap the menu (⋮) → "Install app" or "Add to Home screen"

#### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"

#### Desktop (Chrome/Edge)
1. Open the app in Chrome or Edge
2. Click the install icon (⊕) in the address bar, or
3. Click menu → "Install Bike Manager"

### Using the App

#### Adding a Bike
1. Tap the "Add Bike" button on the Dashboard
2. Fill in required fields:
   - Brand (required)
   - Model (required)
   - Purchase Price (required)
   - Status (In Stock / Sold)
3. Optional fields:
   - Sale Price
   - Notes (up to 500 characters)
   - Mark as Sensitive (encrypts this bike's data)
4. Add images:
   - Tap "Take Photos" to use camera
   - Tap "Upload Images" to select from device
5. Tap "Save"

#### Managing Bikes
- **View All**: Go to "Bikes" tab
- **Search**: Type in the search box to filter by brand/model
- **Edit**: Tap the pencil icon on any bike card
- **Delete**: Tap the trash icon and confirm

#### Security Features
- **Lock/Unlock**: Tap the lock icon in the top bar
- **Auto-Lock**: Enable in Settings to automatically lock after 5 minutes of inactivity
- **Sensitive Data**: Mark bikes as sensitive to encrypt their details at rest

#### Backup & Restore
1. **Export Backup**:
   - Go to Settings → "Export Backup"
   - Save the `.enc.json` file to a safe location
   - This file is encrypted and requires your PIN to restore

2. **Import Backup**:
   - Go to Settings → "Import Backup"
   - Select your backup file
   - Enter your PIN to decrypt
   - Data will be restored and app will reload

## 🔒 Security Model

### Encryption Architecture
- **Key Derivation**: PBKDF2-HMAC-SHA-256 with 250,000 iterations
- **Encryption**: AES-GCM with 256-bit keys
- **Salt**: Unique 128-bit random salt per PIN
- **IV**: Unique 96-bit random IV per encryption operation

### Data Storage
- **IndexedDB Stores**:
  - `bikes`: Encrypted bike records (when marked sensitive)
  - `images`: Image blobs (not encrypted but stored locally only)
  - `settings`: App preferences and feature flags
  - `auth`: PIN hash, salt, WebAuthn credentials (never stores plaintext PIN)

### Threat Model
- ✅ **Protects Against**:
  - Physical device access (with auto-lock enabled)
  - Backup file theft (encrypted backups)
  - Local storage inspection (encrypted sensitive data)

- ⚠️ **Does Not Protect Against**:
  - Active memory inspection while unlocked
  - Compromised device/browser
  - Sophisticated forensic analysis

### Privacy
- **No Network Calls**: All data stays on your device
- **No Analytics**: No tracking or telemetry
- **No Third-Party Scripts**: All code is inline and self-contained

## 🛠️ Technical Architecture

### Single-File Design
- **index.html**: Contains all HTML, CSS, and JavaScript (~1000 lines total)
- **manifest.webmanifest**: PWA metadata (~40 lines)
- **sw.js**: Service worker for offline support (~150 lines)

### Internal Modules
The app uses IIFE (Immediately Invoked Function Expressions) to organize code:
- **Crypto**: Encryption, decryption, key derivation, hashing
- **DB**: IndexedDB wrapper with promise-based API
- **Auth**: PIN/biometric authentication, lock/unlock, session management
- **Camera**: Camera access, capture, image compression
- **Data**: CRUD operations for bikes and images
- **Backup**: Encrypted export/import with schema validation
- **UI**: View rendering, modal management, event handling
- **PWA**: Service worker registration, install prompts, updates

### Browser Requirements
- **Chrome 90+** (recommended)
- **Edge 90+** (Chromium-based)
- **Safari 15+** (limited WebAuthn support)

### API Usage
- **IndexedDB**: Structured data storage
- **WebCrypto**: Encryption and key derivation
- **WebAuthn**: Biometric authentication
- **MediaDevices**: Camera access
- **Canvas API**: Image compression and resizing
- **Service Workers**: Offline caching
- **File System Access API**: Backup downloads (with fallback)

## 📊 Storage Limits

### Recommended Limits (Implemented)
- **Max Image Size**: 8MB per image (pre-compression)
- **Max Image Dimensions**: 1920px (auto-scaled)
- **Max Notes Length**: 500 characters
- **PIN Length**: 4-12 digits

### Browser Quotas
- Chrome: ~60% of available disk space (temporary storage)
- Storage API provides `navigator.storage.estimate()` for quota checks

## 🐛 Troubleshooting

### Camera Not Working
- Ensure HTTPS (required for camera access)
- Check browser permissions: Settings → Site Permissions → Camera
- Try a different browser if issues persist

### Biometrics Not Working
- Ensure device has biometric hardware (Face ID, Touch ID, etc.)
- Verify browser supports WebAuthn (Chrome 90+, Safari 15+)
- Check that biometrics are configured in device settings
- Fallback to PIN if biometric auth fails

### App Won't Install
- Ensure using Chrome or Chromium-based browser
- Check that app is served over HTTPS
- Try clearing browser cache and reloading
- Some browsers block install on certain domains

### Data Not Persisting
- Check browser storage settings (not in Incognito mode)
- Ensure sufficient device storage
- Check browser data clearing settings
- Export backup before clearing browser data

### Backup Won't Restore
- Ensure using same PIN that created the backup
- Check file is not corrupted (should be valid JSON)
- Verify backup file has `.enc.json` extension
- Try backup from a fresh export

## 🔄 Updates

The app includes auto-update capabilities via Service Worker:

1. Check for updates: Settings → "Check for Updates"
2. When update is available, you'll see a toast notification
3. Reload the page to apply updates
4. Old cached versions are automatically cleaned up

## 📄 License

This is a private project. All rights reserved.

## 🙏 Acknowledgments

Built with:
- Vanilla JavaScript (ES2022+)
- Web Platform APIs (no frameworks)
- Progressive Web App standards
- Modern CSS (custom properties, flexbox, grid)

## 📞 Support

For issues or questions:
1. Check the Troubleshooting section above
2. Verify you're using a supported browser
3. Ensure app is served over HTTPS
4. Export a backup before attempting fixes

## 🔮 Future Enhancements

Potential improvements:
- [ ] Compressed backups (gzip via CompressionStream)
- [ ] Web Share API for sharing bikes
- [ ] Background sync for future cloud features
- [ ] Wake Lock API during photo sessions
- [ ] View Transitions API for smoother navigation
- [ ] Multi-language support (i18n)
- [ ] Advanced analytics and reporting
- [ ] Bulk operations on bikes

---

**Version**: 1.0.0  
**Last Updated**: 2025-11-11  
**Minimum Browser**: Chrome 90+, Edge 90+, Safari 15+
