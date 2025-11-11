# Bike Manager PWA

A production-grade, mobile-first Progressive Web App for managing bike sales, inventory, and credit transactions. Built as a single-file application with advanced security features, offline-first architecture, and zero external dependencies.

## 🚀 Features

### Core Functionality
- **Dashboard**: Real-time metrics for revenue, profit, inventory, and cash flow
- **Bike Management**: Track purchases, sales, repairs, and status
- **Credit Tracking**: Monitor credit transactions and outstanding payments
- **Analytics**: Sales trends and business insights

### Security & Privacy
- **End-to-End Encryption**: AES-GCM encryption for sensitive data at rest
- **PIN Protection**: PBKDF2-based key derivation (250k iterations)
- **Biometric Authentication**: WebAuthn support with PIN fallback
- **Auto-Lock**: Configurable inactivity timeout (default: 5 minutes)
- **Sensitive Data Masking**: Blur protection for financial information when locked

### Advanced Features
- **In-App Camera**: Multi-shot capture with WebP compression
- **Image Management**: Store and manage multiple images per bike
- **Encrypted Backup/Restore**: Export and import data securely
- **Offline-First**: Full functionality without internet connection
- **Auto-Update**: Service worker automatically updates the app
- **Installable**: Add to home screen on iOS and Android

## 📦 Architecture

### Single-File Design
- **index.html**: Complete app (~900 lines) - all HTML, CSS, and JavaScript inlined
- **manifest.webmanifest**: PWA manifest for installability
- **sw.js**: Service worker for offline caching and updates
- **Zero external dependencies**: No CDN, no frameworks, pure vanilla JS

### Technology Stack
- **Storage**: IndexedDB for structured data + Blobs
- **Encryption**: Web Crypto API (AES-GCM, PBKDF2, SHA-256)
- **Authentication**: WebAuthn (platform authenticator)
- **Media**: MediaDevices.getUserMedia + Canvas API
- **PWA**: Service Worker + Cache API
- **Styling**: Minimal utility CSS (~300 lines)

### Browser Support
- **Target**: Chrome 100+ (desktop & mobile)
- **Tested**: Chrome, Edge, Safari (iOS PWA)
- **Required APIs**: IndexedDB, Web Crypto, Service Workers

## 🛠️ Development

### Local Testing
```bash
# Serve with any static file server
python3 -m http.server 8000
# or
npx serve

# Open browser to http://localhost:8000
```

### File Structure
```
/workspace/
├── index.html              # Single-file app (main deliverable)
├── manifest.webmanifest    # PWA manifest
├── sw.js                   # Service worker
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## 🌐 GitHub Pages Deployment

### Option 1: Deploy via GitHub UI
1. Go to repository **Settings** → **Pages**
2. Select **Source**: Deploy from a branch
3. Select **Branch**: `main` (or your branch) and `/` (root)
4. Click **Save**
5. Your app will be available at `https://<username>.github.io/<repo>/`

### Option 2: Deploy via Command Line
```bash
# Ensure you're on the correct branch
git checkout main

# Commit your changes
git add index.html manifest.webmanifest sw.js icons/
git commit -m "Deploy production PWA"

# Push to GitHub
git push origin main

# Enable GitHub Pages (first time only)
gh api repos/:owner/:repo/pages -X POST -f source[branch]=main -f source[path]=/
```

### Post-Deployment Configuration
1. **Update manifest paths** (if deploying to subdirectory):
   ```json
   {
     "start_url": "/your-repo-name/",
     "scope": "/your-repo-name/"
   }
   ```

2. **Update Service Worker** (if subdirectory):
   ```js
   // In sw.js, adjust PRECACHE_ASSETS paths
   const PRECACHE_ASSETS = [
     '/your-repo-name/',
     '/your-repo-name/index.html',
     // ...
   ];
   ```

3. **Custom Domain** (optional):
   - Add `CNAME` file with your domain
   - Configure DNS: `A` or `CNAME` record to GitHub Pages

### Verification Checklist
- [ ] App loads correctly at GitHub Pages URL
- [ ] Service worker registers successfully (check DevTools → Application)
- [ ] Manifest is valid (check DevTools → Application → Manifest)
- [ ] App is installable (check for install prompt)
- [ ] All assets load (check Network tab)
- [ ] Offline mode works (DevTools → Application → Service Workers → Offline)

## 🔒 Security Features

### Data Encryption
- **Algorithm**: AES-GCM (256-bit key)
- **Key Derivation**: PBKDF2-HMAC-SHA256 (250,000 iterations)
- **Salt**: 16-byte random salt per user
- **IV**: 12-byte random IV per encryption operation

### Authentication Flow
1. **First Launch**: User sets up PIN (4-12 digits)
2. **Biometric Setup** (optional): Register WebAuthn credential
3. **Unlock**: Biometric → PIN fallback → Decrypt master key
4. **Auto-Lock**: Lock after 5 minutes of inactivity

### Content Security Policy
```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data:;
connect-src 'self';
```

## 📱 Installation Instructions

### iOS (Safari)
1. Open the app in Safari
2. Tap the **Share** button
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add**

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (⋮) → **Install app** or **Add to Home screen**
3. Tap **Install**

### Desktop (Chrome/Edge)
1. Open the app in Chrome or Edge
2. Look for the install icon (⊕) in the address bar
3. Click **Install**

## 🔧 Configuration

### Adjust Auto-Lock Timeout
Edit `index.html` and change:
```js
const AUTO_LOCK_TIMEOUT = 300000; // 5 minutes (in milliseconds)
```

### Change Theme Colors
Edit `index.html` CSS variables:
```css
:root {
  --blue-500: #3b82f6; /* Primary color */
  --gray-100: #f3f4f6; /* Background */
  /* ... */
}
```

### Modify Storage Quotas
Check available storage:
```js
navigator.storage.estimate().then(est => {
  console.log(`${est.usage} / ${est.quota} bytes used`);
});
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] First-time PIN setup
- [ ] Lock/unlock with PIN
- [ ] Biometric authentication (if supported)
- [ ] Auto-lock after timeout
- [ ] Sensitive data masking
- [ ] Add/edit/delete bikes
- [ ] Camera capture (multiple images)
- [ ] Image preview and deletion
- [ ] Backup export (encrypted)
- [ ] Backup import (merge vs replace)
- [ ] Offline functionality
- [ ] Service worker update flow
- [ ] Install as PWA
- [ ] Responsive design (mobile, tablet, desktop)

### Lighthouse Audit
```bash
# Run Lighthouse via CLI
npx lighthouse https://your-url.com --view

# Target Scores:
# - Performance: 90+
# - PWA: 95+
# - Accessibility: 95+
# - Best Practices: 95+
```

## 📊 Performance

### Metrics
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Total Bundle Size**: ~50KB (index.html)
- **Cache-First Load**: < 100ms

### Optimization Techniques
- Inlined CSS (no external stylesheet)
- Minimal JavaScript (no frameworks)
- WebP image compression
- Service worker caching
- Lazy image loading
- CSS containment
- `prefers-reduced-motion` support

## 🐛 Troubleshooting

### App won't install
- Ensure HTTPS (required for PWA)
- Check manifest.webmanifest is valid
- Verify service worker registers successfully
- Clear browser cache and try again

### Service worker not updating
- Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
- DevTools → Application → Service Workers → Unregister
- Clear site data and reload

### IndexedDB errors
- Check available storage quota
- Clear site data and reset
- Ensure browser supports IndexedDB

### Camera not working
- Check HTTPS (required for getUserMedia)
- Grant camera permissions
- Ensure device has camera
- Try fallback file input

### Biometric auth fails
- Verify WebAuthn support: `window.PublicKeyCredential`
- Check platform authenticator available
- Re-register credential
- Use PIN fallback

## 🔄 Update Process

### Manual Update Check
Settings → Check for Updates

### Automatic Updates
- Service worker checks for updates on page load
- User notified when update available
- Click "Update Available" to install

### Force Update
```js
// In DevTools console
navigator.serviceWorker.getRegistration().then(reg => reg.update());
```

## 📝 Data Schema

### Entry (Bike)
```typescript
{
  id: string;           // UUID v4
  createdAt: string;    // ISO 8601
  updatedAt: string;    // ISO 8601
  name: string;         // Bike name/model
  plateNumber?: string;
  purchasePrice: number;
  salePrice?: number;
  repairCost?: number;
  status: 'unsold' | 'sold';
  isSensitive: boolean;
  images: string[];     // Array of image IDs
}
```

### Image
```typescript
{
  id: string;      // UUID v4
  blob: Blob;      // WebP image
  createdAt: string;
}
```

### Backup Format
```json
{
  "version": 1,
  "encrypted": true,
  "ciphertext": "base64...",
  "iv": "base64...",
  "exportDate": "2025-11-11T..."
}
```

## 🤝 Contributing

This is a single-file, self-contained application optimized for production. Modifications should maintain:
- Single-file architecture
- Zero external dependencies
- Exact UI/UX preservation
- Security best practices

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Resources

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [WebAuthn Guide](https://webauthn.guide/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

**Version**: 2.0.0  
**Last Updated**: 2025-11-11  
**Maintained by**: Bike Manager Team
