# Bike Manager v7.0

A modern, offline-first Progressive Web App (PWA) for managing bike inventory with analytics, GitHub Gist sync, and advanced filtering.

## ✨ Features

### Core Functionality
- 📱 **Progressive Web App** - Install on any device, works offline
- 💾 **Offline-First** - All data stored locally using IndexedDB
- 🔄 **GitHub Gist Sync** - Optional cloud backup via private GitHub Gist
- 📊 **Analytics Dashboard** - Charts, metrics, and insights
- 🎨 **Modern UI** - Dark/Light theme with smooth animations
- ⌨️ **Keyboard Shortcuts** - Power user friendly
- 🔍 **Advanced Search** - Fuzzy matching with suggestions
- 📋 **Bulk Operations** - Multi-select and batch actions

### v7.0 New Features
- ✅ Advanced filtering by date range, owner, and profit range
- ✅ Search suggestions with fuzzy matching
- ✅ Improved mobile performance with virtual scrolling
- ✅ Real-time sync indicator
- ✅ Modern toast system using Web Animations API
- ✅ Better chart rendering with smooth animations
- ✅ Auto dark/light theme via system preference
- ✅ Fixed memory leaks and performance issues
- ✅ Better accessibility (ARIA labels, keyboard navigation)

## 🚀 Deployment on GitHub Pages

### Method 1: Direct Deployment

1. **Fork or Clone this repository**
   ```bash
   git clone https://github.com/yourusername/hassanshaikh-developer.github.io.git
   cd hassanshaikh-developer.github.io
   ```

2. **Copy all files to your repository**
   - Ensure `index.html` is in the root
   - Ensure `assets/` folder contains `css/` and `js/` subfolders
   - Ensure `manifest.json` and `service-worker.js` are in root

3. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Deploy Bike Manager v7.0"
   git push origin main
   ```

4. **Enable GitHub Pages**
   - Go to your repository Settings
   - Navigate to Pages section
   - Select source: `main` branch, `/ (root)`
   - Click Save

5. **Access your app**
   - Your app will be available at: `https://yourusername.github.io/repository-name/`
   - Wait a few minutes for GitHub Pages to build

### Method 2: Using GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Pages
        uses: actions/configure-pages@v2
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v1
        with:
          path: '.'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v1
```

## 📦 File Structure

```
.
├── index.html              # Main HTML entry point
├── manifest.json           # PWA manifest
├── service-worker.js       # Service worker for offline support
├── README.md              # This file
└── assets/
    ├── css/
    │   └── style.css      # All styles
    └── js/
        ├── db.js          # Database module (IndexedDB)
        ├── ui.js          # UI components & utilities
        ├── charts.js      # Chart rendering
        ├── sync.js        # GitHub Gist sync
        └── app.js         # Main application logic
```

## ⚙️ Configuration

### GitHub Gist Sync Setup

1. **Create a GitHub Personal Access Token**
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Generate new token (classic)
   - Select `gist` scope
   - Copy the token (starts with `ghp_`)

2. **Create a GitHub Gist**
   - Go to https://gist.github.com
   - Create a new secret gist
   - Note the Gist ID from the URL (e.g., `a1b2c3d4e5f6a7b8c9d0`)

3. **Configure in App**
   - Open Bike Manager
   - Go to Settings
   - Enter Gist ID and filename (default: `bikes_inventory.csv`)
   - Enter your GitHub PAT (stored in sessionStorage)
   - Click "Save Sync Settings"

## 🔧 Development

### Local Development

1. **Serve with a local server** (required for service worker)
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (http-server)
   npx http-server -p 8000
   
   # Using PHP
   php -S localhost:8000
   ```

2. **Open in browser**
   - Navigate to `http://localhost:8000`
   - Open DevTools → Application → Service Workers to verify registration

### Testing Offline

1. Open Chrome DevTools
2. Go to Network tab
3. Select "Offline" from throttling dropdown
4. Refresh the page - app should work offline

## 🐛 Troubleshooting

### Service Worker Not Registering

- Ensure you're serving over HTTP/HTTPS (not `file://`)
- Check browser console for errors
- Clear cache and hard reload (Ctrl+Shift+R)

### Sync Not Working

- Verify Gist ID and PAT are correct
- Check browser console for API errors
- Ensure PAT has `gist` scope enabled
- Verify Gist exists and is accessible

### Data Not Persisting

- Check browser storage quota (DevTools → Application → Storage)
- Ensure IndexedDB is enabled in browser settings
- Check console for database errors

## 📱 Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (iOS 11.3+, macOS 11.1+)
- ✅ Samsung Internet

## 🔒 Privacy & Security

- All data stored locally in your browser
- GitHub PAT stored only in sessionStorage (cleared on tab close)
- No data sent to third parties except GitHub Gist (if configured)
- All code runs client-side

## 📄 License

MIT License - feel free to use and modify for your needs.

## 🙏 Credits

- Built with vanilla JavaScript (no frameworks)
- Uses [Dexie.js](https://dexie.org) for IndexedDB
- Uses [Chart.js](https://www.chartjs.org) for analytics
- Icons from Material Design Icons

## 🆘 Support

For issues or questions:
1. Check the browser console for errors
2. Verify all files are correctly deployed
3. Ensure service worker is registered
4. Check GitHub Pages build logs

---

**Made with ❤️ for bike dealers and inventory managers**

