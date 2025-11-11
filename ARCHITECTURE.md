# Architecture Documentation

## Overview

Bike Manager is a production-grade, single-file Progressive Web App designed for mobile-first bike inventory management with enterprise-level security features.

## Design Principles

1. **Single-File Architecture**: All application logic consolidated into `index.html` for minimal HTTP requests and maximum simplicity
2. **Security First**: Encryption at rest, PIN/biometric authentication, secure key management
3. **Offline First**: Full functionality without network connectivity
4. **Zero Dependencies**: No external frameworks or libraries
5. **Progressive Enhancement**: Core features work everywhere, advanced features where supported

## File Structure

```
/workspace/
├── index.html              # Single-file app (~1000 lines)
│   ├── <head>             # Meta, CSP, manifest link
│   ├── <style>            # Inline CSS (~300 lines)
│   ├── <body>             # Semantic HTML structure
│   └── <script>           # Modular JavaScript (~600 lines)
├── manifest.webmanifest    # PWA metadata (~40 lines)
├── sw.js                   # Service worker (~150 lines)
├── icons/                  # App icons
│   ├── icon-192.png
│   └── icon-512.png
└── README.md               # User documentation
```

## Technology Stack

### Core Technologies
- **HTML5**: Semantic markup, forms with validation
- **CSS3**: Custom properties, flexbox, grid, media queries
- **JavaScript ES2022+**: Modules, async/await, classes, destructuring

### Web Platform APIs
- **IndexedDB**: Structured data storage (bikes, images, settings, auth)
- **Web Crypto API**: PBKDF2, AES-GCM, SHA-256
- **WebAuthn**: Platform authenticators (biometrics)
- **MediaDevices**: Camera access via getUserMedia
- **Canvas API**: Image compression and resizing
- **Service Workers**: Offline caching and updates
- **Cache API**: Static asset storage
- **File API**: Backup export/import
- **Blob API**: Image storage

## Application Modules

### Internal Module Architecture

The app uses IIFE (Immediately Invoked Function Expressions) to create isolated modules:

```javascript
const ModuleName = (() => {
  // Private variables and functions
  let privateVar = null;
  
  const privateFunction = () => {
    // Implementation
  };
  
  // Public API
  return {
    publicMethod1,
    publicMethod2
  };
})();
```

### Module Breakdown

#### 1. Crypto Module
**Purpose**: Encryption, decryption, key derivation, hashing

**API**:
- `deriveKey(pin, salt)` → CryptoKey
- `hashPin(pin, salt)` → base64 hash
- `encrypt(data, key)` → {ciphertext, iv}
- `decrypt(ciphertext, iv, key)` → data
- `sha256(data)` → base64 hash
- `arrayBufferToBase64(buffer)` → string
- `base64ToArrayBuffer(base64)` → ArrayBuffer

**Implementation Details**:
- PBKDF2-HMAC-SHA-256 with 250,000 iterations
- AES-GCM with 256-bit keys
- Random 128-bit salt per PIN
- Random 96-bit IV per encryption

#### 2. Database (DB) Module
**Purpose**: IndexedDB wrapper with promise-based API

**API**:
- `init()` → Promise<IDBDatabase>
- `get(store, key)` → Promise<any>
- `getAll(store)` → Promise<any[]>
- `put(store, value)` → Promise<IDBValidKey>
- `remove(store, key)` → Promise<void>
- `clear(store)` → Promise<void>

**Stores**:
- `bikes`: Bike records with optional encryption
- `images`: Blob storage keyed by image ID
- `settings`: App preferences and feature flags
- `auth`: PIN hash/salt, WebAuthn credentials

**Schema** (Version 1):
```typescript
interface Bike {
  id: string;              // UUID v4
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
  brand: string;           // Required, 1-50 chars
  model: string;           // Required, 1-50 chars
  price: number;           // Required, >= 0
  status: 'stock' | 'sold';
  salePrice?: number;      // Optional
  notes?: string;          // Max 500 chars
  isSensitive: boolean;    // Encryption flag
  images: string[];        // Array of image IDs
  encrypted?: {            // Present when isSensitive=true
    ciphertext: string;
    iv: string;
  };
}

interface Image {
  id: string;
  blob: Blob;
  createdAt: string;
}

interface Setting {
  key: string;
  [key: string]: any;
}

interface AuthData {
  key: 'pin' | 'webauthn';
  // For PIN:
  hash?: string;
  salt?: string;
  iterations?: number;
  // For WebAuthn:
  credentialId?: string;
  enabled?: boolean;
}
```

#### 3. Auth Module
**Purpose**: Authentication, authorization, session management

**API**:
- `checkPinExists()` → Promise<boolean>
- `setupPin(pin)` → Promise<boolean>
- `verifyPin(pin)` → Promise<boolean>
- `unlock(pin)` → Promise<boolean>
- `lock()` → void
- `requestUnlock()` → Promise<boolean>
- `getSessionKey()` → CryptoKey | null
- `isSessionLocked()` → boolean
- `resetAutoLock()` → Promise<void>
- `registerBiometric()` → Promise<boolean>
- `authenticateBiometric()` → Promise<boolean>

**State Management**:
- `isLocked`: Boolean flag
- `sessionKey`: In-memory CryptoKey (cleared on lock)
- `autoLockTimer`: Timeout handle for auto-lock

**Security Features**:
- PIN never stored in plaintext
- Session key lives in memory only
- Automatic key cleanup on lock/unload
- Configurable auto-lock timeout (default: 5 minutes)
- Activity tracking for auto-lock reset

#### 4. Camera Module
**Purpose**: Camera access, capture, image processing

**API**:
- `start()` → Promise<boolean>
- `stop()` → void
- `capture()` → Promise<Shot>
- `removeShot(id)` → void
- `getShots()` → Shot[]
- `clearShots()` → void
- `compressImage(blob)` → Promise<Blob>

**Features**:
- Environment-facing camera preference
- Multi-shot capture with preview
- Automatic WebP compression (85% quality)
- Smart resizing (max 1920px dimension)
- Efficient memory management (URL revocation)

#### 5. Data Module
**Purpose**: Business logic for bikes and images

**API**:
- `saveBike(bike)` → Promise<Bike>
- `getBikes()` → Promise<Bike[]>
- `deleteBike(id)` → Promise<void>
- `saveImage(blob)` → Promise<string>
- `getImage(id)` → Promise<Blob>

**Logic**:
- Automatic encryption for sensitive bikes
- Transparent decryption when unlocked
- Timestamp management (createdAt, updatedAt)
- UUID generation for new records
- Cascading image deletion

#### 6. Backup Module
**Purpose**: Encrypted export/import

**API**:
- `exportData()` → Promise<void>
- `importData(file)` → Promise<void>

**Backup Format**:
```json
{
  "version": 1,
  "app": "BikeManager",
  "kdf": "PBKDF2-HMAC-SHA-256",
  "iterations": 250000,
  "salt": "base64",
  "iv": "base64",
  "cipher": "AES-GCM",
  "payload": "base64_encrypted_data",
  "checksum": "sha256_base64"
}
```

**Features**:
- Full data export (bikes, images, settings)
- Base64 encoding for images
- SHA-256 checksum verification
- Schema version validation
- Encrypted with session key

#### 7. UI Module
**Purpose**: View rendering, event handling, navigation

**API**:
- `init()` → void
- `switchPage(page)` → void
- `renderDashboard()` → Promise<void>
- `renderBikes(search?)` → Promise<void>
- `openBikeForm(bike?)` → void

**Responsibilities**:
- Page navigation and routing
- Form submission handling
- Modal management
- Event delegation
- Data binding and rendering
- Activity tracking for auto-lock

#### 8. PWA Module
**Purpose**: Progressive Web App features

**API**:
- `init()` → void

**Features**:
- Service worker registration
- Install prompt handling
- Update detection
- Version display

## Data Flow

### Adding a Bike

```
User fills form
  ↓
UI.handleBikeSubmit()
  ↓
Auth.requestUnlock() [if locked]
  ↓
Camera.getShots() → Save images
  ↓
Data.saveBike(bike)
  ↓
[if sensitive] Crypto.encrypt() with sessionKey
  ↓
DB.put('bikes', bike)
  ↓
UI.renderBikes() + UI.renderDashboard()
```

### Unlocking App

```
User enters PIN
  ↓
Auth.unlock(pin)
  ↓
Auth.verifyPin(pin) → Check hash
  ↓
Crypto.deriveKey(pin, salt) → Generate session key
  ↓
Set isLocked = false
  ↓
Store sessionKey in memory
  ↓
Auth.resetAutoLock() → Start timer
  ↓
UI.refreshCurrentPage() → Re-render with decrypted data
```

### Backup Export

```
User clicks "Export Backup"
  ↓
Auth.requestUnlock() [if locked]
  ↓
Backup.exportData()
  ↓
DB.getAll() for all stores
  ↓
Convert images to base64
  ↓
Crypto.encrypt(data, sessionKey)
  ↓
Crypto.sha256() → Generate checksum
  ↓
Create backup object with metadata
  ↓
JSON.stringify() + Blob + download
```

## Security Architecture

### Threat Model

**Protects Against**:
- ✅ Local storage inspection (encrypted sensitive data)
- ✅ Backup file theft (encrypted backups)
- ✅ Physical device access (lock + auto-lock)
- ✅ Casual snooping (sensitive data masking)

**Does Not Protect Against**:
- ❌ Active memory inspection while unlocked
- ❌ Compromised browser/device
- ❌ Sophisticated forensic analysis
- ❌ Side-channel attacks

### Key Management

```
User PIN
  ↓
PBKDF2(pin, salt, 250k iterations)
  ↓
AES-GCM Key (256-bit)
  ↓
[Stored in memory as sessionKey]
  ↓
Used for encrypt/decrypt operations
  ↓
Cleared on lock/unload
```

**Key Properties**:
- Never persisted to disk
- Derived on-demand from PIN
- Automatically cleared on inactivity
- Separate key per session

### Encryption at Rest

```
Sensitive Bike Data
  ↓
JSON.stringify()
  ↓
AES-GCM Encrypt with sessionKey + random IV
  ↓
Store { ciphertext, iv } in IndexedDB
  ↓
Replace plaintext fields with '***'
```

**When Locked**:
- Sensitive fields show as '***'
- Cannot decrypt without PIN
- UI applies `.sensitive-mask` class

**When Unlocked**:
- Transparent decryption on read
- User sees actual values
- Can edit and re-encrypt

## Service Worker Strategy

### Cache Strategy

**Network First** (HTML):
- Try network
- Fall back to cache
- Update cache on success

**Cache First** (Static Assets):
- Try cache
- Fall back to network
- Update cache on miss

**Stale While Revalidate** (Other):
- Serve from cache immediately
- Fetch in background
- Update cache for next time

### Version Management

```javascript
const VERSION = '1.0.0';
const CACHE_NAME = `bike-manager-v${VERSION}`;

// On activate:
- Delete all caches except CACHE_NAME
- Claim clients immediately
```

### Update Flow

```
New version deployed
  ↓
Browser fetches sw.js
  ↓
Service worker detects version change
  ↓
Fires 'updatefound' event
  ↓
App shows toast: "Update available"
  ↓
User reloads page
  ↓
New SW activates, clears old cache
  ↓
Fresh content loaded
```

## Performance Optimizations

### Code Size
- Single file reduces HTTP requests
- Inline CSS/JS eliminates round trips
- Minimal HTML structure
- No framework overhead

### Image Handling
- WebP compression (smaller than JPEG/PNG)
- Smart resizing (max 1920px)
- Lazy blob loading (createObjectURL)
- Proper cleanup (revokeObjectURL)

### Rendering
- Efficient DOM updates (innerHTML for lists)
- Event delegation for dynamic content
- CSS transitions (hardware accelerated)
- Minimal reflows/repaints

### Storage
- IndexedDB for structured data
- Blob storage for images
- Batch operations where possible
- Cleanup on delete (cascade)

## Accessibility

### Keyboard Navigation
- Semantic HTML elements
- Proper tab order
- Focus management in modals

### Screen Readers
- Descriptive button text
- ARIA labels where needed
- Form labels properly associated

### Visual
- High contrast colors
- Sufficient touch targets (44x44px minimum)
- Respects prefers-reduced-motion

## Browser Compatibility

### Required APIs
- ✅ IndexedDB (all modern browsers)
- ✅ Web Crypto (all modern browsers)
- ✅ Service Workers (Chrome 40+, Safari 11.1+)
- ⚠️ WebAuthn (Chrome 67+, Safari 13+, limited on iOS)
- ⚠️ getUserMedia (HTTPS required)

### Graceful Degradation
- WebAuthn: Falls back to PIN only
- Camera: Falls back to file upload
- Service Worker: App still works, no offline

### Tested Browsers
- Chrome 90+ (Desktop & Android) ✅
- Edge 90+ (Desktop) ✅
- Safari 15+ (Desktop & iOS) ⚠️ (limited WebAuthn)
- Firefox 88+ ⚠️ (not primary target)

## Testing Strategy

### Manual Testing Checklist

**Core Functionality**:
- [ ] Add bike with all fields
- [ ] Edit bike
- [ ] Delete bike
- [ ] Search bikes
- [ ] Dashboard stats update

**Images**:
- [ ] Camera capture (multiple shots)
- [ ] File upload (multiple files)
- [ ] Image preview
- [ ] Image deletion
- [ ] Image persistence

**Security**:
- [ ] PIN setup (first time)
- [ ] Lock/unlock
- [ ] Auto-lock after timeout
- [ ] Sensitive bike encryption
- [ ] Biometric registration
- [ ] Biometric authentication

**Backup/Restore**:
- [ ] Export backup
- [ ] Import backup
- [ ] Checksum verification
- [ ] Schema validation
- [ ] Round-trip integrity

**PWA**:
- [ ] Install prompt
- [ ] Add to home screen
- [ ] Offline mode
- [ ] Update detection
- [ ] Icon display

### Automated Testing
- Currently none (manual QA)
- Future: Lighthouse CI for PWA score
- Future: Playwright for E2E

## Deployment

### GitHub Pages Setup

1. **Repository**: Push code to GitHub
2. **Settings**: Enable Pages from `main` branch
3. **DNS**: Optional custom domain with HTTPS
4. **Deploy**: Automatic on push to `main`

### Hosting Requirements
- ✅ HTTPS (required for PWA features)
- ✅ Static hosting (no server-side code)
- ✅ Relative paths (works in subdirectories)
- ✅ Service worker scope (`.` works universally)

### Build Process
- None required (single-file app)
- Optional: Minify HTML/CSS/JS for production
- Optional: Image optimization for icons

## Maintenance

### Version Updates
1. Update `VERSION` constant in `index.html`
2. Update `VERSION` in `sw.js`
3. Update version in `README.md`
4. Commit and push
5. GitHub Pages auto-deploys
6. Users get update notification on next visit

### Adding Features
1. Add to appropriate module
2. Update public API if needed
3. Test thoroughly
4. Update documentation
5. Increment version

### Breaking Changes
- Require schema migration in `DB.init()`
- Bump `DB_VERSION` constant
- Handle in `onupgradeneeded` event

## Future Enhancements

### Planned
- Compressed backups (gzip via CompressionStream)
- View Transitions API for navigation
- File System Access API for direct save
- Wake Lock API during camera session

### Consideration
- Web Share API for bike sharing
- Background Sync for future cloud sync
- Push Notifications for reminders
- Internationalization (i18n)

## References

### Web Standards
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Web Crypto](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [WebAuthn](https://webauthn.guide/)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [PWA](https://web.dev/progressive-web-apps/)

### Security
- [OWASP Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [PBKDF2 Recommendations](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

---

**Document Version**: 1.0.0  
**Last Updated**: 2025-11-11  
**Maintainer**: Development Team
