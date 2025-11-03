/**
 * Bike Manager - Main Application
 * Core application class with initialization and core utilities
 */

// Constants
const OLD_STORAGE_KEY = 'bikes_db_v2';
const SETTINGS_KEY = 'bike_manager_settings_v6';
const PAT_KEY = 'bike_manager_pat_v6';
const THEME_KEY = 'bike_manager_theme';
const UNDO_KEY = 'bike_manager_undo_v6_3';
const ITEMS_PER_PAGE = 50;

/**
 * Main BikeManagerApp class
 */
class BikeManagerApp {
  constructor() {
    this.db = null;
    this.charts = {};
    this.currentFilters = {
      search: '',
      status: 'all',
      sort: 'latest',
    };
    this.settings = {
      businessName: 'Bike Manager',
      currency: '₹',
      gistId: '',
      gistFilename: 'bikes_inventory.csv',
      githubPat: '',
      lastSync: null,
      lastSyncSha: null,
      listDensity: 'comfortable',
    };
    this.currentView = 'view-list';
    this.isMobile = window.innerWidth < 768;
    this.isOnline = navigator.onLine;
    this.selectedBikes = new Set();
    this.undoStack = [];
    this.currentPage = 1;
    this.totalPages = 1;
    this.statsDateFilter = { from: null, to: null };
    this.currentBikeId = null;

    // Debounced functions
    this.debouncedRenderList = this.debounce(() => this.renderBikeList(), 250);
    this.debouncedSyncNow = this.debounce(() => this.syncNowInternal(), 5000, true);

    // Cache DOM elements
    this.dom = {
      loader: document.getElementById('app-loader'),
      loaderStatus: document.getElementById('app-loader-status'),
      headerTitle: document.getElementById('header-title'),
      views: document.querySelectorAll('.view'),
      navButtons: document.querySelectorAll('.nav-btn'),
      syncStatus: document.getElementById('sync-status'),
      syncStatusText: document.getElementById('sync-status-text'),
      syncNowBtn: document.getElementById('sync-now-btn'),
      searchClear: document.getElementById('search-clear'),
      searchInput: document.getElementById('search-input'),
      formModal: document.getElementById('form-modal'),
      bikeList: document.getElementById('bike-list'),
      bikeListSkeleton: document.getElementById('bike-list-skeleton'),
      bikeListEmpty: document.getElementById('bike-list-empty'),
      pagination: document.getElementById('pagination'),
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  /**
   * Primary initialization
   */
  async init() {
    try {
      console.log('Starting initialization...');
      this.vibrate(10);

      // 1. Service Worker
      this.initServiceWorker();

      // 2. Initialize Database
      this.updateLoaderStatus('Initializing database...');
      await this.initDatabase();

      // 3. Load Settings
      this.updateLoaderStatus('Loading settings...');
      await this.loadSettings();

      // 4. Clean corrupted data
      this.updateLoaderStatus('Cleaning data (if any)...');
      await this.cleanCorruptedData();

      // 5. Migrate old data
      this.updateLoaderStatus('Migrating old data (if any)...');
      await this.migrateFromLocalStorage();

      // 6. Initialize UI
      this.updateLoaderStatus('Preparing UI...');
      this.initUI();
      this.initEventListeners();

      // 7. Render content
      this.updateLoaderStatus('Rendering data...');
      await this.renderAll();

      // 8. Check PAT status
      this.checkPATStatus();

      console.log('Initialization complete!');
      if (this.dom.loader) {
        this.dom.loader.classList.add('hidden');
      }
    } catch (error) {
      console.error('Critical initialization failed:', error);
      if (this.dom.loaderStatus) {
        this.dom.loaderStatus.textContent = `Error loading app: ${error.message}`;
        this.dom.loaderStatus.classList.add('text-error');
      }
    }
  }

  updateLoaderStatus(text) {
    console.log('Status:', text);
    if (this.dom.loaderStatus) {
      this.dom.loaderStatus.textContent = text;
    }
  }

  /**
   * Initialize Service Worker for PWA
   */
  initServiceWorker() {
    if ('serviceWorker' in navigator) {
      const swCode = `
        const CACHE_NAME = 'bike-manager-v7-cache';
        const URLS_TO_CACHE = [
          './',
          './index.html',
          './css/style.css',
          'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
          'https://cdn.jsdelivr.net/npm/dexie@4.0.1/dist/dexie.min.js',
          'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
          'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js'
        ];
        
        self.addEventListener('install', (event) => {
          event.waitUntil(
            caches.open(CACHE_NAME)
              .then((cache) => cache.addAll(URLS_TO_CACHE))
              .then(() => self.skipWaiting())
              .catch(err => console.error('Cache install failed:', err))
          );
        });
        
        self.addEventListener('activate', (event) => {
          event.waitUntil(
            caches.keys().then((cacheNames) => {
              return Promise.all(
                cacheNames.map((cacheName) => {
                  if (cacheName !== CACHE_NAME) {
                    return caches.delete(cacheName);
                  }
                })
              );
            }).then(() => self.clients.claim())
          );
        });
        
        self.addEventListener('fetch', (event) => {
          if (event.request.method !== 'GET') return;
          
          const url = new URL(event.request.url);
          
          if (url.origin === 'https://cdn.jsdelivr.net' || 
              url.origin === 'https://fonts.googleapis.com' ||
              url.origin === 'https://fonts.gstatic.com') {
            event.respondWith(
              caches.match(event.request)
                .then((response) => {
                  if (response) return response;
                  return fetch(event.request).then(fetchResponse => {
                    return caches.open(CACHE_NAME).then(cache => {
                      cache.put(event.request, fetchResponse.clone());
                      return fetchResponse;
                    });
                  });
                })
            );
          }
        });
      `;

      const blob = new Blob([swCode], { type: 'application/javascript' });
      const swUrl = URL.createObjectURL(blob);

      navigator.serviceWorker.register(swUrl)
        .then(registration => {
          console.log('Service Worker registered:', registration);
          URL.revokeObjectURL(swUrl);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
          URL.revokeObjectURL(swUrl);
        });
    }
  }

  /**
   * Initialize IndexedDB
   */
  async initDatabase() {
    this.db = new Dexie('BikeManagerDB');
    
    // Version 1: Original schema with 'no' as indexed (implicitly unique)
    this.db.version(1).stores({
      bikes: '_id, no, owner, datePurchase, dateSelling, _deleted, [dateSelling+_deleted]'
    });
    
    // Version 2: Remove 'no' from direct index to allow duplicates, keep only compound index
    this.db.version(2).stores({
      bikes: '_id, owner, datePurchase, dateSelling, _deleted, [dateSelling+_deleted]'
    }).upgrade(async tx => {
      // Migration: no action needed, just schema change
      console.log('Upgraded to schema v2: removed unique constraint on plate number');
    });
    
    await this.db.open();
    console.log('Database initialized');
  }

  /**
   * Load settings from localStorage
   */
  async loadSettings() {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = { ...this.settings, ...parsed };
      }

      // Load PAT from sessionStorage
      const pat = sessionStorage.getItem(PAT_KEY);
      if (pat) {
        this.settings.githubPat = pat;
      }

      // Load theme
      const theme = localStorage.getItem(THEME_KEY);
      if (theme) {
        document.documentElement.classList.add(`theme-${theme}`);
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('theme-dark');
      }

      // Load undo stack
      this.loadUndoStack();
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  /**
   * Save settings to localStorage
   */
  saveSettings() {
    try {
      const toSave = { ...this.settings };
      delete toSave.githubPat; // Don't save PAT in localStorage
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave));

      if (this.settings.githubPat) {
        sessionStorage.setItem(PAT_KEY, this.settings.githubPat);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  /**
   * Clean corrupted numeric data
   */
  async cleanCorruptedData() {
    try {
      const bikes = await this.db.bikes.toArray();
      let updated = false;

      for (const bike of bikes) {
        const fields = ['purchasePrice', 'repairCost', 'sellingPrice', 'netProfit'];
        let needsUpdate = false;
        const updates = {};

        for (const field of fields) {
          if (bike[field] !== undefined && bike[field] !== null && bike[field] !== '') {
            const num = parseFloat(bike[field]);
            if (isNaN(num) || bike[field] !== num.toString()) {
              updates[field] = isNaN(num) ? 0 : num;
              needsUpdate = true;
            }
          }
        }

        if (needsUpdate) {
          await this.db.bikes.update(bike._id, updates);
          updated = true;
        }
      }

      if (updated) {
        console.log('Cleaned corrupted numeric data');
      }
    } catch (error) {
      console.error('Failed to clean corrupted data:', error);
    }
  }

  /**
   * Migrate from old localStorage format
   */
  async migrateFromLocalStorage() {
    try {
      const oldData = localStorage.getItem(OLD_STORAGE_KEY);
      if (!oldData) return;

      const parsed = JSON.parse(oldData);
      if (!Array.isArray(parsed)) return;

      const existing = await this.db.bikes.count();
      if (existing > 0) {
        console.log('Data already exists, skipping migration');
        return;
      }

      const bikes = parsed.map((item, index) => ({
        _id: `migrated_${Date.now()}_${index}`,
        no: item.no || '',
        owner: item.owner || '',
        purchasePrice: parseFloat(item.purchasePrice) || 0,
        repairCost: parseFloat(item.repairCost) || 0,
        sellingPrice: parseFloat(item.sellingPrice) || 0,
        netProfit: parseFloat(item.netProfit) || 0,
        datePurchase: item.datePurchase || '',
        dateSelling: item.dateSelling || '',
        _updatedAt: Date.now(),
        _deleted: false,
      }));

      // Use individual adds to handle duplicates gracefully
      let successCount = 0;
      let errorCount = 0;
      for (const bike of bikes) {
        try {
          await this.db.bikes.add(bike);
          successCount++;
        } catch (error) {
          // If duplicate _id, try update instead
          if (error.name === 'ConstraintError') {
            try {
              await this.db.bikes.put(bike);
              successCount++;
            } catch (updateError) {
              console.warn('Failed to add/update bike:', bike.no, updateError);
              errorCount++;
            }
          } else {
            console.warn('Failed to add bike:', bike.no, error);
            errorCount++;
          }
        }
      }
      
      console.log(`Migrated ${successCount} bikes from localStorage${errorCount > 0 ? ` (${errorCount} errors)` : ''}`);
    } catch (error) {
      console.error('Migration failed:', error);
    }
  }

  /**
   * Initialize UI state
   */
  initUI() {
    // Update header
    if (this.dom.headerTitle && this.settings.businessName) {
      this.dom.headerTitle.textContent = this.settings.businessName;
    }

    // Apply list density
    if (this.dom.bikeList) {
      this.dom.bikeList.className = `bike-list ${this.settings.listDensity}`;
    }

    // Set currency symbols
    document.querySelectorAll('.currency').forEach(el => {
      el.textContent = this.settings.currency;
    });

    // Update online status
    this.updateOnlineStatus();
  }

  /**
   * Initialize event listeners
   * This will be handled by view modules
   */
  initEventListeners() {
    // Navigation
    this.dom.navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const viewId = btn.dataset.view;
        if (viewId) {
          this.navigateTo(viewId);
        }
      });
    });

    // Sync button
    if (this.dom.syncNowBtn) {
      this.dom.syncNowBtn.addEventListener('click', () => this.syncNow());
    }

    // Online/offline detection
    window.addEventListener('online', () => this.updateOnlineStatus());
    window.addEventListener('offline', () => this.updateOnlineStatus());

    // Responsive updates
    window.addEventListener('resize', this.debounce(() => {
      const newIsMobile = window.innerWidth < 768;
      if (newIsMobile !== this.isMobile) {
        this.isMobile = newIsMobile;
        this.initUI();
      }
    }, 200));
  }

  /**
   * Navigate to view
   */
  navigateTo(viewId) {
    this.currentView = viewId;
    this.dom.views.forEach(v => v.classList.remove('active'));
    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.add('active');

    this.dom.navButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewId);
    });

    // Trigger view-specific rendering
    if (viewId === 'view-stats') {
      if (typeof this.renderStatsDashboard === 'function') {
        this.renderStatsDashboard();
      }
    }
  }

  /**
   * Update online status
   */
  updateOnlineStatus() {
    this.isOnline = navigator.onLine;
    if (this.isOnline) {
      this.setSyncStatus('success', 'Online');
      this.triggerAutoSync();
    } else {
      this.setSyncStatus('offline', 'Offline');
    }
  }

  /**
   * Set sync status
   */
  setSyncStatus(status, text) {
    if (this.dom.syncStatus) {
      this.dom.syncStatus.className = `sync-status ${status}`;
    }
    if (this.dom.syncStatusText) {
      this.dom.syncStatusText.textContent = text;
    }
  }

  /**
   * Render all views
   */
  async renderAll() {
    if (this.dom.bikeListSkeleton) {
      this.dom.bikeListSkeleton.classList.remove('hidden');
    }
    if (this.dom.bikeList) {
      this.dom.bikeList.classList.add('hidden');
    }

    if (typeof this.renderBikeList === 'function') {
      await this.renderBikeList();
    }

    if (this.dom.bikeListSkeleton) {
      this.dom.bikeListSkeleton.classList.add('hidden');
    }
    if (this.dom.bikeList) {
      this.dom.bikeList.classList.remove('hidden');
    }

    if (typeof this.renderStatsDashboard === 'function') {
      await this.renderStatsDashboard();
    }

    if (typeof this.updateListStats === 'function') {
      await this.updateListStats();
    }
  }

  /**
   * Utility: Debounce function
   */
  debounce(func, delay, immediate = false) {
    let timeout;
    const context = this;
    return function executedFunction(...args) {
      const later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, delay);
      if (callNow) func.apply(context, args);
    };
  }

  /**
   * Utility: Format currency
   */
  formatCurrency(value) {
    return (value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /**
   * Utility: Escape HTML
   */
  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Utility: Show toast
   */
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-message">${this.escapeHtml(message)}</span>
      <span class="toast-close" role="button" aria-label="Close">×</span>
    `;

    container.appendChild(toast);

    const timer = setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 5000);

    toast.querySelector('.toast-close')?.addEventListener('click', () => {
      clearTimeout(timer);
      if (toast.parentElement) toast.remove();
    });
  }

  /**
   * Utility: Vibrate (mobile)
   */
  vibrate(duration) {
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  }

  /**
   * Trigger auto sync
   */
  triggerAutoSync() {
    if (this.isOnline && this.settings.gistId && this.settings.githubPat) {
      this.debouncedSyncNow();
    }
  }

  /**
   * Sync now (internal, debounced)
   */
  async syncNowInternal() {
    // Implemented in sync module
    if (typeof this.syncNow === 'function') {
      await this.syncNow();
    }
  }

  /**
   * Check PAT status
   */
  checkPATStatus() {
    if (localStorage.getItem('pat_needs_reentry') === 'true' && !this.settings.githubPat) {
      const modal = document.getElementById('pat-modal');
      if (modal) {
        modal.classList.add('active');
      }
    }
  }

  /**
   * Load undo stack
   */
  loadUndoStack() {
    try {
      const saved = localStorage.getItem(UNDO_KEY);
      if (saved) {
        this.undoStack = JSON.parse(saved);
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        this.undoStack = this.undoStack.filter(a => a.timestamp > oneDayAgo);
      }
    } catch (error) {
      console.error('Failed to load undo stack:', error);
      this.undoStack = [];
    }
  }

  /**
   * Save undo stack
   */
  saveUndoStack() {
    try {
      localStorage.setItem(UNDO_KEY, JSON.stringify(this.undoStack));
    } catch (error) {
      console.error('Failed to save undo stack:', error);
    }
  }

  /**
   * Perform undo
   */
  async performUndo() {
    if (this.undoStack.length === 0) {
      this.showToast('Nothing to undo', 'info');
      return;
    }
    
    const lastAction = this.undoStack.pop();
    this.saveUndoStack();
    
    try {
      if (lastAction.action === 'delete') {
        await this.db.bikes.put(lastAction.data);
        this.showToast(`Restored bike: ${lastAction.data.no}`, 'success');
      } else if (lastAction.action === 'update') {
        await this.db.bikes.put(lastAction.data);
        this.showToast(`Reverted changes to: ${lastAction.data.no}`, 'success');
      } else if (lastAction.action === 'create') {
        await this.db.bikes.delete(lastAction.data._id);
        this.showToast(`Removed new bike: ${lastAction.data.no}`, 'success');
      }
      
      await this.renderAll();
      this.triggerAutoSync();
    } catch (error) {
      console.error('Undo failed:', error);
      this.showToast('Failed to perform undo', 'error');
      this.undoStack.push(lastAction);
      this.saveUndoStack();
    }
  }

  /**
   * Handle bulk mark sold
   */
  async handleBulkMarkSold() {
    if (this.selectedBikes.size === 0) return;
    
    const today = new Date().toISOString().split('T')[0];
    const updates = Array.from(this.selectedBikes).map(id => ({
      _id: id,
      dateSelling: today,
      _updatedAt: Date.now()
    }));
    
    for (const update of updates) {
      const bike = await this.db.bikes.get(update._id);
      if (bike) {
        const profit = parseFloat(bike.sellingPrice || 0) - parseFloat(bike.purchasePrice || 0) - parseFloat(bike.repairCost || 0);
        await this.db.bikes.update(update._id, { ...update, netProfit: profit });
      }
    }
    
    this.showToast(`Marked ${this.selectedBikes.size} bikes as sold`, 'success');
    this.clearSelection();
    await this.renderAll();
    this.triggerAutoSync();
  }

  /**
   * Handle bulk export
   */
  async handleBulkExport() {
    if (this.selectedBikes.size === 0) return;
    
    const bikes = await Promise.all(
      Array.from(this.selectedBikes).map(id => this.db.bikes.get(id))
    );
    
    if (typeof this.exportData === 'function') {
      await this.exportData('csv', bikes);
    }
    
    this.clearSelection();
  }

  /**
   * Sync now (placeholder - implement in sync module)
   */
  async syncNow() {
    this.setSyncStatus('syncing', 'Syncing...');
    // Implemented in sync module
    setTimeout(() => {
      this.setSyncStatus('success', 'Synced');
    }, 1000);
  }

  /**
   * Export data (placeholder - implement in data module)
   */
  async exportData(format = 'csv', bikes = null) {
    if (!bikes) {
      bikes = await this.db.bikes.filter(b => !b._deleted).toArray();
    }
    
    if (format === 'csv') {
      const headers = ['no', 'owner', 'purchasePrice', 'repairCost', 'sellingPrice', 'netProfit', 'datePurchase', 'dateSelling'];
      const csv = [
        headers.join(','),
        ...bikes.map(b => headers.map(h => `"${String(b[h] || '').replace(/"/g, '""')}"`).join(','))
      ].join('\r\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bikes_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      this.showToast('Data exported successfully', 'success');
    }
  }
}

// Initialize app when script loads
window.app = new BikeManagerApp();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BikeManagerApp;
}

