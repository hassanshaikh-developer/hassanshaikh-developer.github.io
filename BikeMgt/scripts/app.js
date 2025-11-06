// --- APP CONSTANTS ---
const OLD_STORAGE_KEY = 'bikes_db_v2'; // Kept for migration
const SETTINGS_KEY = 'bike_manager_settings_v7'; // Incremented version for new settings
const PAT_KEY = 'bike_manager_pat_v6';
const UNDO_KEY = 'bike_manager_undo_v7';
const ITEMS_PER_PAGE = 50; // For pagination

/**
 * @class BikeManagerApp
 * Main application class managing all components, views, database, and sync logic.
 * Refactored for simplicity, new features (Cash in Hand, PDF, Bulk Delete), and auto-sync.
 * REMOVED: All Chart.js logic.
 * ADDED: PDF Analytics Report generation.
 */
class BikeManagerApp {
  
  constructor() {
this.db = null;
this.charts = {}; // Chart.js instances
this.currentFilters = {
  search: '',
  status: 'all',
  sort: 'latest',
};
this.settings = {
  businessName: 'Bike Manager',
  currency: '₹',
  cashInHand: 0, // NEW: Cash in Hand
  repoOwner: '',
  repoName: '',
  repoBranch: 'main',
  repoPath: 'data',
  githubPat: '', // Only stored in sessionStorage
  lastSync: null,
  lastSyncSha: null, // Will store SHA for each file separately
  listDensity: 'comfortable',
};
this.currentView = 'view-list';
this.isMobile = window.innerWidth < 768;
this.isOnline = navigator.onLine;
this.selectedBikes = new Set();
this.selectedExpenses = new Set();
this.undoStack = [];
this.currentPage = 1;
this.totalPages = 1;
this.statsDateFilter = { from: null, to: null };
this.isSyncing = false;
this.syncRetryTimer = null; // Timer for automatic retry after failure
this.syncStatusCheckInterval = null; // Interval for checking sync status

// Debounced functions to prevent spamming
this.debouncedRenderList = this.debounce(() => this.renderBikeList(), 250);
// Auto-sync is debounced to catch rapid changes (e.g., bulk ops) as one event
this.debouncedSyncNow = this.debounce(() => this.syncNowInternal(false), 5000, true);

// Cache DOM elements for performance
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
  bulkSellModal: document.getElementById('bulk-sell-modal'),
  bikeList: document.getElementById('bike-list'),
  bikeListSkeleton: document.getElementById('bike-list-skeleton'),
  bikeListEmpty: document.getElementById('bike-list-empty'),
  pagination: document.getElementById('pagination'),
};

// Start the app
document.addEventListener('DOMContentLoaded', () => {
  this.init();
});
  }
  
  /**
   * Primary initialization function.
   */
  async init() {
try {
  console.log('Starting initialization...');
  this.vibrate(10);
  
  // 1. Register Service Worker for PWA/offline
  this.initServiceWorker();
  
  // 2. Initialize IndexedDB
  this.updateLoaderStatus('Initializing database...');
  await this.initDatabase();
  
  // 3. Load settings from localStorage
  this.updateLoaderStatus('Loading settings...');
  await this.loadSettings();

  // 4. Clean up any corrupted numeric data from old versions
  this.updateLoaderStatus('Cleaning data (if any)...');
  await this.cleanCorruptedData();
  
  // 5. Migrate from old localStorage (if exists)
  this.updateLoaderStatus('Migrating old data (if any)...');
  await this.migrateFromLocalStorage();
  
  // 6. Set up UI elements
  this.updateLoaderStatus('Preparing UI...');
  this.initUI();
  this.initEventListeners();
  
  // 7. Render all dynamic content
  this.updateLoaderStatus('Rendering data...');
  await this.renderAll();
  
  // 8. Check if PAT needs re-entry
  this.checkPATStatus();
  
  // 9. Start periodic sync status checking if online
  if (this.isOnline) {
    this.startSyncStatusCheck();
  }
  
  console.log('Initialization complete!');
  this.dom.loader.classList.add('hidden');
  
} catch (error) {
  console.error("Critical initialization failed:", error);
  this.dom.loaderStatus.textContent = "Error loading app: " + error.message;
  this.dom.loaderStatus.classList.add('text-error');
}
  }
  
  updateLoaderStatus(text) {
console.log('Status:', text);
this.dom.loaderStatus.textContent = text;
  }

  // --- 1. PWA & SERVICE WORKER ---
  
  initServiceWorker() {
if ('serviceWorker' in navigator) {
  try {
navigator.serviceWorker.register('./scripts/sw.js')
  .then(registration => {
console.log('Service Worker registered:', registration.scope);

registration.onupdatefound = () => {
  const installingWorker = registration.installing;
  if (installingWorker) {
installingWorker.onstatechange = () => {
  if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
this.showUpdateModal();
  }
};
  }
};
  })
  .catch(error => {
console.error('Service Worker registration failed:', error);
  });
  } catch (error) {
console.error('Service Worker registration failed (CSP or other error):', error);
  }
  
  navigator.serviceWorker.addEventListener('controllerchange', () => {
window.location.reload();
  });
}
  }
  
  showUpdateModal() {
const modal = document.getElementById('update-modal');
if (modal) {
  modal.classList.add('active');
  const refreshBtn = document.getElementById('update-refresh-btn');
  if (refreshBtn) {
    refreshBtn.onclick = () => {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg && reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    };
  }
}
  }
  
  handleInstallPrompt() {
let deferredPrompt = null;

// Listen for beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  
  // Show install button/prompt if not already installed
  this.showInstallButton(deferredPrompt);
});

// Listen for app installed event
window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  deferredPrompt = null;
  this.hideInstallButton();
  this.showToast('Bike Manager installed successfully!', 'success');
});

// Check if app is already installed
if (window.matchMedia('(display-mode: standalone)').matches || 
    window.navigator.standalone === true) {
  console.log('App is already installed');
  this.hideInstallButton();
}
}

  showInstallButton(deferredPrompt) {
// Check if install button already exists
let installBtn = document.getElementById('install-pwa-btn');
if (!installBtn) {
  // Create install button in header
  const header = document.querySelector('.app-header');
  if (header) {
    installBtn = document.createElement('button');
    installBtn.id = 'install-pwa-btn';
    installBtn.className = 'btn-icon btn-ghost';
    installBtn.title = 'Install App';
    installBtn.setAttribute('aria-label', 'Install Bike Manager app');
    installBtn.innerHTML = '<svg width="20" height="20"><use href="#icon-download"></use></svg>';
    installBtn.style.display = 'none';
    
    // Insert before sync button
    const syncBtn = document.getElementById('sync-now-btn');
    if (syncBtn) {
      header.insertBefore(installBtn, syncBtn);
    } else {
      header.appendChild(installBtn);
    }
    
    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        // Show the install prompt
        deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        
        // Clear the deferredPrompt
        deferredPrompt = null;
        
        // Hide the install button
        this.hideInstallButton();
      }
    });
  }
}

if (installBtn && deferredPrompt) {
  installBtn.style.display = 'inline-flex';
}
}

  hideInstallButton() {
const installBtn = document.getElementById('install-pwa-btn');
if (installBtn) {
  installBtn.style.display = 'none';
}
}
  
  // --- 2. DATABASE & DATA MIGRATION ---

  async initDatabase() {
try {
  console.log('Initializing Dexie database...');
  // Using v1 from original, as schema hasn't changed
  this.db = new Dexie('BikeDB_v11'); // Incrementing version for multi-image support and sync
  
  this.db.version(1).stores({
bikes: '++_id, &no, owner, _updatedAt, dateSelling, _deleted, [dateSelling+_deleted]',
cashLog: '++_id, timestamp, type, amount, reason, balance, transactionId',
editLog: '++_id, timestamp, bikeId, bikePlate, action, oldData, newData, changes'
  });
  
  this.db.version(2).stores({
bikes: '++_id, &no, owner, ownerId, _updatedAt, dateSelling, serviceDueDate, _deleted, [dateSelling+_deleted]',
cashLog: '++_id, timestamp, type, amount, reason, balance, transactionId',
editLog: '++_id, timestamp, bikeId, bikePlate, action, oldData, newData, changes',
expenses: '++_id, date, category, amount, description, _updatedAt',
customers: '++_id, name, phone, email, address, _updatedAt'
  });
  
  this.db.version(3).stores({
bikes: '++_id, &no, owner, ownerId, _updatedAt, dateSelling, serviceDueDate, _deleted, [dateSelling+_deleted]',
cashLog: '++_id, timestamp, type, amount, reason, balance, transactionId',
editLog: '++_id, timestamp, bikeId, bikePlate, action, oldData, newData, changes',
expenses: '++_id, date, category, amount, description, image, _updatedAt',
customers: '++_id, name, phone, email, address, _updatedAt'
  });
  
  this.db.version(4).stores({
bikes: '++_id, &no, owner, ownerId, supplierId, _updatedAt, dateSelling, serviceDueDate, _deleted, [dateSelling+_deleted]',
cashLog: '++_id, timestamp, type, amount, reason, balance, transactionId',
editLog: '++_id, timestamp, bikeId, bikePlate, action, oldData, newData, changes',
expenses: '++_id, date, category, amount, description, image, _updatedAt',
customers: '++_id, name, phone, email, address, _updatedAt',
parts: '++_id, &name, sku, stockQuantity, costPrice, supplierId, _updatedAt',
serviceLog: '++_id, bikeId, date, description, partIdsUsed, _updatedAt',
suppliers: '++_id, &name, contactPerson, phone, category, _updatedAt'
  }).upgrade(async tx => {
    // Migrate existing bikes to include supplierId and convert image to images array
    const bikes = await tx.table('bikes').toArray();
    for (const bike of bikes) {
      if (!bike.supplierId) {
        bike.supplierId = null;
      }
      // Migrate single image to images array (max 3)
      if (bike.image && !bike.images) {
        bike.images = [bike.image];
        delete bike.image;
      } else if (!bike.images) {
        bike.images = [];
      }
      // Ensure images array has max 3 items
      if (bike.images && bike.images.length > 3) {
        bike.images = bike.images.slice(0, 3);
      }
      await tx.table('bikes').put(bike);
    }
  });
  
  this.db.version(5).stores({
bikes: '++_id, &no, owner, ownerId, supplierId, _updatedAt, dateSelling, serviceDueDate, _deleted, [dateSelling+_deleted]',
cashLog: '++_id, timestamp, type, amount, reason, balance, transactionId',
editLog: '++_id, timestamp, bikeId, bikePlate, action, oldData, newData, changes',
expenses: '++_id, date, category, amount, description, image, _updatedAt',
customers: '++_id, name, phone, email, address, _updatedAt',
parts: '++_id, &name, sku, stockQuantity, costPrice, supplierId, _updatedAt',
serviceLog: '++_id, bikeId, date, description, partIdsUsed, _updatedAt',
suppliers: '++_id, &name, contactPerson, phone, category, _updatedAt'
  }).upgrade(async tx => {
    // Ensure all bikes have images array (not single image field)
    const bikes = await tx.table('bikes').toArray();
    for (const bike of bikes) {
      if (bike.image && !bike.images) {
        bike.images = [bike.image];
        delete bike.image;
      } else if (!bike.images) {
        bike.images = [];
      }
      if (bike.images && bike.images.length > 3) {
        bike.images = bike.images.slice(0, 3);
      }
      await tx.table('bikes').put(bike);
    }
  });
  
  await this.db.open();
  console.log("Database initialized successfully");
} catch (error) {
  console.error("Database initialization failed:", error);
  throw new Error("Failed to initialize database: " + error.message);
}
  }
  
  async cleanCorruptedData() {
try {
  console.log("Checking for data corruption...");
  const allBikes = await this.db.bikes.toArray();
  
  const bikesToFix = allBikes.filter(b => {
return typeof b.purchasePrice === 'string' || 
   typeof b.netProfit === 'string' || 
   typeof b.repairCost === 'string' ||
   typeof b.sellingPrice === 'string'
  });

  if (bikesToFix.length > 0) {
console.log(`Found ${bikesToFix.length} corrupted records. Fixing...`);
this.showToast(`Fixing ${bikesToFix.length} corrupted data entries...`, 'warning');

const fixedBikes = bikesToFix.map(b => {
  const purchasePrice = parseFloat(b.purchasePrice) || 0;
  const repairCost = parseFloat(b.repairCost) || 0;
  const sellingPrice = parseFloat(b.sellingPrice) || 0;
  
  return {
...b,
no: (b.no || '').trim().toUpperCase(),
purchasePrice: purchasePrice,
repairCost: repairCost,
sellingPrice: sellingPrice,
netProfit: sellingPrice - (purchasePrice + repairCost),
  };
});

await this.db.bikes.bulkPut(fixedBikes);
console.log("Corruption fix complete.");
  } else {
console.log("Data is clean.");
  }
} catch (error) {
  console.error("Failed during data cleaning:", error);
}
  }

  async migrateFromLocalStorage() {
const oldDataRaw = localStorage.getItem(OLD_STORAGE_KEY);
if (!oldDataRaw) {
  // Create initial cash log entry if none exists
  const cashCount = await this.db.cashLog.count();
  if (cashCount === 0 && this.settings.cashInHand > 0) {
await this.db.cashLog.add({
  timestamp: new Date().toISOString(),
  type: 'set',
  amount: this.settings.cashInHand,
  reason: 'Initial balance',
  balance: this.settings.cashInHand
});
  }
  return;
}

try {
  const oldDb = JSON.parse(oldDataRaw);
  if (!Array.isArray(oldDb) || oldDb.length === 0) {
localStorage.removeItem(OLD_STORAGE_KEY);
return;
  }
  
  console.log(`Migrating ${oldDb.length} records from localStorage...`);
  this.showToast(`Migrating ${oldDb.length} old records...`, 'info');
  
  const now = new Date().toISOString();
  const recordsToMigrate = oldDb.map(record => ({
...record,
no: (record.no || '').trim().toUpperCase(),
purchasePrice: parseFloat(record.purchasePrice) || 0,
repairCost: parseFloat(record.repairCost) || 0,
sellingPrice: parseFloat(record.sellingPrice) || 0,
netProfit: parseFloat(record.netProfit) || 0,
_updatedAt: record._updatedAt || now,
_deleted: Boolean(record._deleted),
  }));
  
  await this.db.bikes.bulkPut(recordsToMigrate);
  
  localStorage.removeItem(OLD_STORAGE_KEY);
  this.showToast(`Successfully migrated ${oldDb.length} records.`, 'success');
  
} catch (error) {
  console.error("Migration failed:", error);
  this.showToast("Failed to migrate old data.", 'error');
}
  }

  // --- 3. SETTINGS & PERSONALIZATION ---
  
  async loadSettings() {
const savedSettings = localStorage.getItem(SETTINGS_KEY);
if (savedSettings) {
  this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
}

const savedPat = sessionStorage.getItem(PAT_KEY);
if (savedPat) {
  this.settings.githubPat = savedPat;
}

// Ensure cash in hand is a number
this.settings.cashInHand = parseFloat(this.settings.cashInHand) || 0;

this.loadUndoStack();
this.applySettings();
  }
  
  async saveSettings() {
// Don't save PAT to localStorage
const { githubPat, ...settingsToSave } = this.settings;
localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsToSave));

this.applySettings();
this.vibrate(10);
  }
  
  applySettings() {
this.dom.headerTitle.textContent = this.settings.businessName || 'Bike Manager';
document.title = this.settings.businessName || 'Bike Manager';
document.querySelectorAll('.currency').forEach(el => el.textContent = this.settings.currency || '₹');

if (document.getElementById('setting-repo-owner')) {
  document.getElementById('setting-repo-owner').value = this.settings.repoOwner || '';
  document.getElementById('setting-repo-name').value = this.settings.repoName || '';
  document.getElementById('setting-repo-branch').value = this.settings.repoBranch || 'main';
  document.getElementById('setting-repo-path').value = this.settings.repoPath || 'data';
  document.getElementById('setting-github-pat').value = this.settings.githubPat || '';
  document.getElementById('setting-business-name').value = this.settings.businessName || '';
  document.getElementById('setting-currency').value = this.settings.currency || '';
  document.getElementById('setting-cash-in-hand').value = this.settings.cashInHand;
  document.getElementById('list-density').value = this.settings.listDensity || 'comfortable';
}

this.dom.bikeList.classList.toggle('compact', this.settings.listDensity === 'compact');
this.renderCashInHand();
  }
  
  checkPATStatus() {
if ((this.settings.repoOwner && this.settings.repoName) && !this.settings.githubPat && localStorage.getItem('pat_needs_reentry') === 'true') {
  const modal = document.getElementById('pat-modal');
  if (modal) modal.classList.add('active');
}
  }
  
  // --- 4. UI & EVENT LISTENERS ---
  
  initUI() {
// Check for install prompt
this.handleInstallPrompt();
const desktopBtn = document.getElementById('buy-bike-desktop');
if (desktopBtn) desktopBtn.style.display = this.isMobile ? 'none' : 'inline-flex';

if ('share' in navigator) {
  const shareBtn = document.getElementById('share-data');
  if (shareBtn) shareBtn.classList.remove('hidden');
}

// Initialize cash buttons
const cashSetEl = document.getElementById('cash-set');
const cashIncreaseEl = document.getElementById('cash-increase');
const cashDecreaseEl = document.getElementById('cash-decrease');

if (cashSetEl) cashSetEl.addEventListener('click', () => this.openCashModal('set'));
if (cashIncreaseEl) cashIncreaseEl.addEventListener('click', () => this.openCashModal('increase'));
if (cashDecreaseEl) cashDecreaseEl.addEventListener('click', () => this.openCashModal('decrease'));

// Cash modal controls
const closeCashModalEl = document.getElementById('close-cash-modal');
const cancelCashBtnEl = document.getElementById('cancel-cash-btn');
const saveCashBtnEl = document.getElementById('save-cash-btn');
const cashModalEl = document.getElementById('cash-modal');

if (closeCashModalEl) closeCashModalEl.addEventListener('click', () => this.closeCashModal());
if (cancelCashBtnEl) cancelCashBtnEl.addEventListener('click', () => this.closeCashModal());
if (saveCashBtnEl) saveCashBtnEl.addEventListener('click', () => this.handleSaveCash());
if (cashModalEl) {
  cashModalEl.addEventListener('click', (e) => {
    if (e.target === cashModalEl) this.closeCashModal();
  });
}

// Export cash log button
const exportCashBtn = document.getElementById('export-cash-log');
if (exportCashBtn) {
  exportCashBtn.addEventListener('click', () => this.exportCashLog());
}

const filterAllForActive = document.getElementById('filter-all');
if (filterAllForActive) filterAllForActive.classList.add('active');
this.updateOnlineStatus();
  }
  
  initEventListeners() {
// Navigation
this.dom.navButtons.forEach(btn => btn.addEventListener('click', () => this.navigateTo(btn.dataset.view)));
this.dom.syncNowBtn.addEventListener('click', () => this.syncNowInternal(true)); // Manual sync

// List Search & Filter
this.dom.searchInput.addEventListener('input', (e) => {
  this.currentFilters.search = e.target.value.toLowerCase();
  this.currentPage = 1;
  this.debouncedRenderList();
});
this.dom.searchClear.addEventListener('click', () => {
  this.dom.searchInput.value = '';
  this.currentFilters.search = '';
  this.currentPage = 1;
  this.debouncedRenderList();
});

// Filter Panel Toggle
const filterToggleBtn = document.getElementById('filter-toggle-btn');
const filterPanel = document.getElementById('filter-panel');
const filterForm = document.getElementById('filter-form');

if (filterToggleBtn && filterPanel) {
  filterToggleBtn.addEventListener('click', () => {
    const isExpanded = filterPanel.style.display !== 'none';
    filterPanel.style.display = isExpanded ? 'none' : 'block';
    filterToggleBtn.setAttribute('aria-expanded', !isExpanded);
    
    // Update form values to match current filters
    if (!isExpanded) {
      const statusRadio = filterForm.querySelector(`input[name="status"][value="${this.currentFilters.status}"]`);
      const sortRadio = filterForm.querySelector(`input[name="sort"][value="${this.currentFilters.sort}"]`);
      if (statusRadio) statusRadio.checked = true;
      if (sortRadio) sortRadio.checked = true;
    }
  });
}

// Filter Form Apply
const filterApplyBtn = document.getElementById('filter-apply');
const filterResetBtn = document.getElementById('filter-reset');

if (filterApplyBtn) {
  filterApplyBtn.addEventListener('click', () => {
    const formData = new FormData(filterForm);
    this.currentFilters.status = formData.get('status') || 'all';
    this.currentFilters.sort = formData.get('sort') || 'latest';
    this.currentPage = 1;
    this.renderBikeList();
    
    // Close panel
    if (filterPanel) {
      filterPanel.style.display = 'none';
      if (filterToggleBtn) filterToggleBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

if (filterResetBtn) {
  filterResetBtn.addEventListener('click', () => {
    this.currentFilters.status = 'all';
    this.currentFilters.sort = 'latest';
    
    // Reset form
    if (filterForm) {
      const allStatusRadio = filterForm.querySelector('input[name="status"][value="all"]');
      const latestSortRadio = filterForm.querySelector('input[name="sort"][value="latest"]');
      if (allStatusRadio) allStatusRadio.checked = true;
      if (latestSortRadio) latestSortRadio.checked = true;
    }
    
    this.currentPage = 1;
    this.renderBikeList();
    
    // Close panel
    if (filterPanel) {
      filterPanel.style.display = 'none';
      if (filterToggleBtn) filterToggleBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

// List Item Actions
// List Item Actions (Bikes)
this.dom.bikeList.addEventListener('click', (e) => {
  const card = e.target.closest('.bike-card');
  if (card && card.dataset.id) {
if (e.shiftKey || e.ctrlKey || e.metaKey || e.target.closest('.bike-checkbox')) {
  this.toggleBikeSelection(card.dataset.id);
} else {
  this.handleEditBike(card.dataset.id);
}
  }
});

// Expense List Item Actions
const expensesList = document.getElementById('expenses-list');
if (expensesList) {
  expensesList.addEventListener('click', (e) => {
    const card = e.target.closest('.bike-card');
    if (card && card.dataset.expenseId) {
      // If clicking checkbox or using modifier keys, toggle selection
      if (e.shiftKey || e.ctrlKey || e.metaKey || e.target.closest('.bike-checkbox')) {
        this.toggleExpenseSelection(card.dataset.expenseId);
      } else {
        // Otherwise, open edit modal
        this.handleEditExpense(card.dataset.expenseId);
      }
    }
  });
}

// FAB & Desktop Add
const addBtns = [document.getElementById('fab-buy'), document.getElementById('buy-bike-desktop')];
addBtns.forEach(btn => {
  if (btn) btn.addEventListener('click', () => this.handleNewBike());
});

// Bulk Actions
const bulkMarkSoldEl = document.getElementById('bulk-mark-sold');
const bulkExportEl = document.getElementById('bulk-export');
const bulkDeleteEl = document.getElementById('bulk-delete');
const bulkDeselectEl = document.getElementById('bulk-deselect');

if (bulkMarkSoldEl) bulkMarkSoldEl.addEventListener('click', () => this.handleBulkMarkSold());
if (bulkExportEl) bulkExportEl.addEventListener('click', () => this.handleBulkExport());
if (bulkDeleteEl) bulkDeleteEl.addEventListener('click', () => this.handleBulkDelete());
if (bulkDeselectEl) bulkDeselectEl.addEventListener('click', () => this.clearSelection());

// Pagination
const prevPageEl = document.getElementById('prev-page');
const nextPageEl = document.getElementById('next-page');

if (prevPageEl) prevPageEl.addEventListener('click', () => this.changePage(-1));
if (nextPageEl) nextPageEl.addEventListener('click', () => this.changePage(1));

// Main Form Modal
const closeFormModalEl = document.getElementById('close-form-modal');
const cancelFormBtnEl = document.getElementById('cancel-form-btn');
const saveFormBtnEl = document.getElementById('save-form-btn');
const deleteBikeBtnEl = document.getElementById('delete-bike-btn');

if (closeFormModalEl) closeFormModalEl.addEventListener('click', () => this.closeFormModal());
if (cancelFormBtnEl) cancelFormBtnEl.addEventListener('click', () => this.closeFormModal());
if (saveFormBtnEl) saveFormBtnEl.addEventListener('click', () => this.handleSaveBike());
if (deleteBikeBtnEl) deleteBikeBtnEl.addEventListener('click', () => this.handleDeleteBike());
// REMOVED: Duplicate button - replaced with edit functionality

this.dom.formModal.addEventListener('click', (e) => {
  if (e.target === this.dom.formModal) this.closeFormModal();
});

const profitInputs = ['form-purchasePrice', 'form-repairCost', 'form-sellingPrice'];
profitInputs.forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => this.calculateFormProfit());
});

// Bulk Sell Modal
const closeBulkSellModalEl = document.getElementById('close-bulk-sell-modal');
const cancelBulkSellBtnEl = document.getElementById('cancel-bulk-sell-btn');
const saveBulkSellBtnEl = document.getElementById('save-bulk-sell-btn');

if (closeBulkSellModalEl) closeBulkSellModalEl.addEventListener('click', () => this.closeBulkSellModal());
if (cancelBulkSellBtnEl) cancelBulkSellBtnEl.addEventListener('click', () => this.closeBulkSellModal());
if (saveBulkSellBtnEl) saveBulkSellBtnEl.addEventListener('click', () => this.handleBulkSellModalSubmit());
this.dom.bulkSellModal.addEventListener('click', (e) => {
  if (e.target === this.dom.bulkSellModal) this.closeBulkSellModal();
});

// Settings Page
const saveSyncSettingsEl = document.getElementById('save-sync-settings');
const saveDisplaySettingsEl = document.getElementById('save-display-settings');
const listDensityEl = document.getElementById('list-density');

if (saveSyncSettingsEl) saveSyncSettingsEl.addEventListener('click', () => this.handleSaveSyncSettings());
if (saveDisplaySettingsEl) saveDisplaySettingsEl.addEventListener('click', () => this.handleSaveDisplaySettings());
if (listDensityEl) {
  listDensityEl.addEventListener('change', (e) => {
    this.settings.listDensity = e.target.value;
    this.saveSettings();
    this.renderBikeList(); // No full re-render needed
  });
}

// Data Management
const exportCsvEl = document.getElementById('export-csv');
const exportHtmlEl = document.getElementById('export-html');
const importCsvEl = document.getElementById('import-csv');
const downloadTemplateEl = document.getElementById('download-template');
const shareDataEl = document.getElementById('share-data');
const importFileInputEl = document.getElementById('import-file-input');
const wipeDataBtnEl = document.getElementById('wipe-data-btn');

if (exportCsvEl) exportCsvEl.addEventListener('click', () => this.exportData('csv'));
// REMOVED: JSON Export listener
if (exportHtmlEl) exportHtmlEl.addEventListener('click', () => this.exportData('html'));
if (importCsvEl) {
  importCsvEl.addEventListener('click', () => {
    const importFileInput = document.getElementById('import-file-input');
    if (importFileInput) importFileInput.click();
  });
}
if (downloadTemplateEl) downloadTemplateEl.addEventListener('click', () => this.downloadTemplate());
if (shareDataEl) shareDataEl.addEventListener('click', () => this.handleShareData());
if (importFileInputEl) importFileInputEl.addEventListener('change', (e) => this.handleImportFile(e));
if (wipeDataBtnEl) wipeDataBtnEl.addEventListener('click', () => this.handleWipeData());

// Tab Switching (Bikes/Expenses)
const tabBikesEl = document.getElementById('tab-bikes');
const tabExpensesEl = document.getElementById('tab-expenses');
const tabContentBikesEl = document.getElementById('tab-content-bikes');
const tabContentExpensesEl = document.getElementById('tab-content-expenses');

if (tabBikesEl && tabExpensesEl) {
  tabBikesEl.addEventListener('click', () => this.switchTab('bikes'));
  tabExpensesEl.addEventListener('click', () => this.switchTab('expenses'));
}

// Add Expense buttons (both from list view and stats page)
const addExpenseBtnListEl = document.getElementById('add-expense-btn-list');
const addExpenseBtnEl = document.getElementById('add-expense-btn');

if (addExpenseBtnListEl) addExpenseBtnListEl.addEventListener('click', () => this.openExpenseModal());
if (addExpenseBtnEl) addExpenseBtnEl.addEventListener('click', () => this.openExpenseModal());

// Stats Page
const applyDateFilterEl = document.getElementById('apply-date-filter');
const resetDateFilterEl = document.getElementById('reset-date-filter');
const exportAnalyticsHtmlEl = document.getElementById('export-analytics-html');
const exportAnalyticsCsvEl = document.getElementById('export-analytics-csv');

if (applyDateFilterEl) applyDateFilterEl.addEventListener('click', () => this.applyStatsDateFilter());
if (resetDateFilterEl) resetDateFilterEl.addEventListener('click', () => this.resetStatsDateFilter());
if (exportAnalyticsHtmlEl) exportAnalyticsHtmlEl.addEventListener('click', () => this.exportAnalyticsReport('html'));
if (exportAnalyticsCsvEl) exportAnalyticsCsvEl.addEventListener('click', () => this.exportAnalyticsReport('csv'));

// Expense Modal
const closeExpenseModalEl = document.getElementById('close-expense-modal');
const cancelExpenseBtnEl = document.getElementById('cancel-expense-btn');
const saveExpenseBtnEl = document.getElementById('save-expense-btn');

if (closeExpenseModalEl) closeExpenseModalEl.addEventListener('click', () => this.closeExpenseModal());
if (cancelExpenseBtnEl) cancelExpenseBtnEl.addEventListener('click', () => this.closeExpenseModal());
if (saveExpenseBtnEl) saveExpenseBtnEl.addEventListener('click', () => this.handleSaveExpense());

// Expense image handling
const expenseImageInputEl = document.getElementById('expense-image');
const removeExpenseImageBtnEl = document.getElementById('remove-expense-image-btn');

if (expenseImageInputEl) {
  expenseImageInputEl.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = document.getElementById('expense-image-preview');
        const previewImg = document.getElementById('expense-image-preview-img');
        if (preview && previewImg) {
          previewImg.src = event.target.result;
          preview.style.display = 'block';
        }
      };
      reader.readAsDataURL(file);
    }
  });
}

if (removeExpenseImageBtnEl) {
  removeExpenseImageBtnEl.addEventListener('click', () => {
    const imageInput = document.getElementById('expense-image');
    const preview = document.getElementById('expense-image-preview');
    const previewImg = document.getElementById('expense-image-preview-img');
    if (imageInput) imageInput.value = '';
    if (preview) preview.style.display = 'none';
    if (previewImg) previewImg.src = '';
  });
}

// Customer Modal
const closeCustomerModalEl = document.getElementById('close-customer-modal');
const cancelCustomerBtnEl = document.getElementById('cancel-customer-btn');
const saveCustomerBtnEl = document.getElementById('save-customer-btn');
const addCustomerBtnEl = document.getElementById('add-customer-btn');

if (closeCustomerModalEl) closeCustomerModalEl.addEventListener('click', () => this.closeCustomerModal());
if (cancelCustomerBtnEl) cancelCustomerBtnEl.addEventListener('click', () => this.closeCustomerModal());
if (saveCustomerBtnEl) saveCustomerBtnEl.addEventListener('click', () => this.handleSaveCustomer());
if (addCustomerBtnEl) addCustomerBtnEl.addEventListener('click', () => this.openCustomerModal());

// Multi-image handling (upload and inbuilt camera capture)
const uploadImagesBtnEl = document.getElementById('upload-images-btn');
const captureImageBtnEl = document.getElementById('capture-image-btn');
const imagesInputEl = document.getElementById('form-images');
const imagesPreviewEl = document.getElementById('form-images-preview');

// Global function to add image to preview (accessible from camera modal)
window.addImageToPreview = (dataUrl) => {
  const previewEl = document.getElementById('form-images-preview');
  if (!previewEl) return;
  const existingImages = previewEl.querySelectorAll('img');
  if (existingImages.length >= 3) {
    const app = window.app; // Access app instance
    if (app) app.showToast('Maximum 3 images allowed', 'warning');
    return;
  }
  const imgContainer = document.createElement('div');
  imgContainer.style.position = 'relative';
  const index = existingImages.length;
  imgContainer.innerHTML = `
    <img src="${dataUrl}" alt="Image ${index + 1}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-color); cursor: pointer;" />
    <button type="button" class="btn-icon btn-ghost" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.7); color: white;" data-image-index="${index}" aria-label="Remove image">
      <svg width="16" height="16"><use href="#icon-close"></use></svg>
    </button>
  `;
  previewEl.appendChild(imgContainer);
  
  // Add click handler to remove button
  const removeBtn = imgContainer.querySelector('button');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      imgContainer.remove();
      // Re-index remaining images
      const remaining = previewEl.querySelectorAll('div');
      remaining.forEach((div, idx) => {
        const btn = div.querySelector('button');
        if (btn) btn.setAttribute('data-image-index', idx);
      });
    });
  }
};

if (uploadImagesBtnEl) {
  uploadImagesBtnEl.addEventListener('click', () => {
    if (imagesInputEl) imagesInputEl.click();
  });
}

if (captureImageBtnEl) {
  captureImageBtnEl.addEventListener('click', () => {
    const app = window.app;
    if (app) app.openCameraModal();
  });
}

if (imagesInputEl) {
  imagesInputEl.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const existingImages = imagesPreviewEl.querySelectorAll('img');
      const remainingSlots = 3 - existingImages.length;
      files.slice(0, remainingSlots).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (window.addImageToPreview) {
            window.addImageToPreview(event.target.result);
          }
        };
        reader.readAsDataURL(file);
      });
      imagesInputEl.value = '';
    }
  });
}

// Customer selector
const ownerSelectEl = document.getElementById('form-owner-select');
if (ownerSelectEl) {
  ownerSelectEl.addEventListener('change', async (e) => {
    const customerId = e.target.value;
    const ownerInput = document.getElementById('form-owner');
    const ownerIdInput = document.getElementById('form-owner-id');
    if (customerId && ownerInput && ownerIdInput) {
      const customer = await this.db.customers.get(Number(customerId));
      if (customer) {
        ownerInput.value = customer.name;
        ownerIdInput.value = customerId;
      }
    }
  });
}

// PAT Modal
const patSkipEl = document.getElementById('pat-skip');
const patSubmitEl = document.getElementById('pat-submit');

if (patSkipEl) {
  patSkipEl.addEventListener('click', () => {
    const patModalEl = document.getElementById('pat-modal');
    if (patModalEl) patModalEl.classList.remove('active');
    localStorage.removeItem('pat_needs_reentry');
  });
}
if (patSubmitEl) {
  patSubmitEl.addEventListener('click', () => {
    const patReenterEl = document.getElementById('pat-reenter');
    const patModalEl = document.getElementById('pat-modal');
    if (patReenterEl) {
      const pat = patReenterEl.value.trim();
      if (pat) {
        this.settings.githubPat = pat;
        sessionStorage.setItem(PAT_KEY, pat);
        this.saveSettings();
        if (patModalEl) patModalEl.classList.remove('active');
        localStorage.removeItem('pat_needs_reentry');
        this.showToast('PAT restored for this session.', 'success');
        this.syncNowInternal(true); // Manual sync on submit
      } else {
        this.showToast('Please enter a valid PAT.', 'error');
      }
    }
  });
}

// Global Listeners
// REMOVED: Keyboard shortcut listener

window.addEventListener('online', () => this.updateOnlineStatus());
window.addEventListener('offline', () => this.updateOnlineStatus());

window.addEventListener('resize', this.debounce(() => {
  const newIsMobile = window.innerWidth < 768;
  if (newIsMobile !== this.isMobile) {
this.isMobile = newIsMobile;
this.initUI();
  }
}, 200));

window.addEventListener('beforeunload', () => {
  if (this.settings.githubPat) {
localStorage.setItem('pat_needs_reentry', 'true');
  }
});
  }
  
  async renderAll() {
this.dom.bikeListSkeleton.classList.remove('hidden');
this.dom.bikeList.classList.add('hidden');

await this.renderBikeList();

this.dom.bikeListSkeleton.classList.add('hidden');
this.dom.bikeList.classList.remove('hidden');

// This will also render cash in hand
await this.renderStatsDashboard(); 
  }

  renderCashInHand() {
const cashEl = document.getElementById('stat-cash-in-hand');
if (cashEl) {
  cashEl.textContent = this.formatCurrency(this.settings.cashInHand);
}
  }
  
  async renderBikeList() {
let bikes;

try {
  // Optimized query
  if (this.currentFilters.status === 'sold') {
bikes = await this.db.bikes.where('[dateSelling+_deleted]').above(['', false]).toArray();
  } else if (this.currentFilters.status === 'unsold') {
bikes = await this.db.bikes.where({ dateSelling: '', _deleted: false }).toArray();
  } else {
bikes = await this.db.bikes.where('_deleted').equals(false).toArray();
  }
} catch (e) {
  // Fallback query for browsers that might struggle with the compound index
  console.warn("Compound query failed, using slower filter:", e);
  bikes = await this.db.bikes.filter(b => !b._deleted).toArray();
  if (this.currentFilters.status === 'sold') {
bikes = bikes.filter(b => b.dateSelling && b.dateSelling !== '');
  } else if (this.currentFilters.status === 'unsold') {
bikes = bikes.filter(b => !b.dateSelling || b.dateSelling === '');
  }
}

if (this.currentFilters.search) {
  const search = this.currentFilters.search;
  bikes = bikes.filter(b => 
b.no.toLowerCase().includes(search) || 
b.owner.toLowerCase().includes(search)
  );
}

bikes = this.sortBikes(bikes, this.currentFilters.sort);

this.totalPages = Math.max(1, Math.ceil(bikes.length / ITEMS_PER_PAGE));
this.currentPage = Math.min(this.currentPage, this.totalPages);
const startIdx = (this.currentPage - 1) * ITEMS_PER_PAGE;
const paginatedBikes = bikes.slice(startIdx, startIdx + ITEMS_PER_PAGE);

if (bikes.length === 0) {
  this.dom.bikeList.innerHTML = '';
  this.dom.bikeListEmpty.classList.remove('hidden');
  this.dom.pagination.classList.add('hidden');
  return;
}

this.dom.bikeListEmpty.classList.add('hidden');

requestAnimationFrame(() => {
  this.dom.bikeList.innerHTML = paginatedBikes.map(bike => this.createBikeCardHTML(bike)).join('');
  
  if (this.totalPages > 1) {
this.dom.pagination.classList.remove('hidden');
document.getElementById('page-info').textContent = `Page ${this.currentPage} of ${this.totalPages}`;
document.getElementById('prev-page').disabled = this.currentPage === 1;
document.getElementById('next-page').disabled = this.currentPage === this.totalPages;
  } else {
this.dom.pagination.classList.add('hidden');
  }
});
  }
  
  sortBikes(bikes, sortType) {
switch (sortType) {
  case 'latest':
return bikes.sort((a, b) => new Date(b._updatedAt || 0) - new Date(a._updatedAt || 0));
  case 'oldest':
return bikes.sort((a, b) => new Date(a._updatedAt || 0) - new Date(b._updatedAt || 0));
  case 'profit-high':
return bikes.sort((a, b) => (parseFloat(b.netProfit) || 0) - (parseFloat(a.netProfit) ||0));
  case 'profit-low':
return bikes.sort((a, b) => (parseFloat(a.netProfit) || 0) - (parseFloat(b.netProfit) || 0));
  case 'plate':
return bikes.sort((a, b) => a.no.localeCompare(b.no));
  case 'owner':
return bikes.sort((a, b) => a.owner.localeCompare(b.owner));
  default:
return bikes;
}
  }
  
  createBikeCardHTML(bike) {
const isSold = !!(bike.dateSelling && bike.dateSelling !== '');
const profit = parseFloat(bike.netProfit) || 0;
let profitClass = 'profit-value';
let profitDisplay = `${this.settings.currency} ${this.formatCurrency(profit)}`;

if (!isSold) {
  profitClass += ' unrealized';
  profitDisplay = 'Unsold';
} else if (profit < 0) {
  profitClass += ' loss';
} else if (profit === 0) {
  profitClass = 'text-secondary';
}

const isSelected = this.selectedBikes.has(bike._id.toString());

return `
  <div class="bike-card ${isSelected ? 'selected' : ''}" data-id="${bike._id}" role="listitem" tabindex="0" style="display: flex; align-items: center; gap: 12px;">
<div class="bike-checkbox" role="checkbox" aria-checked="${isSelected}" aria-label="Select ${this.escapeHtml(bike.no)}">
  <svg><use href="#icon-check"></use></svg>
</div>
${bike.image ? `<div style="width: 60px; height: 60px; border-radius: 8px; overflow: hidden; flex-shrink: 0; border: 1px solid var(--border-color);"><img src="${bike.image}" alt="Bike ${this.escapeHtml(bike.no)}" style="width: 100%; height: 100%; object-fit: cover;" /></div>` : ''}
<div class="bike-card-main" style="flex: 1;">
  <div class="bike-card-plate">${this.escapeHtml(bike.no)}</div>
  <div class="bike-card-owner">${this.escapeHtml(bike.owner)}</div>
  ${bike.model ? `<div class="bike-card-model" style="font-size: 0.85rem; color: #64748b; margin-top: 2px;">${this.escapeHtml(bike.model)}</div>` : ''}
</div>
<div class="bike-card-profit">
  <div class="${profitClass}">${profitDisplay}</div>
</div>
  </div>
`;
  }
  
  toggleBikeSelection(id) {
const idStr = id.toString();
if (this.selectedBikes.has(idStr)) {
  this.selectedBikes.delete(idStr);
} else {
  this.selectedBikes.add(idStr);
}

this.updateBulkActionBar();
// Just update the single card, not the whole list
const card = this.dom.bikeList.querySelector(`[data-id="${idStr}"]`);
if (card) {
  card.classList.toggle('selected');
  card.querySelector('.bike-checkbox').setAttribute('aria-checked', this.selectedBikes.has(idStr));
}
  }
  
  toggleExpenseSelection(id) {
    const idStr = id.toString();
    if (this.selectedExpenses.has(idStr)) {
      this.selectedExpenses.delete(idStr);
    } else {
      this.selectedExpenses.add(idStr);
    }

    this.updateBulkActionBar();
    // Update the single expense card
    const card = document.querySelector(`[data-expense-id="${idStr}"]`);
    if (card) {
      card.classList.toggle('selected');
      const checkbox = card.querySelector('.bike-checkbox');
      if (checkbox) checkbox.setAttribute('aria-checked', this.selectedExpenses.has(idStr));
    }
  }
  
  updateBulkActionBar() {
const bar = document.getElementById('bulk-action-bar');
// Count both bikes and expenses selections
const bikeCount = this.selectedBikes.size;
const expenseCount = this.selectedExpenses.size;
const totalCount = bikeCount + expenseCount;
const countEl = document.getElementById('selected-count');
if (countEl) countEl.textContent = totalCount;

if (totalCount > 0) {
  bar.classList.add('active');
} else {
  bar.classList.remove('active');
}
  }
  
  clearSelection() {
this.selectedBikes.clear();
this.selectedExpenses.clear();
this.updateBulkActionBar();
this.renderBikeList(); // Full render needed to remove all 'selected' classes
this.renderExpenses(); // Re-render expenses to remove selection
  }
  
  changePage(delta) {
const newPage = this.currentPage + delta;
if (newPage >= 1 && newPage <= this.totalPages) {
  this.currentPage = newPage;
  this.renderBikeList();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
  }

  async renderStatsDashboard() {
// Render cash flow first since it's most important
await this.renderCashLog();
await this.renderCashFlowChart(); // Render cash flow chart

// Render reminders (expenses moved to list view tabs)
await this.renderReminders();

// This is the source for main page stats too
let bikes = await this.db.bikes.filter(b => !b._deleted).toArray();

// Apply stats-page-specific date filter if active
let filteredBikes = bikes;
if (this.currentView === 'view-stats' && (this.statsDateFilter.from || this.statsDateFilter.to)) {
  filteredBikes = bikes.filter(b => {
if (!b.dateSelling) return false;
const saleDate = new Date(b.dateSelling);
const toDate = this.statsDateFilter.to ? new Date(this.statsDateFilter.to) : null;
if (toDate) toDate.setDate(toDate.getDate() + 1); // Make 'to' inclusive

if (this.statsDateFilter.from && saleDate < new Date(this.statsDateFilter.from)) return false;
if (toDate && saleDate >= toDate) return false;
return true;
  });
}

// Use all bikes for main page stats
const soldBikes = bikes.filter(b => b && b.dateSelling && b.dateSelling !== '');
const unsoldBikes = bikes.filter(b => b && (!b.dateSelling || b.dateSelling === ''));

const totalProfit = soldBikes.reduce((sum, b) => sum + this.safeParseFloat(b.netProfit, 0), 0);
const unsoldValue = unsoldBikes.reduce((sum, b) => 
  sum + this.safeParseFloat(b.purchasePrice, 0) + this.safeParseFloat(b.repairCost, 0), 0
);

// Update main page stats
this.renderCashInHand(); // Update cash
const profitEl = document.getElementById('stat-total-profit');
const unsoldValueEl = document.getElementById('stat-unsold-value');
const soldCountEl = document.getElementById('stat-sold-count');
const unsoldCountEl = document.getElementById('stat-unsold-count');

if (profitEl) profitEl.textContent = this.formatCurrency(totalProfit);
if (unsoldValueEl) unsoldValueEl.textContent = this.formatCurrency(unsoldValue);
if (soldCountEl) soldCountEl.textContent = soldBikes.length.toString();
if (unsoldCountEl) unsoldCountEl.textContent = unsoldBikes.length.toString();

  // Update stats page stats (uses date-filtered bikes)
  if (this.currentView === 'view-stats') {
    const filteredSoldBikes = filteredBikes.filter(b => b && b.dateSelling && b.dateSelling !== '');
    const filteredTotalProfit = filteredSoldBikes.reduce((sum, b) => sum + this.safeParseFloat(b.netProfit, 0), 0);
    const avgProfit = this.safeDivide(filteredTotalProfit, filteredSoldBikes.length, 0);
    
    let insightText = `You have ${unsoldBikes.length} bikes in stock (total investment: ${this.settings.currency}${this.formatCurrency(unsoldValue)}).`;
    if (filteredSoldBikes.length > 0) {
      insightText += ` Your average profit per bike (in selected period) is ${this.settings.currency}${this.formatCurrency(avgProfit)}.`;
    } else if (this.statsDateFilter.from || this.statsDateFilter.to) {
      insightText += ` No bikes sold in the selected period.`;
    }
    
    const insightEl = document.getElementById('auto-insight-text');
    if (insightEl) insightEl.textContent = insightText;
  
  this.renderPerformanceMetrics(filteredSoldBikes);
  
  // Render text-based cash flow analytics
  const entries = await this.getCashLog(1000); // Get more for analysis
  this.renderCashFlowAnalytics(entries);
  
  // Render Chart.js visualizations
  this.renderProfitChart(filteredSoldBikes);
  this.renderSalesVolumeChart(filteredSoldBikes);
}
  }
  
  renderPerformanceMetrics(soldBikes) {
    const avgRoiEl = document.getElementById('stat-avg-roi');
    const bestBikeEl = document.getElementById('stat-best-bike');
    const worstBikeEl = document.getElementById('stat-worst-bike');
    const avgDaysEl = document.getElementById('stat-avg-days');

    if (!avgRoiEl) return;

    if (!Array.isArray(soldBikes) || soldBikes.length === 0) {
      if (avgRoiEl) avgRoiEl.textContent = '0%';
      if (bestBikeEl) bestBikeEl.textContent = '-';
      if (worstBikeEl) worstBikeEl.textContent = '-';
      if (avgDaysEl) avgDaysEl.textContent = '0';
      
      const bestModelEl = document.getElementById('stat-best-model');
      const worstModelEl = document.getElementById('stat-worst-model');
      if (bestModelEl) bestModelEl.textContent = '-';
      if (worstModelEl) worstModelEl.textContent = '-';
      return;
    }

    // Calculate ROI safely
    let totalROI = 0;
    let roiCount = 0;
    soldBikes.forEach(b => {
      if (!b || typeof b !== 'object') return;
      const purchasePrice = this.safeParseFloat(b.purchasePrice, 0);
      const repairCost = this.safeParseFloat(b.repairCost, 0);
      const investment = purchasePrice + repairCost;
      
      if (investment > 0) {
        const profit = this.safeParseFloat(b.netProfit, 0);
        const roi = this.safeDivide(profit * 100, investment, 0);
        totalROI += roi;
        roiCount++;
      }
    });
    
    const avgROI = roiCount > 0 ? totalROI / roiCount : 0;
    if (avgRoiEl) avgRoiEl.textContent = avgROI.toFixed(1) + '%';

    // Sort by profit safely
    const sorted = [...soldBikes]
      .filter(b => b && typeof b === 'object')
      .sort((a, b) => {
        const profitA = this.safeParseFloat(a.netProfit, 0);
        const profitB = this.safeParseFloat(b.netProfit, 0);
        return profitB - profitA;
      });
    
    if (bestBikeEl) bestBikeEl.textContent = sorted[0]?.no || '-';
    if (worstBikeEl) worstBikeEl.textContent = sorted.length > 0 ? sorted[sorted.length - 1]?.no || '-' : '-';

    // Calculate model performance safely
    const modelStats = {};
    soldBikes.forEach(b => {
      if (!b || typeof b !== 'object') return;
      const model = (b.model || '').trim();
      if (!model) return;
      
      if (!modelStats[model]) {
        modelStats[model] = {
          totalProfit: 0,
          count: 0,
          totalRevenue: 0,
          totalCost: 0
        };
      }
      
      const profit = this.safeParseFloat(b.netProfit, 0);
      const revenue = this.safeParseFloat(b.sellingPrice, 0);
      const purchasePrice = this.safeParseFloat(b.purchasePrice, 0);
      const repairCost = this.safeParseFloat(b.repairCost, 0);
      const cost = purchasePrice + repairCost;
      
      modelStats[model].totalProfit += profit;
      modelStats[model].totalRevenue += revenue;
      modelStats[model].totalCost += cost;
      modelStats[model].count++;
    });

    // Calculate average profit per model safely
    const modelAverages = Object.keys(modelStats)
      .map(model => ({
        model,
        avgProfit: this.safeDivide(modelStats[model].totalProfit, modelStats[model].count, 0),
        totalProfit: modelStats[model].totalProfit,
        count: modelStats[model].count
      }))
      .filter(m => m.count > 0);

    // Sort by average profit
    modelAverages.sort((a, b) => b.avgProfit - a.avgProfit);

    const bestModelEl = document.getElementById('stat-best-model');
    const worstModelEl = document.getElementById('stat-worst-model');

    if (bestModelEl && worstModelEl) {
      if (modelAverages.length > 0) {
        bestModelEl.textContent = `${this.escapeHtml(modelAverages[0].model)} (${this.settings.currency}${this.formatCurrency(modelAverages[0].avgProfit)})`;
        worstModelEl.textContent = `${this.escapeHtml(modelAverages[modelAverages.length - 1].model)} (${this.settings.currency}${this.formatCurrency(modelAverages[modelAverages.length - 1].avgProfit)})`;
      } else {
        bestModelEl.textContent = '-';
        worstModelEl.textContent = '-';
      }
    }

    // Calculate average days to sell safely
    let totalDays = 0;
    let validCount = 0;
    soldBikes.forEach(b => {
      if (!b || typeof b !== 'object') return;
      const days = this.safeDaysBetween(b.datePurchase, b.dateSelling);
      if (days !== null && days >= 0) {
        totalDays += days;
        validCount++;
      }
    });
    
    const avgDays = validCount > 0 ? Math.round(totalDays / validCount) : 0;
    if (avgDaysEl) avgDaysEl.textContent = avgDays.toString();
  }
  
  applyStatsDateFilter() {
this.statsDateFilter.from = document.getElementById('stats-date-from').value;
this.statsDateFilter.to = document.getElementById('stats-date-to').value;
this.renderStatsDashboard();
this.showToast('Date filter applied', 'success');
  }
  
  resetStatsDateFilter() {
this.statsDateFilter = { from: null, to: null };
document.getElementById('stats-date-from').value = '';
document.getElementById('stats-date-to').value = '';
this.renderStatsDashboard();
this.showToast('Date filter reset', 'success');
  }
  
  // --- 5. CHART.JS VISUAL ANALYTICS (v4) ---
  
  /**
   * Render profit over time chart
   */
  renderProfitChart(soldBikes) {
    const canvas = document.getElementById('profit-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (this.charts.profit) {
      this.charts.profit.destroy();
    }
    
    if (!Array.isArray(soldBikes) || soldBikes.length === 0) {
      // Show empty state
      this.charts.profit = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            title: { display: true, text: 'No data available' }
          }
        }
      });
      return;
    }
    
    // Group by month
    const monthlyData = {};
    soldBikes.forEach(bike => {
      if (!bike || !bike.dateSelling) return;
      const month = bike.dateSelling.substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = 0;
      }
      monthlyData[month] += this.safeParseFloat(bike.netProfit, 0);
    });
    
    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(m => {
      const date = new Date(m + '-01');
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });
    const data = sortedMonths.map(m => monthlyData[m]);
    
    this.charts.profit = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Profit',
          data: data,
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22, 163, 74, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${this.settings.currency || '₹'}${this.formatCurrency(context.parsed.y)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => `${this.settings.currency || '₹'}${this.formatCurrency(value)}`
            }
          }
        }
      }
    });
  }
  
  /**
   * Render sales volume chart
   */
  renderSalesVolumeChart(soldBikes) {
    const canvas = document.getElementById('sales-volume-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (this.charts.salesVolume) {
      this.charts.salesVolume.destroy();
    }
    
    if (!Array.isArray(soldBikes) || soldBikes.length === 0) {
      this.charts.salesVolume = new Chart(ctx, {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            title: { display: true, text: 'No data available' }
          }
        }
      });
      return;
    }
    
    const monthlyData = {};
    soldBikes.forEach(bike => {
      if (!bike || !bike.dateSelling) return;
      const month = bike.dateSelling.substring(0, 7);
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    });
    
    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(m => {
      const date = new Date(m + '-01');
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });
    const data = sortedMonths.map(m => monthlyData[m]);
    
    this.charts.salesVolume = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Sales Count',
          data: data,
          backgroundColor: '#0e7490',
          borderColor: '#0891b2',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.parsed.y} bike${context.parsed.y !== 1 ? 's' : ''}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }
  
  /**
   * Render cash flow trends chart
   */
  async renderCashFlowChart() {
    const canvas = document.getElementById('cash-flow-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (this.charts.cashFlow) {
      this.charts.cashFlow.destroy();
    }
    
    const entries = await this.getCashLog(1000);
    if (!Array.isArray(entries) || entries.length === 0) {
      this.charts.cashFlow = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            title: { display: true, text: 'No data available' }
          }
        }
      });
      return;
    }
    
    // Group by month
    const monthlyIn = {};
    const monthlyOut = {};
    
    entries.forEach(entry => {
      if (!entry || entry.type === 'set') return;
      const month = entry.timestamp ? entry.timestamp.substring(0, 7) : null;
      if (!month) return;
      
      const amount = this.safeParseFloat(entry.amount, 0);
      if (amount > 0) {
        monthlyIn[month] = (monthlyIn[month] || 0) + amount;
      } else {
        monthlyOut[month] = (monthlyOut[month] || 0) + Math.abs(amount);
      }
    });
    
    const allMonths = [...new Set([...Object.keys(monthlyIn), ...Object.keys(monthlyOut)])].sort();
    const labels = allMonths.map(m => {
      const date = new Date(m + '-01');
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });
    const inData = allMonths.map(m => monthlyIn[m] || 0);
    const outData = allMonths.map(m => monthlyOut[m] || 0);
    
    this.charts.cashFlow = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Inflow',
            data: inData,
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22, 163, 74, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Outflow',
            data: outData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${this.settings.currency || '₹'}${this.formatCurrency(context.parsed.y)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => `${this.settings.currency || '₹'}${this.formatCurrency(value)}`
            }
          }
        }
      }
    });
  }

  // --- 6. CORE CRUD & CASH IN HAND ---
  
  async updateCashInHand(amount, type = 'system', reason = '', transactionId = null, save = true) {
    // Ensure database is initialized
    if (!this.db || !this.db.isOpen()) {
      console.error('Database not initialized');
      throw new Error('Database not initialized');
    }

    const oldBalance = this.settings.cashInHand || 0;
    let newBalance;

    if (type === 'set') {
      newBalance = amount;
    } else {
      // amount is the *delta* (e.g., -500 for decrease, +1000 for increase)
      newBalance = oldBalance + amount;
    }

    // Record the change
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: type, // 'set', 'increase', 'decrease', 'buy', 'sell', 'system'
      amount: type === 'set' ? amount : amount, // Store the delta for non-set, or full amount for set
      reason: reason || '',
      balance: newBalance,
      transactionId: transactionId || null
    };

    // Special case: if type is 'set', the 'amount' field in log should be the new balance
    if (type === 'set') {
      logEntry.amount = amount;
    }

    try {
      // Add the log entry to the database
      const addedId = await this.db.cashLog.add(logEntry);
      console.log('Cash log entry added successfully with ID:', addedId);
      
      // Verify the entry was added
      const verifyEntry = await this.db.cashLog.get(addedId);
      if (!verifyEntry) {
        throw new Error('Failed to verify cash log entry was saved');
      }
      
      this.settings.cashInHand = newBalance;
      if (save) {
        this.saveSettings();
      }
      this.renderCashInHand();
      
      if(this.currentView === 'view-stats') {
        await this.renderCashLog(); // Update the log view if visible
        const entries = await this.getCashLog(1000);
        this.renderCashFlowAnalytics(entries); // Update the cash flow text
      }
      
      // Don't trigger sync for every minor change
      if (['set', 'increase', 'decrease'].includes(type)) {
        this.triggerAutoSync();
      }
    } catch (error) {
      console.error('Failed to record cash change:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        logEntry: logEntry
      });
      this.showToast(`Failed to update cash balance: ${error.message}`, 'error');
      throw error; // Re-throw to handle in caller
    }
  }
  
  async getCashLog(limit = 100) {
return await this.db.cashLog
  .orderBy('timestamp')
  .reverse()
  .limit(limit)
  .toArray();
  }
  
  async exportCashLog() {
    try {
      // Sync data from repository before exporting
      if (this.isOnline && this.settings.repoOwner && this.settings.repoName && this.settings.githubPat) {
        this.showToast("Syncing cash log from repository...", 'info');
        try {
          await this.triggerAutoSync(true); // Wait for sync to complete
          this.showToast("Sync complete. Generating export...", 'info');
        } catch (syncError) {
          console.warn('Sync failed before export, continuing with local data:', syncError);
          this.showToast("Sync failed, exporting local data...", 'warning');
        }
      }

      // Re-read cash log from DB after sync to ensure we have latest data
      const entries = await this.getCashLog(10000); // Get all entries for export
      
      if (!Array.isArray(entries) || entries.length === 0) {
        this.showToast('No cash log entries to export', 'warning');
        return;
      }

      // Safely map entries with validation
      const exportData = entries
        .filter(entry => entry && typeof entry === 'object')
        .map(entry => {
          const timestamp = entry.timestamp ? this.safeParseDate(entry.timestamp) : null;
          return {
            date: timestamp ? timestamp.toLocaleString() : '-',
            type: entry.type || '-',
            amount: this.safeParseFloat(entry.amount, 0),
            reason: entry.reason || '-',
            balance: this.safeParseFloat(entry.balance, 0),
            transactionId: entry.transactionId || ''
          };
        });

      if (exportData.length === 0) {
        this.showToast('No valid cash log entries to export', 'warning');
        return;
      }

      // Generate CSV for cash log data (different structure than bikes)
      const csvHeaders = ['date', 'type', 'amount', 'reason', 'balance', 'transactionId'];
      const headerRow = csvHeaders.map(h => `"${h}"`).join(',');
      
      const csvRows = exportData.map(entry => {
        return csvHeaders.map(header => {
          const value = entry[header] === undefined || entry[header] === null ? '' : entry[header];
          // Escape quotes and wrap in quotes
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',');
      });
      
      const csv = [headerRow, ...csvRows].join('\r\n');
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `cash-log-${timestamp}.csv`;
      
      this.downloadFile(csv, filename, 'text/csv;charset=utf-8;');
      this.showToast(`Cash log exported successfully (${exportData.length} entries)`, 'success');
    } catch (error) {
      console.error('Cash log export failed:', error);
      this.showToast(`Failed to export cash log: ${error.message}`, 'error');
    }
  }
  
  async renderCashLog() {
const logContainer = document.getElementById('cash-log');
if (!logContainer) return; // Not on stats page

const entries = await this.getCashLog(50); // Show last 50 entries

requestAnimationFrame(() => {
  logContainer.innerHTML = entries.map(entry => {
let icon = 'âš¡';
let iconClass = entry.type;
let title = '';
let amountVal = parseFloat(entry.amount);

switch(entry.type) {
  case 'increase':
    icon = '💹';
    title = 'Cash Added';
    break;

  case 'decrease':
    icon = '📉';
    title = 'Cash Removed';
    break;

  case 'set':
    icon = '⚡';
    title = 'Balance Set';
    break;

  case 'buy':
    icon = '🛒';
    title = 'Purchase';
    break;

  case 'sell':
    icon = '💸';
    title = 'Sale';
    break;

  default:
    icon = '🔧';
    iconClass = 'system';
    title = 'System Update';
}


const date = new Date(entry.timestamp).toLocaleString();
let amountDisplay;

if(entry.type === 'set') {
amountDisplay = `= ${this.settings.currency} ${this.formatCurrency(amountVal)}`;
iconClass = 'set';
} else if (amountVal >= 0) {
amountDisplay = `+${this.settings.currency} ${this.formatCurrency(amountVal)}`;
iconClass = 'increase';
} else {
amountDisplay = `-${this.settings.currency} ${this.formatCurrency(Math.abs(amountVal))}`;
iconClass = 'decrease';
}

return `
  <div class="cash-entry">
<div class="cash-entry-icon ${iconClass}">${icon}</div>
<div class="cash-entry-details">
  <div class="cash-entry-title">${title}</div>
  <div class="cash-entry-meta">
${this.escapeHtml(entry.reason || '')}
<br/>
<small>${date}</small>
  </div>
</div>
<div class="cash-entry-amount ${iconClass}">${amountDisplay}</div>
  </div>
`;
  }).join('') || '<p class="text-secondary text-center p-4">No cash transactions recorded yet.</p>';
});
  }
  
  // --- EXPENSES MANAGEMENT ---
  
  async renderExpenses() {
    const container = document.getElementById('expenses-list');
    if (!container) return;
    
    const expenses = await this.db.expenses.orderBy('date').reverse().limit(50).toArray();
    
    if (!Array.isArray(expenses) || expenses.length === 0) {
      container.innerHTML = '<p class="text-secondary text-center p-4">No expenses recorded yet.</p>';
      return;
    }
    
    const isSelected = (id) => this.selectedExpenses.has(id.toString());
    
    container.innerHTML = expenses.map(expense => {
      const date = expense.date ? new Date(expense.date).toLocaleDateString() : '-';
      const amount = this.safeParseFloat(expense.amount, 0);
      const selected = isSelected(expense._id);
      return `
        <div class="bike-card ${selected ? 'selected' : ''}" data-expense-id="${expense._id}" role="listitem" tabindex="0" style="padding: 12px; display: flex; align-items: center; gap: 12px;">
          <div class="bike-checkbox" role="checkbox" aria-checked="${selected}" aria-label="Select expense">
            <svg><use href="#icon-check"></use></svg>
          </div>
          ${expense.image ? `<div style="width: 60px; height: 60px; border-radius: 8px; overflow: hidden; flex-shrink: 0; border: 1px solid var(--border-color);"><img src="${expense.image}" alt="Expense receipt" style="width: 100%; height: 100%; object-fit: cover;" /></div>` : ''}
          <div style="flex: 1; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>${this.escapeHtml(expense.category || 'Other')}</strong>
              <div class="text-secondary" style="font-size: 0.9rem; margin-top: 4px;">
                ${this.escapeHtml(expense.description || '')}
                <br/>
                <small>${date}</small>
              </div>
            </div>
            <div style="font-size: 1.2rem; font-weight: bold; color: var(--error);">
              ${this.settings.currency || '₹'}${this.formatCurrency(amount)}
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    // Click handlers are attached via event delegation in initEventListeners
  }
  
  async handleSaveExpense() {
    const id = document.getElementById('expense-id').value;
    const date = document.getElementById('expense-date').value;
    const category = document.getElementById('expense-category').value;
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const description = document.getElementById('expense-description').value;
    
    if (!date || !category || isNaN(amount) || amount <= 0) {
      this.showToast('Please fill all required fields', 'error');
      return;
    }
    
    try {
      // Handle image upload
      let imageBlob = null;
      const imageInput = document.getElementById('expense-image');
      const imagePreview = document.getElementById('expense-image-preview-img');
      if (imageInput && imageInput.files && imageInput.files[0]) {
        imageBlob = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(imageInput.files[0]);
        });
      } else if (imagePreview && imagePreview.src && imagePreview.src.startsWith('data:')) {
        // Keep existing image if no new one uploaded
        imageBlob = imagePreview.src;
      }
      
      const expense = {
        date,
        category,
        amount,
        description: description || '',
        image: imageBlob,
        _updatedAt: new Date().toISOString()
      };
      
      let oldExpense = null;
      if (id) {
        expense._id = Number(id);
        oldExpense = await this.db.expenses.get(expense._id);
        await this.db.expenses.put(expense);
        
        // Update cash if amount changed
        if (oldExpense && oldExpense.amount !== amount) {
          const cashChange = (oldExpense.amount || 0) - amount; // Negative means we're adding back cash
          const reason = `Expense updated: ${category} - ${description || 'No description'}`;
          await this.updateCashInHand(cashChange, 'expense', reason, `expense_${expense._id}_update`);
        }
        
        this.showToast('Expense updated', 'success');
      } else {
        // New expense - decrease cash (capital)
        const expenseId = await this.db.expenses.add(expense);
        const reason = `Business expense: ${category} - ${description || 'No description'}`;
        await this.updateCashInHand(-amount, 'expense', reason, `expense_${expenseId}_new`);
        this.showToast('Expense added and cash updated', 'success');
      }
      
      document.getElementById('expense-modal').classList.remove('active');
      document.getElementById('expense-form').reset();
      
      // Reset image preview
      const imagePreviewDiv = document.getElementById('expense-image-preview');
      if (imagePreviewDiv) imagePreviewDiv.style.display = 'none';
      if (imagePreview) imagePreview.src = '';
      
      await this.renderExpenses();
      await this.renderAll(); // Update cash display
      this.triggerAutoSync();
    } catch (error) {
      console.error('Failed to save expense:', error);
      this.showToast('Failed to save expense', 'error');
    }
  }
  
  // --- CUSTOMERS MANAGEMENT ---
  
  async loadCustomers() {
    const customers = await this.db.customers.orderBy('name').toArray();
    const select = document.getElementById('form-owner-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select or type to search...</option>' +
      customers.map(c => `<option value="${c._id}">${this.escapeHtml(c.name)}${c.phone ? ` (${c.phone})` : ''}</option>`).join('');
  }
  
  async handleSaveCustomer() {
    const id = document.getElementById('customer-id').value;
    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const email = document.getElementById('customer-email').value.trim();
    const address = document.getElementById('customer-address').value.trim();
    
    if (!name) {
      this.showToast('Name is required', 'error');
      return;
    }
    
    try {
      const customer = {
        name,
        phone: phone || '',
        email: email || '',
        address: address || '',
        _updatedAt: new Date().toISOString()
      };
      
      let customerId;
      if (id) {
        customer._id = Number(id);
        await this.db.customers.put(customer);
        customerId = customer._id;
        this.showToast('Customer updated', 'success');
      } else {
        customerId = await this.db.customers.add(customer);
        this.showToast('Customer added', 'success');
      }
      
      document.getElementById('customer-modal').classList.remove('active');
      document.getElementById('customer-form').reset();
      await this.loadCustomers();
      
      // Update form if it's open
      const ownerSelect = document.getElementById('form-owner-select');
      if (ownerSelect) {
        ownerSelect.value = customerId;
        document.getElementById('form-owner-id').value = customerId;
        const customerData = await this.db.customers.get(customerId);
        if (customerData) {
          document.getElementById('form-owner').value = customerData.name;
        }
      }
      
      this.triggerAutoSync();
    } catch (error) {
      console.error('Failed to save customer:', error);
      this.showToast('Failed to save customer', 'error');
    }
  }
  
  // --- REMINDERS MANAGEMENT ---
  
  async renderReminders() {
    const container = document.getElementById('reminders-list');
    if (!container) return;
    
    const bikes = await this.db.bikes.filter(b => !b._deleted && b.serviceDueDate && b.serviceDueDate !== '').toArray();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const reminders = bikes
      .filter(bike => {
        if (!bike.serviceDueDate) return false;
        const dueDate = new Date(bike.serviceDueDate);
        dueDate.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        return daysUntil <= 30; // Show reminders for next 30 days
      })
      .sort((a, b) => new Date(a.serviceDueDate) - new Date(b.serviceDueDate))
      .slice(0, 20);
    
    if (reminders.length === 0) {
      container.innerHTML = '<p class="text-secondary text-center p-4">No upcoming service reminders.</p>';
      return;
    }
    
    container.innerHTML = reminders.map(bike => {
      const dueDate = new Date(bike.serviceDueDate);
      const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      const isOverdue = daysUntil < 0;
      const isDueSoon = daysUntil <= 7;
      
      return `
        <div class="bike-card" style="padding: 12px; border-left: 4px solid ${isOverdue ? 'var(--error)' : isDueSoon ? 'var(--warning)' : 'var(--accent-1)'};">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>${this.escapeHtml(bike.no || 'N/A')}</strong>
              <div class="text-secondary" style="font-size: 0.9rem; margin-top: 4px;">
                ${this.escapeHtml(bike.owner || 'Unknown')} - ${this.escapeHtml(bike.model || 'No model')}
                <br/>
                <small>Due: ${dueDate.toLocaleDateString()}</small>
              </div>
            </div>
            <div style="font-weight: bold; color: ${isOverdue ? 'var(--error)' : isDueSoon ? 'var(--warning)' : 'var(--text-secondary)'};">
              ${isOverdue ? `${Math.abs(daysUntil)} days overdue` : daysUntil === 0 ? 'Due today' : `${daysUntil} days left`}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  async renderCashFlowAnalytics(entries) {
    if (!document.getElementById('stat-cash-inflow')) return; // Not on stats page

    if (!Array.isArray(entries)) {
      console.error('renderCashFlowAnalytics: entries is not an array');
      return;
    }

    let totalIn = 0;
    let totalOut = 0;
    let largestIn = { amount: 0, reason: '-' };
    let largestOut = { amount: 0, reason: '-' };

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let netFlow30Day = 0;

    const now = new Date();
    const thisMonth = now.toISOString().substring(0, 7);
    let thisMonthFlow = 0;
    
    // Calculate last month safely
    const lastMonthDate = new Date(now);
    lastMonthDate.setMonth(now.getMonth() - 1);
    const lastMonth = lastMonthDate.toISOString().substring(0, 7);
    let lastMonthFlow = 0;

    entries.forEach(entry => {
      if (!entry || typeof entry !== 'object') return;
      if (entry.type === 'set') return; // Ignore 'set' for flow calculations

      const amount = this.safeParseFloat(entry.amount, 0);
      if (amount === 0) return;

      const entryDate = entry.timestamp ? this.safeParseDate(entry.timestamp) : null;
      const entryMonth = entry.timestamp && typeof entry.timestamp === 'string' ? entry.timestamp.substring(0, 7) : null;

      if (amount > 0) {
        totalIn += amount;
        if (amount > largestIn.amount) {
          largestIn = { amount, reason: entry.reason || entry.type || '-' };
        }
      } else {
        const absAmount = Math.abs(amount);
        totalOut += absAmount;
        if (absAmount > largestOut.amount) {
          largestOut = { amount: absAmount, reason: entry.reason || entry.type || '-' };
        }
      }
      
      if (entryDate && entryDate > thirtyDaysAgo) {
        netFlow30Day += amount;
      }
      
      if (entryMonth) {
        if (entryMonth === thisMonth) {
          thisMonthFlow += amount;
        } else if (entryMonth === lastMonth) {
          lastMonthFlow += amount;
        }
      }
    });

    // Update summary stats safely
    const inflowEl = document.getElementById('stat-cash-inflow');
    const outflowEl = document.getElementById('stat-cash-outflow');
    const netEl = document.getElementById('stat-net-cash');
    const currentEl = document.getElementById('stat-cash-current');
    
    if (inflowEl) inflowEl.textContent = `${this.settings.currency} ${this.formatCurrency(totalIn)}`;
    if (outflowEl) outflowEl.textContent = `${this.settings.currency} ${this.formatCurrency(totalOut)}`;
    if (netEl) netEl.textContent = `${this.settings.currency} ${this.formatCurrency(totalIn - totalOut)}`;
    if (currentEl) currentEl.textContent = `${this.settings.currency} ${this.formatCurrency(this.settings.cashInHand)}`;

    // Update text analytics
    const summary30El = document.getElementById('cash-30-day-summary');
    const growthEl = document.getElementById('cash-monthly-growth');
    const largestInEl = document.getElementById('cash-largest-inflow');
    const largestOutEl = document.getElementById('cash-largest-outflow');

    if (summary30El) {
      summary30El.textContent = `${netFlow30Day >= 0 ? '+' : ''}${this.settings.currency} ${this.formatCurrency(netFlow30Day)}`;
      summary30El.className = `analytics-value ${netFlow30Day >= 0 ? 'text-success' : 'text-error'}`;
    }

    let growthText;
    if (lastMonthFlow > 0) {
      const growth = this.safeDivide((thisMonthFlow - lastMonthFlow) * 100, lastMonthFlow, 0);
      growthText = `${growth.toFixed(1)}% vs last month`;
    } else if (thisMonthFlow > 0) {
      growthText = 'N/A (no flow last month)';
    } else {
      growthText = '0.0%';
    }
    
    if (growthEl) {
      growthEl.textContent = growthText;
      growthEl.className = `analytics-value ${thisMonthFlow >= lastMonthFlow ? 'text-success' : 'text-error'}`;
    }

    if (largestInEl) {
      largestInEl.textContent = `${this.settings.currency} ${this.formatCurrency(largestIn.amount)} (${this.escapeHtml(largestIn.reason)})`;
      largestInEl.className = 'analytics-value text-success';
    }

    if (largestOutEl) {
      largestOutEl.textContent = `${this.settings.currency} ${this.formatCurrency(largestOut.amount)} (${this.escapeHtml(largestOut.reason)})`;
      largestOutEl.className = 'analytics-value text-error';
    }
  }
  
  async openCashModal(mode = 'set') {
const modal = document.getElementById('cash-modal');
const operation = document.getElementById('cash-operation');
const amount = document.getElementById('cash-amount');
const reason = document.getElementById('cash-reason');
const reasonGroup = document.getElementById('cash-reason-group');
const current = document.getElementById('cash-current');
const newBalance = document.getElementById('cash-new');

operation.value = mode;
amount.value = '';
reason.value = '';
current.value = `${this.settings.currency} ${this.formatCurrency(this.settings.cashInHand)}`;
newBalance.value = current.value;

reasonGroup.style.display = mode === 'decrease' ? 'block' : 'none';

const updateNewBalance = () => {
  const value = parseFloat(amount.value) || 0;
  const currentCash = this.settings.cashInHand || 0;
  let newValue;
  
  switch(operation.value) {
case 'set':
  newValue = value;
  break;
case 'increase':
  newValue = currentCash + value;
  break;
case 'decrease':
  newValue = currentCash - value;
  break;
  }
  
  newBalance.value = `${this.settings.currency} ${this.formatCurrency(newValue)}`;
  
  // Show warning if balance would go negative
  if (newValue < 0) {
newBalance.style.color = 'var(--error)';
  } else {
newBalance.style.color = '';
  }
};

operation.onchange = () => {
  reasonGroup.style.display = operation.value === 'decrease' ? 'block' : 'none';
  updateNewBalance();
};

amount.oninput = updateNewBalance;

modal.classList.add('active');
  }
  
  async closeCashModal() {
document.getElementById('cash-modal').classList.remove('active');
  }
  
  async handleSaveCash() {
    // Ensure database is initialized
    if (!this.db || !this.db.isOpen()) {
      this.showToast('Database not ready. Please refresh the page.', 'error');
      console.error('Database not initialized when trying to save cash');
      return;
    }

    const operationEl = document.getElementById('cash-operation');
    const amountEl = document.getElementById('cash-amount');
    const reasonEl = document.getElementById('cash-reason');

    if (!operationEl || !amountEl) {
      this.showToast('Cash form elements not found', 'error');
      console.error('Cash form elements missing');
      return;
    }

    const operation = operationEl.value;
    const amountStr = amountEl.value;
    const reason = reasonEl ? reasonEl.value : '';

    if (!amountStr || amountStr.trim() === '') {
      this.showToast('Please enter an amount', 'error');
      return;
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount < 0) {
      this.showToast('Please enter a valid positive amount', 'error');
      return;
    }

    if (operation === 'decrease' && !reason.trim()) {
      this.showToast('Please provide a reason for decreasing cash', 'error');
      return;
    }

    try {
      console.log('Saving cash transaction:', { operation, amount, reason });
      
      switch(operation) {
        case 'set':
          await this.updateCashInHand(amount, 'set', reason || 'Manual balance set');
          break;
        case 'increase':
          await this.updateCashInHand(amount, 'increase', reason || 'Manual cash increase');
          break;
        case 'decrease':
          await this.updateCashInHand(-amount, 'decrease', reason);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
      
      // Verify the entry was saved by checking the database
      const recentEntries = await this.getCashLog(1);
      if (recentEntries.length === 0) {
        console.warn('Warning: Cash log entry may not have been saved');
      } else {
        console.log('Cash log entry verified:', recentEntries[0]);
      }
      
      this.showToast('Cash updated successfully', 'success');
      this.closeCashModal();
      
      // Clear the form
      if (amountEl) amountEl.value = '';
      if (reasonEl) reasonEl.value = '';
      
      await this.renderAll(); // Update all views
      
    } catch (error) {
      console.error('Cash operation failed:', error);
      this.showToast(`Failed to update cash: ${error.message}`, 'error');
    }
  }
  
  handleNewBike() {
this.openFormModal('buy');
  }
  
  async handleEditBike(id) {
try {
  const bike = await this.db.bikes.get(Number(id));
  if (bike) {
const mode = (bike.dateSelling && bike.dateSelling !== '') ? 'view' : 'sell';
this.openFormModal(mode, bike);
  }
} catch (error) {
  console.error("Failed to get bike for editing:", error);
  this.showToast("Could not load bike data.", 'error');
}
  }
  
  async handleSaveBike() {
const form = document.getElementById('bike-form');
const id = document.getElementById('form-bike-id').value;

const plate = document.getElementById('form-no').value.trim().toUpperCase();
const ownerSelect = document.getElementById('form-owner-select');
const ownerId = ownerSelect ? ownerSelect.value : null;
const ownerInput = document.getElementById('form-owner');
const owner = ownerId ? (await this.db.customers.get(Number(ownerId)))?.name || '' : ownerInput.value.trim();
const model = document.getElementById('form-model').value.trim();
const serviceDueDate = document.getElementById('form-serviceDueDate').value || '';

if (!plate || !owner) {
  this.showToast("Bike Plate and Owner/Customer are required.", 'error');
  return;
}

const purchasePrice = parseFloat(document.getElementById('form-purchasePrice').value) || 0;
const repairCost = parseFloat(document.getElementById('form-repairCost').value) || 0;
const sellingPrice = parseFloat(document.getElementById('form-sellingPrice').value) || 0;
const datePurchase = document.getElementById('form-datePurchase').value || '';
const dateSelling = document.getElementById('form-dateSelling').value || '';

// Handle multiple images (max 3)
let images = [];
const imagesInput = document.getElementById('form-images');
const captureInput = document.getElementById('form-image-capture');
const imagesPreview = document.getElementById('form-images-preview');

// Get existing images from preview (if any)
const existingImages = imagesPreview.querySelectorAll('img');
existingImages.forEach(img => {
  if (img.src && img.src.startsWith('data:')) {
    images.push(img.src);
  }
});

// Get new images from file inputs
const processFileList = async (fileList) => {
  const promises = Array.from(fileList).slice(0, 3 - images.length).map(file => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  });
  return Promise.all(promises);
};

if (imagesInput && imagesInput.files && imagesInput.files.length > 0) {
  const newImages = await processFileList(imagesInput.files);
  images = [...images, ...newImages].slice(0, 3);
} else if (captureInput && captureInput.files && captureInput.files.length > 0) {
  const newImages = await processFileList(captureInput.files);
  images = [...images, ...newImages].slice(0, 3);
}

// Get supplier ID
const supplierId = document.getElementById('form-supplier')?.value || null;

const bikeData = {
  no: plate,
  owner: owner,
  ownerId: ownerId ? Number(ownerId) : null,
  supplierId: supplierId ? Number(supplierId) : null,
  model: model || '',
  purchasePrice: purchasePrice,
  repairCost: repairCost,
  sellingPrice: sellingPrice,
  netProfit: sellingPrice - (purchasePrice + repairCost),
  datePurchase: datePurchase,
  dateSelling: dateSelling,
  serviceDueDate: serviceDueDate,
  images: images, // Array of base64 data URLs (max 3)
  _updatedAt: new Date().toISOString(),
  _deleted: false,
};

try {
  let oldBike = null;
  let cashChange = 0;
  let transactionId = null;

  if (id) {
// --- UPDATE ---
oldBike = await this.db.bikes.get(Number(id));

const oldCost = (oldBike.purchasePrice || 0) + (oldBike.repairCost || 0);
const newCost = (bikeData.purchasePrice || 0) + (bikeData.repairCost || 0);
const oldRevenue = (oldBike.sellingPrice || 0);
const newRevenue = (bikeData.sellingPrice || 0);

// Cash change = (change in revenue) - (change in cost)
cashChange = (newRevenue - oldRevenue) - (newCost - oldCost);

// Record transaction ID for cash log
transactionId = `bike_${id}_update`;

// Calculate changes for edit log
const changes = [];
if (oldBike.no !== bikeData.no) changes.push({ field: 'no', old: oldBike.no, new: bikeData.no });
if (oldBike.owner !== bikeData.owner) changes.push({ field: 'owner', old: oldBike.owner, new: bikeData.owner });
if ((oldBike.model || '') !== bikeData.model) changes.push({ field: 'model', old: oldBike.model || '', new: bikeData.model });
if (oldBike.datePurchase !== bikeData.datePurchase) changes.push({ field: 'datePurchase', old: oldBike.datePurchase, new: bikeData.datePurchase });
if (oldBike.purchasePrice !== bikeData.purchasePrice) changes.push({ field: 'purchasePrice', old: oldBike.purchasePrice, new: bikeData.purchasePrice });
if (oldBike.repairCost !== bikeData.repairCost) changes.push({ field: 'repairCost', old: oldBike.repairCost, new: bikeData.repairCost });
if (oldBike.dateSelling !== bikeData.dateSelling) changes.push({ field: 'dateSelling', old: oldBike.dateSelling || '', new: bikeData.dateSelling || '' });
if (oldBike.sellingPrice !== bikeData.sellingPrice) changes.push({ field: 'sellingPrice', old: oldBike.sellingPrice || 0, new: bikeData.sellingPrice || 0 });
if (oldBike.netProfit !== bikeData.netProfit) changes.push({ field: 'netProfit', old: oldBike.netProfit || 0, new: bikeData.netProfit || 0 });

// Log the edit
await this.db.editLog.add({
  timestamp: new Date().toISOString(),
  bikeId: Number(id),
  bikePlate: bikeData.no,
  action: 'update',
  oldData: JSON.stringify(oldBike),
  newData: JSON.stringify(bikeData),
  changes: JSON.stringify(changes)
});

await this.db.bikes.update(Number(id), {...bikeData});
this.showToast("Bike updated successfully.", 'success');
this.addToUndoStack('update', oldBike);

  } else {
// --- CREATE ---
// Cost is negative cash flow
cashChange = -(bikeData.purchasePrice + bikeData.repairCost);
// Revenue (if sold immediately) is positive
cashChange += bikeData.sellingPrice;

const newId = await this.db.bikes.add(bikeData);
bikeData._id = newId; // For undo
transactionId = `bike_${newId}_new`;

// Log the creation
await this.db.editLog.add({
  timestamp: new Date().toISOString(),
  bikeId: newId,
  bikePlate: bikeData.no,
  action: 'create',
  oldData: null,
  newData: JSON.stringify(bikeData),
  changes: JSON.stringify([{ field: 'action', old: null, new: 'created' }])
});

this.showToast("Bike added successfully.", 'success');
this.addToUndoStack('create', bikeData);
  }
  
// Update cash balance with transaction log
const reason = id ? 
  `Updated bike ${bikeData.no} (${bikeData.owner})` :
  `New bike purchase: ${bikeData.no} (${bikeData.owner})`;

await this.updateCashInHand(
  cashChange,
  cashChange >= 0 ? 'sell' : 'buy', // Simple classification
  reason,
  transactionId
);  
  this.vibrate(20);
  this.closeFormModal();
  await this.renderAll();
  this.triggerAutoSync(); // Auto-sync on save
  
} catch (error) {
  console.error("Save bike failed:", error);
  if (error.name === 'ConstraintError') {
this.showToast("A bike with this plate number already exists.", 'error');
  } else {
this.showToast("Failed to save bike.", 'error');
  }
}
  }
  
  async handleDeleteBike() {
const id = document.getElementById('form-bike-id').value;
if (!id) return;

if (!confirm("Are you sure you want to delete this bike? This will adjust your cash in hand and can be undone.")) {
return;
}

try {
const bike = await this.db.bikes.get(Number(id));
if (!bike) return;

await this.db.bikes.update(Number(id), {
_deleted: true,
_updatedAt: new Date().toISOString()
});

// Log the deletion
await this.db.editLog.add({
  timestamp: new Date().toISOString(),
  bikeId: Number(id),
  bikePlate: bike.no,
  action: 'delete',
  oldData: JSON.stringify(bike),
  newData: null,
  changes: JSON.stringify([{ field: 'action', old: 'active', new: 'deleted' }])
});

// Reverse the cash flow for this bike
const cost = (bike.purchasePrice || 0) + (bike.repairCost || 0);
const revenue = (bike.sellingPrice || 0);
const cashChange = cost - revenue; // Add back cost, remove revenue

await this.updateCashInHand(
cashChange,
'system', // 'delete' isn't a type, use system
`Deleted bike ${bike.no}`,
`bike_${id}_delete`
);
this.addToUndoStack('delete', bike);
this.showToastWithUndo("Bike deleted.", () => this.performUndo());

this.vibrate(50);
this.closeFormModal();
await this.renderAll();
this.triggerAutoSync(); // Auto-sync on delete
} catch (error) {
console.error("Delete failed:", error);
this.showToast("Failed to delete bike.", 'error');
}
  }
  
  // REMOVED: handleDuplicateBike - replaced with edit functionality
  // Users can now edit any bike directly from the form
  
  async handleBulkMarkSold() {
if (this.selectedBikes.size === 0) {
this.showToast('No bikes selected', 'warning');
return;
}

// Open the modal instead of using prompts
document.getElementById('bulk-sell-count').textContent = this.selectedBikes.size;
document.getElementById('bulk-sell-date').value = new Date().toISOString().split('T')[0];
document.getElementById('bulk-sell-price').value = '';
this.dom.bulkSellModal.classList.add('active');
document.getElementById('bulk-sell-price').focus();
  }

  async handleBulkSellModalSubmit() {
const sellDate = document.getElementById('bulk-sell-date').value;
const sellPriceStr = document.getElementById('bulk-sell-price').value;
const sellPrice = parseFloat(sellPriceStr);

if (!sellDate || !/^\d{4}-\d{2}-\d{2}$/.test(sellDate)) {
this.showToast("Invalid date format", 'error');
return;
}
if (isNaN(sellPrice) || sellPrice < 0) {
this.showToast("Invalid selling price", 'error');
return;
}

try {
  const now = new Date().toISOString();
  const bikesToUpdate = [];
  const oldBikes = [];
  let totalCashChange = 0;
  
  for (const idStr of this.selectedBikes) {
const bike = await this.db.bikes.get(Number(idStr));
if (bike && (!bike.dateSelling || bike.dateSelling === '')) {
  oldBikes.push(JSON.parse(JSON.stringify(bike))); // Deep copy for undo
  
  const oldRevenue = bike.sellingPrice || 0;
  totalCashChange += (sellPrice - oldRevenue);

  bike.dateSelling = sellDate;
  bike.sellingPrice = sellPrice;
  bike.netProfit = sellPrice - (parseFloat(bike.purchasePrice || 0) + parseFloat(bike.repairCost || 0));
  bike._updatedAt = now;
  bikesToUpdate.push(bike);
}
  }
  
  if (bikesToUpdate.length > 0) {
await this.db.bikes.bulkPut(bikesToUpdate);
await this.updateCashInHand(
totalCashChange,
'sell',
`Bulk sold ${bikesToUpdate.length} bikes`,
`bulk_sell_${Date.now()}`
);
this.addToUndoStack('bulk-update', oldBikes);
this.showToast(`${bikesToUpdate.length} bikes marked as sold`, 'success');
  } else {
this.showToast('No unsold bikes were selected', 'info');
  }
  
  this.closeBulkSellModal();
  this.clearSelection();
  await this.renderAll();
  this.triggerAutoSync(); // Auto-sync on bulk sell
} catch (error) {
  console.error("Bulk mark sold failed:", error);
  this.showToast("Failed to mark bikes as sold", 'error');
}
  }

  async handleBulkDelete() {
const bikeCount = this.selectedBikes.size;
const expenseCount = this.selectedExpenses.size;
const totalCount = bikeCount + expenseCount;

if (totalCount === 0) {
  this.showToast('No items selected', 'warning');
  return;
}

let confirmMessage = '';
if (bikeCount > 0 && expenseCount > 0) {
  confirmMessage = `Are you sure you want to delete ${bikeCount} bikes and ${expenseCount} expenses? This will adjust your cash in hand and can be undone.`;
} else if (bikeCount > 0) {
  confirmMessage = `Are you sure you want to delete ${bikeCount} selected bikes? This will adjust your cash in hand and can be undone.`;
} else {
  confirmMessage = `Are you sure you want to delete ${expenseCount} selected expenses? This will adjust your cash in hand and can be undone.`;
}

if (!confirm(confirmMessage)) {
return;
}

try {
const now = new Date().toISOString();
let totalCashChange = 0;

// Delete bikes
if (bikeCount > 0) {
  const bikesToDelete = [];
  for (const idStr of this.selectedBikes) {
    const bike = await this.db.bikes.get(Number(idStr));
    if (bike) {
      bikesToDelete.push(JSON.parse(JSON.stringify(bike))); // Deep copy for undo
      
      const cost = (bike.purchasePrice || 0) + (bike.repairCost || 0);
      const revenue = (bike.sellingPrice || 0);
      totalCashChange += (cost - revenue); // Reverse transaction
      
      bike._deleted = true;
      bike._updatedAt = now;
      await this.db.bikes.put(bike); // Update one by one
    }
  }
  if (bikesToDelete.length > 0) {
    this.addToUndoStack('bulk-delete-bikes', bikesToDelete);
  }
}

// Delete expenses
if (expenseCount > 0) {
  const expensesToDelete = [];
  for (const idStr of this.selectedExpenses) {
    const expense = await this.db.expenses.get(Number(idStr));
    if (expense) {
      expensesToDelete.push(JSON.parse(JSON.stringify(expense))); // Deep copy for undo
      
      // Add back the expense amount (reverse the cash deduction)
      totalCashChange += expense.amount || 0;
      
      await this.db.expenses.delete(Number(idStr));
    }
  }
  if (expensesToDelete.length > 0) {
    this.addToUndoStack('bulk-delete-expenses', expensesToDelete);
  }
}

if (totalCashChange !== 0) {
await this.updateCashInHand(
totalCashChange,
'system',
`Bulk deleted ${bikeCount} bikes and ${expenseCount} expenses`,
`bulk_delete_${Date.now()}`
);
}

let successMessage = '';
if (bikeCount > 0 && expenseCount > 0) {
  successMessage = `${bikeCount} bikes and ${expenseCount} expenses deleted.`;
} else if (bikeCount > 0) {
  successMessage = `${bikeCount} bikes deleted.`;
} else {
  successMessage = `${expenseCount} expenses deleted.`;
}

this.showToastWithUndo(successMessage, () => this.performUndo());

this.clearSelection();
await this.renderAll();
this.triggerAutoSync(); // Auto-sync on bulk delete
} catch (error) {
console.error("Bulk delete failed:", error);
this.showToast("Failed to delete items", 'error');
}
  }

  async handleBulkExport() {
    const bikeCount = this.selectedBikes.size;
    const expenseCount = this.selectedExpenses.size;
    const totalCount = bikeCount + expenseCount;

    if (totalCount === 0) {
      this.showToast('No items selected', 'warning');
      return;
    }

    try {
      // Sync data from repository before exporting to ensure selected items have latest data
      if (this.isOnline && this.settings.repoOwner && this.settings.repoName && this.settings.githubPat) {
        this.showToast("Syncing data from repository...", 'info');
        try {
          await this.triggerAutoSync(true); // Wait for sync to complete
          this.showToast("Sync complete. Generating export...", 'info');
        } catch (syncError) {
          console.warn('Sync failed before export, continuing with local data:', syncError);
          this.showToast("Sync failed, exporting local data...", 'warning');
        }
      }

      // Export bikes
      if (bikeCount > 0) {
        const bikes = [];
        for (const idStr of this.selectedBikes) {
          const bike = await this.db.bikes.get(Number(idStr));
          if (bike && !bike._deleted) {
            const { _id, image, ...rest } = bike; // Exclude image from export
            bikes.push(rest);
          }
        }
        if (bikes.length > 0) {
          const csv = this.jsonToCsv(bikes, true);
          const filename = `selected-bikes-${new Date().toISOString().split('T')[0]}.csv`;
          this.downloadFile(csv, filename, 'text/csv;charset=utf-8;');
        }
      }

      // Export expenses
      if (expenseCount > 0) {
        const expenses = [];
        for (const idStr of this.selectedExpenses) {
          const expense = await this.db.expenses.get(Number(idStr));
          if (expense) {
            const { _id, image, ...rest } = expense; // Exclude image from export
            expenses.push(rest);
          }
        }
        if (expenses.length > 0) {
          const csv = this.expensesToCsv(expenses);
          const filename = `selected-expenses-${new Date().toISOString().split('T')[0]}.csv`;
          this.downloadFile(csv, filename, 'text/csv;charset=utf-8;');
        }
      }

      let successMessage = '';
      if (bikeCount > 0 && expenseCount > 0) {
        successMessage = `Exported ${bikeCount} bikes and ${expenseCount} expenses successfully`;
      } else if (bikeCount > 0) {
        successMessage = `Exported ${bikeCount} bikes successfully`;
      } else {
        successMessage = `Exported ${expenseCount} expenses successfully`;
      }
      this.showToast(successMessage, 'success');
    } catch (error) {
      console.error('Bulk export failed:', error);
      this.showToast(`Failed to export: ${error.message}`, 'error');
    }
  }
  
  expensesToCsv(expenses) {
    const headers = ['date', 'category', 'amount', 'description'];
    const headerRow = headers.map(h => `"${h}"`).join(',');
    
    const rows = expenses.map(expense => 
      headers.map(header => {
        const value = expense[header] === undefined || expense[header] === null ? '' : expense[header];
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    );
    
    return [headerRow, ...rows].join('\r\n');
  }

  // --- 7. FORM & MODAL UI ---
  
  async openFormModal(mode = 'buy', bike = null) {
    await this.loadCustomers(); // Load customers before opening modal
    const title = document.getElementById('form-title');
    const deleteBtn = document.getElementById('delete-bike-btn');
    const saveBtn = document.getElementById('save-form-btn');
    const saveBtnText = document.getElementById('save-form-btn-text');
    const form = document.getElementById('bike-form');
    const buySection = document.getElementById('form-section-buy');
    const sellSection = document.getElementById('form-section-sell');

    form.reset();
    
    // Reset image preview
    const imagePreview = document.getElementById('form-image-preview');
    const imagePreviewImg = document.getElementById('form-image-preview-img');
    if (imagePreview) imagePreview.style.display = 'none';
    if (imagePreviewImg) imagePreviewImg.src = '';

    if (mode === 'buy') {
      title.textContent = "Buy New Bike";
      deleteBtn.classList.add('hidden');
      saveBtn.classList.remove('hidden');
      saveBtnText.textContent = "Save Purchase";
      buySection.classList.remove('readonly-section');
      sellSection.classList.add('hidden');
      document.getElementById('form-datePurchase').value = new Date().toISOString().split('T')[0];
      document.getElementById('form-bike-id').value = '';
    } else if (mode === 'sell' && bike) {
      title.textContent = "Sell Bike";
      deleteBtn.classList.remove('hidden');
      saveBtn.classList.remove('hidden');
      saveBtnText.textContent = "Save Sale";
      
      buySection.classList.add('readonly-section');
      sellSection.classList.remove('hidden');
      sellSection.classList.remove('readonly-section');
      
      this.fillForm(bike);
      document.getElementById('form-dateSelling').value = new Date().toISOString().split('T')[0];
    } else if (mode === 'view' && bike) {
      title.textContent = bike.dateSelling ? "View Bike Details" : "Edit Bike";
      deleteBtn.classList.remove('hidden');
      saveBtn.classList.remove('hidden');
      saveBtnText.textContent = bike.dateSelling ? "Edit Details" : "Update Bike";
      
      buySection.classList.remove('readonly-section');
      sellSection.classList.remove('hidden');
      if (!bike.dateSelling) {
        sellSection.classList.remove('readonly-section');
      } else {
        sellSection.classList.add('readonly-section');
      }
      
      this.fillForm(bike);
    }

    this.dom.formModal.classList.add('active');
    setTimeout(() => document.getElementById('form-no').focus(), 100);
  }
  
  handleEditExpense(id) {
    const expenseId = Number(id);
    this.db.expenses.get(expenseId).then(expense => {
      if (expense) {
        this.openExpenseModal(expense);
      }
    }).catch(err => {
      console.error('Error loading expense:', err);
      this.showToast('Failed to load expense', 'error');
    });
  }
  
  openExpenseModal(expense = null) {
    const modal = document.getElementById('expense-modal');
    const form = document.getElementById('expense-form');
    form.reset();
    
    // Reset image preview
    const imagePreview = document.getElementById('expense-image-preview');
    const imagePreviewImg = document.getElementById('expense-image-preview-img');
    if (imagePreview) imagePreview.style.display = 'none';
    if (imagePreviewImg) imagePreviewImg.src = '';
    
    if (expense) {
      document.getElementById('expense-id').value = expense._id;
      document.getElementById('expense-date').value = expense.date || '';
      document.getElementById('expense-category').value = expense.category || '';
      document.getElementById('expense-amount').value = expense.amount || '';
      document.getElementById('expense-description').value = expense.description || '';
      document.getElementById('expense-title').textContent = 'Edit Expense';
      
      // Show existing image if present
      if (expense.image && imagePreview && imagePreviewImg) {
        imagePreviewImg.src = expense.image;
        imagePreview.style.display = 'block';
      }
    } else {
      document.getElementById('expense-id').value = '';
      document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
      document.getElementById('expense-title').textContent = 'Add Expense';
    }
    
    modal.classList.add('active');
  }
  
  closeExpenseModal() {
    document.getElementById('expense-modal').classList.remove('active');
  }
  
  openCustomerModal(customer = null) {
    const modal = document.getElementById('customer-modal');
    const form = document.getElementById('customer-form');
    form.reset();
    
    if (customer) {
      document.getElementById('customer-id').value = customer._id;
      document.getElementById('customer-name').value = customer.name || '';
      document.getElementById('customer-phone').value = customer.phone || '';
      document.getElementById('customer-email').value = customer.email || '';
      document.getElementById('customer-address').value = customer.address || '';
      document.getElementById('customer-title').textContent = 'Edit Customer';
    } else {
      document.getElementById('customer-id').value = '';
      document.getElementById('customer-title').textContent = 'Add Customer';
    }
    
    modal.classList.add('active');
  }
  
  closeCustomerModal() {
    document.getElementById('customer-modal').classList.remove('active');
  }
  
  // Inbuilt Camera Capture
  async openCameraModal() {
    const modal = document.getElementById('camera-modal');
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const errorDiv = document.getElementById('camera-error');
    const capturedPreview = document.getElementById('camera-captured-preview');
    
    if (!modal || !video || !canvas) return;
    
    // Clear previous captures
    capturedPreview.innerHTML = '';
    errorDiv.style.display = 'none';
    modal.classList.add('active');
    
    let stream = null;
    let facingMode = 'environment'; // Start with back camera
    
    const stopCamera = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
      }
      if (video.srcObject) {
        video.srcObject = null;
      }
    };
    
    const startCamera = async (facing = 'environment') => {
      try {
        stopCamera();
        const constraints = {
          video: {
            facingMode: facing,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        video.style.display = 'block';
        errorDiv.style.display = 'none';
      } catch (err) {
        console.error('Camera error:', err);
        errorDiv.style.display = 'block';
        video.style.display = 'none';
      }
    };
    
    // Start camera
    await startCamera(facingMode);
    
    // Switch camera button
    const switchBtn = document.getElementById('switch-camera-btn');
    if (switchBtn) {
      switchBtn.onclick = () => {
        facingMode = facingMode === 'environment' ? 'user' : 'environment';
        startCamera(facingMode);
      };
    }
    
    // Capture photo button
    const captureBtn = document.getElementById('capture-photo-btn');
    if (captureBtn) {
      captureBtn.onclick = () => {
        const existingImages = document.getElementById('form-images-preview').querySelectorAll('img');
        if (existingImages.length >= 3) {
          this.showToast('Maximum 3 images allowed', 'warning');
          return;
        }
        
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame to canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        // Add to preview using global function
        if (window.addImageToPreview) {
          window.addImageToPreview(dataUrl);
        }
        
        // Show in camera modal preview
        const previewImg = document.createElement('img');
        previewImg.src = dataUrl;
        previewImg.style.width = '80px';
        previewImg.style.height = '80px';
        previewImg.style.objectFit = 'cover';
        previewImg.style.borderRadius = '8px';
        previewImg.style.border = '2px solid white';
        capturedPreview.appendChild(previewImg);
        
        // Check if we've reached max images
        if (existingImages.length + 1 >= 3) {
          this.showToast('Maximum 3 images captured. Close camera to continue.', 'info');
        }
      };
    }
    
    // Cancel button
    const cancelBtn = document.getElementById('camera-cancel-btn');
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        stopCamera();
        modal.classList.remove('active');
      };
    }
    
    // Close button
    const closeBtn = document.getElementById('close-camera-modal');
    if (closeBtn) {
      closeBtn.onclick = () => {
        stopCamera();
        modal.classList.remove('active');
      };
    }
    
    // Error close button
    const errorCloseBtn = document.getElementById('camera-error-close');
    if (errorCloseBtn) {
      errorCloseBtn.onclick = () => {
        stopCamera();
        modal.classList.remove('active');
      };
    }
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        stopCamera();
        modal.classList.remove('active');
      }
    });
  }
  
  switchTab(tabName) {
    const tabBikesEl = document.getElementById('tab-bikes');
    const tabExpensesEl = document.getElementById('tab-expenses');
    const tabContentBikesEl = document.getElementById('tab-content-bikes');
    const tabContentExpensesEl = document.getElementById('tab-content-expenses');
    
    if (tabName === 'bikes') {
      if (tabBikesEl) tabBikesEl.classList.add('active');
      if (tabExpensesEl) tabExpensesEl.classList.remove('active');
      if (tabContentBikesEl) {
        tabContentBikesEl.classList.add('active');
        tabContentBikesEl.style.display = 'block';
      }
      if (tabContentExpensesEl) {
        tabContentExpensesEl.classList.remove('active');
        tabContentExpensesEl.style.display = 'none';
      }
    } else if (tabName === 'expenses') {
      if (tabBikesEl) tabBikesEl.classList.remove('active');
      if (tabExpensesEl) tabExpensesEl.classList.add('active');
      if (tabContentBikesEl) {
        tabContentBikesEl.classList.remove('active');
        tabContentBikesEl.style.display = 'none';
      }
      if (tabContentExpensesEl) {
        tabContentExpensesEl.classList.add('active');
        tabContentExpensesEl.style.display = 'block';
      }
      // Render expenses when switching to expenses tab
      this.renderExpenses();
    }
  }
  
  fillForm(bike) {
    document.getElementById('form-bike-id').value = bike._id;
    document.getElementById('form-no').value = bike.no;
    document.getElementById('form-owner').value = bike.owner || '';
    document.getElementById('form-model').value = bike.model || '';
    document.getElementById('form-datePurchase').value = bike.datePurchase || '';
    document.getElementById('form-purchasePrice').value = bike.purchasePrice || '';
    document.getElementById('form-repairCost').value = bike.repairCost || '';
    document.getElementById('form-dateSelling').value = bike.dateSelling || '';
    document.getElementById('form-sellingPrice').value = bike.sellingPrice || '';
    document.getElementById('form-serviceDueDate').value = bike.serviceDueDate || '';
    
    // Handle customer selection
    const ownerSelect = document.getElementById('form-owner-select');
    const ownerIdInput = document.getElementById('form-owner-id');
    if (ownerSelect && bike.ownerId) {
      ownerSelect.value = bike.ownerId;
      if (ownerIdInput) ownerIdInput.value = bike.ownerId;
    }
    
    // Handle supplier selection
    const supplierSelect = document.getElementById('form-supplier');
    if (supplierSelect && bike.supplierId) {
      supplierSelect.value = bike.supplierId;
    }
    
    // Handle multiple images preview
    const imagesPreview = document.getElementById('form-images-preview');
    if (imagesPreview) {
      imagesPreview.innerHTML = '';
      const images = bike.images || (bike.image ? [bike.image] : []);
      images.forEach((imgSrc, index) => {
        if (imgSrc) {
          const imgContainer = document.createElement('div');
          imgContainer.style.position = 'relative';
          imgContainer.innerHTML = `
            <img src="${imgSrc}" alt="Image ${index + 1}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-color); cursor: pointer;" />
            <button type="button" class="btn-icon btn-ghost" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.7); color: white;" data-image-index="${index}" aria-label="Remove image">
              <svg width="16" height="16"><use href="#icon-close"></use></svg>
            </button>
          `;
          imagesPreview.appendChild(imgContainer);
        }
      });
    }
    
    this.calculateFormProfit();
  }
  
  closeFormModal() {
this.dom.formModal.classList.remove('active');
document.getElementById('form-section-buy').classList.remove('readonly-section');
document.getElementById('form-section-sell').classList.remove('readonly-section');
  }
  
  closeBulkSellModal() {
this.dom.bulkSellModal.classList.remove('active');
  }
  
  calculateFormProfit() {
const p = parseFloat(document.getElementById('form-purchasePrice').value) || 0;
const r = parseFloat(document.getElementById('form-repairCost').value) || 0;
const s = parseFloat(document.getElementById('form-sellingPrice').value) || 0;
const profit = s - (p + r);
document.getElementById('form-netProfit').value = profit.toFixed(2);
  }
  
  // --- 8. SETTINGS HANDLERS ---
  
  handleSaveSyncSettings() {
this.settings.repoOwner = document.getElementById('setting-repo-owner').value.trim();
this.settings.repoName = document.getElementById('setting-repo-name').value.trim();
this.settings.repoBranch = document.getElementById('setting-repo-branch').value.trim() || 'main';
this.settings.repoPath = document.getElementById('setting-repo-path').value.trim() || 'data';
const newPat = document.getElementById('setting-github-pat').value.trim();

if (newPat && newPat !== this.settings.githubPat) {
  this.settings.githubPat = newPat;
  sessionStorage.setItem(PAT_KEY, newPat);
  
  // Trigger browser password save
  const patForm = document.getElementById('pat-save-form');
  const patInput = document.getElementById('pat-save-input');
  if (patForm && patInput) {
patInput.value = newPat;
patForm.submit();
  }
}

this.settings.lastSyncSha = null; // Force re-check
this.saveSettings();

this.showToast("Sync settings saved for this session.", 'success');
  }
  
  async handleSaveDisplaySettings() {
this.settings.businessName = document.getElementById('setting-business-name').value.trim();
this.settings.currency = document.getElementById('setting-currency').value.trim();

const newCash = parseFloat(document.getElementById('setting-cash-in-hand').value);
const newCashVal = isNaN(newCash) ? 0 : newCash;

this.saveSettings(); // This calls applySettings() but cashInHand is not set yet
this.showToast("Display settings saved.", 'success');

// Now, check if cash in hand was actually changed and create a log entry
if (newCashVal !== this.settings.cashInHand) {
await this.updateCashInHand(
newCashVal, 
'set', 
'Manual balance set in settings',
null,
true // This will call saveSettings() again with the new cash value
);
this.showToast("Cash balance updated in log.", 'info');
} else {
// Need to save settings again even if cash didn't change
// because businessName and currency might have
this.settings.cashInHand = newCashVal; // ensure it's set
this.saveSettings();
}

await this.renderAll(); // Re-render stats with new currency/cash
  }
  
  async handleWipeData() {
if (confirm("WARNING: This will delete ALL local bike and cash log data. This action CANNOT be undone. Are you sure?")) {
  await this.db.bikes.clear();
  await this.db.cashLog.clear(); // Also wipe cash log
  this.undoStack = [];
  this.saveUndoStack();
  
  // Reset cash in hand in settings
  this.settings.cashInHand = 0;
  this.saveSettings();
  
  this.showToast("All local data has been wiped.", 'success');
  await this.renderAll();
}
  }
  
  // --- 9. IMPORT / EXPORT ---
  
  async exportData(format) {
    try {
      // Sync data from repository before exporting
      if (this.isOnline && this.settings.repoOwner && this.settings.repoName && this.settings.githubPat) {
        this.showToast("Syncing data from repository...", 'info');
        try {
          await this.triggerAutoSync(true); // Wait for sync to complete
          this.showToast("Sync complete. Generating export...", 'info');
        } catch (syncError) {
          console.warn('Sync failed before export, continuing with local data:', syncError);
          this.showToast("Sync failed, exporting local data...", 'warning');
        }
      } else {
        this.showToast("Generating export from local data...", 'info');
      }

      // Re-read bikes from DB after sync to ensure we have latest data
      const bikes = await this.db.bikes.filter(b => !b._deleted).toArray();
      if (!Array.isArray(bikes) || bikes.length === 0) {
        this.showToast("No data to export.", 'warning');
        return;
      }

      // Exclude internal _id and image data (images too large for export) and validate data
      const exportBikes = bikes
        .filter(b => b && typeof b === 'object')
        .map(b => {
          const { _id, image, ...rest } = b;
          return rest;
        });

      if (exportBikes.length === 0) {
        this.showToast("No valid data to export.", 'warning');
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `bike_inventory_${timestamp}`;

      if (format === 'json') {
        // This is no longer reachable from UI, but kept for robustness.
        this.downloadFile(JSON.stringify(exportBikes, null, 2), `${filename}.json`, 'application/json;charset=utf-8;');
        this.showToast("Exported as JSON", 'success');
      } else if (format === 'csv') {
        this.downloadFile(this.jsonToCsv(exportBikes, true), `${filename}.csv`, 'text/csv;charset=utf-8;');
        this.showToast("Exported as CSV", 'success');
      } else if (format === 'html') {
        try {
          const currency = this.settings.currency || '₹';
          
          const soldBikes = exportBikes.filter(b => b.dateSelling && b.dateSelling !== '');
          const unsoldBikes = exportBikes.filter(b => !b.dateSelling || b.dateSelling === '');
          
          // Calculate totals safely
          const totalProfit = soldBikes.reduce((sum, b) => sum + this.safeParseFloat(b.netProfit, 0), 0);
          const totalInvestment = exportBikes.reduce((sum, b) => 
            sum + this.safeParseFloat(b.purchasePrice, 0) + this.safeParseFloat(b.repairCost, 0), 0
          );
          const unsoldValue = unsoldBikes.reduce((sum, b) => 
            sum + this.safeParseFloat(b.purchasePrice, 0) + this.safeParseFloat(b.repairCost, 0), 0
          );

          const htmlContent = this.generateInventoryHtmlReport({
            exportBikes,
            soldBikes,
            unsoldBikes,
            totalProfit,
            totalInvestment,
            unsoldValue,
            currency,
            filename
          });

          this.downloadFile(htmlContent, `${filename}.html`, 'text/html;charset=utf-8;');
          this.showToast("Exported as HTML", 'success');
        } catch (htmlError) {
          console.error('HTML generation error:', htmlError);
          this.showToast(`HTML export failed: ${htmlError.message}`, 'error');
        }
      } else {
        this.showToast(`Unsupported export format: ${format}`, 'error');
      }
    } catch(e) {
      console.error('Export failed:', e);
      this.showToast(`Failed to export as ${format?.toUpperCase() || 'UNKNOWN'}: ${e.message}`, 'error');
    }
  }
  
  /**
   * NEW: Analytics Report Export
   */
  async exportAnalyticsReport(format) {
    try {
      // Sync data from repository before generating analytics report
      if (this.isOnline && this.settings.repoOwner && this.settings.repoName && this.settings.githubPat) {
        this.showToast("Syncing data from repository...", 'info');
        try {
          await this.triggerAutoSync(true); // Wait for sync to complete
          this.showToast("Sync complete. Generating report...", 'info');
        } catch (syncError) {
          console.warn('Sync failed before export, continuing with local data:', syncError);
          this.showToast("Sync failed, generating report from local data...", 'warning');
        }
      } else {
        this.showToast("Generating report from local data...", 'info');
      }

      if (format === 'csv') {
        // Export the cash log as CSV (will sync again, but that's okay for consistency)
        await this.exportCashLog();
        return;
      }

      if (format === 'html') {
        const currency = this.settings.currency || '₹';

        // Re-read all bikes from DB after sync to ensure we have latest data
        const allBikes = await this.db.bikes.filter(b => !b._deleted).toArray();
        if (!Array.isArray(allBikes)) {
          this.showToast('Failed to retrieve bike data', 'error');
          return;
        }

        const soldBikes = allBikes.filter(b => b && b.dateSelling && b.dateSelling !== '');
        const unsoldBikes = allBikes.filter(b => b && (!b.dateSelling || b.dateSelling === ''));

        // Calculate totals safely
        const totalProfit = soldBikes.reduce((sum, b) => sum + this.safeParseFloat(b.netProfit, 0), 0);
        const totalRevenue = soldBikes.reduce((sum, b) => sum + this.safeParseFloat(b.sellingPrice, 0), 0);
        const totalCost = allBikes.reduce((sum, b) => 
          sum + this.safeParseFloat(b.purchasePrice, 0) + this.safeParseFloat(b.repairCost, 0), 0
        );
        const unsoldValue = unsoldBikes.reduce((sum, b) => 
          sum + this.safeParseFloat(b.purchasePrice, 0) + this.safeParseFloat(b.repairCost, 0), 0
        );

        // Calculate monthly trends safely
        const monthlyData = {};
        soldBikes.forEach(bike => {
          if (!bike || typeof bike !== 'object') return;
          if (bike.dateSelling && typeof bike.dateSelling === 'string' && bike.dateSelling.length >= 7) {
            const month = bike.dateSelling.substring(0, 7); // YYYY-MM
            if (!monthlyData[month]) {
              monthlyData[month] = { revenue: 0, profit: 0, count: 0, cost: 0 };
            }
            monthlyData[month].revenue += this.safeParseFloat(bike.sellingPrice, 0);
            monthlyData[month].profit += this.safeParseFloat(bike.netProfit, 0);
            monthlyData[month].cost += this.safeParseFloat(bike.purchasePrice, 0) + this.safeParseFloat(bike.repairCost, 0);
            monthlyData[month].count++;
          }
        });

        // Calculate days to sell safely
        const daysToSell = soldBikes
          .map(b => {
            if (!b || typeof b !== 'object') return null;
            return this.safeDaysBetween(b.datePurchase, b.dateSelling);
          })
          .filter(d => d !== null && d >= 0);
        
        const avgDaysToSell = daysToSell.length > 0 
          ? Math.round(daysToSell.reduce((a, b) => a + b, 0) / daysToSell.length) 
          : 0;

        // Calculate ROI safely
        let totalROI = 0;
        let roiCount = 0;
        soldBikes.forEach(b => {
          if (!b || typeof b !== 'object') return;
          const purchasePrice = this.safeParseFloat(b.purchasePrice, 0);
          const repairCost = this.safeParseFloat(b.repairCost, 0);
          const cost = purchasePrice + repairCost;
          
          if (cost > 0) {
            const profit = this.safeParseFloat(b.netProfit, 0);
            totalROI += this.safeDivide(profit * 100, cost, 0);
            roiCount++;
          }
        });
        const avgROI = roiCount > 0 ? totalROI / roiCount : 0;

        // Profit margin safely
        const profitMargin = this.safeDivide(totalProfit * 100, totalRevenue, 0);

        // Calculate model performance stats safely
        const modelStats = {};
        soldBikes.forEach(b => {
          if (!b || typeof b !== 'object') return;
          const model = (b.model || '').trim();
          if (!model) return;
          
          if (!modelStats[model]) {
            modelStats[model] = {
              totalProfit: 0,
              count: 0,
              totalRevenue: 0,
              totalCost: 0
            };
          }
          
          const profit = this.safeParseFloat(b.netProfit, 0);
          const revenue = this.safeParseFloat(b.sellingPrice, 0);
          const purchasePrice = this.safeParseFloat(b.purchasePrice, 0);
          const repairCost = this.safeParseFloat(b.repairCost, 0);
          const cost = purchasePrice + repairCost;
          
          modelStats[model].totalProfit += profit;
          modelStats[model].totalRevenue += revenue;
          modelStats[model].totalCost += cost;
          modelStats[model].count++;
        });

        // Calculate average profit per model safely
        const modelAverages = Object.keys(modelStats)
          .map(model => ({
            model,
            avgProfit: this.safeDivide(modelStats[model].totalProfit, modelStats[model].count, 0),
            totalProfit: modelStats[model].totalProfit,
            count: modelStats[model].count
          }))
          .filter(m => m.count > 0);

        // Sort by average profit
        modelAverages.sort((a, b) => b.avgProfit - a.avgProfit);

        // Get cash log data for the report (after sync)
        const cashLogEntries = await this.getCashLog(1000);

        // Generate HTML report
        const htmlContent = await this.generateHtmlReport({
          allBikes,
          soldBikes,
          unsoldBikes,
          totalProfit,
          totalRevenue,
          totalCost,
          unsoldValue,
          monthlyData,
          avgDaysToSell,
          avgROI,
          profitMargin,
          currency,
          modelAverages,
          cashLogEntries
        });

        // Download as HTML file
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `Analytics_Report_${timestamp}`;
        this.downloadFile(htmlContent, `${filename}.html`, 'text/html;charset=utf-8;');
        this.showToast("HTML Report downloaded!", 'success');
      } else {
        this.showToast(`Unsupported format: ${format}`, 'error');
      }
    } catch(e) {
      console.error('Analytics Report failed:', e);
      this.showToast(`Failed to generate analytics report: ${e.message}`, 'error');
    }
  }
  
  async generateHtmlReport(data) {
const { allBikes = [], soldBikes = [], unsoldBikes = [], totalProfit = 0, totalRevenue = 0, totalCost = 0, unsoldValue = 0, monthlyData = {}, avgDaysToSell = 0, avgROI = 0, profitMargin = 0, currency = '₹', modelAverages = [], cashLogEntries = [] } = data;

// Generate insight text from actual data
let insightText = `You have ${unsoldBikes.length} bikes in stock (total investment: ${currency}${this.formatCurrency(unsoldValue)}).`;
if (soldBikes.length > 0) {
  const avgProfit = this.safeDivide(totalProfit, soldBikes.length, 0);
  insightText += ` Your average profit per bike is ${currency}${this.formatCurrency(avgProfit)}.`;
} else {
  insightText += ` No bikes sold yet.`;
}

// Calculate cash flow metrics from provided cash log entries
let totalIn = 0;
let totalOut = 0;
let largestIn = { amount: 0, reason: '-' };
let largestOut = { amount: 0, reason: '-' };
let netFlow30Day = 0;
let thisMonthFlow = 0;
let lastMonthFlow = 0;

const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const now = new Date();
const thisMonth = now.toISOString().substring(0, 7);
const lastMonthDate = new Date(now);
lastMonthDate.setMonth(now.getMonth() - 1);
const lastMonth = lastMonthDate.toISOString().substring(0, 7);

if (Array.isArray(cashLogEntries) && cashLogEntries.length > 0) {
  cashLogEntries.forEach(entry => {
    if (!entry || typeof entry !== 'object' || entry.type === 'set') return;
    
    const amount = this.safeParseFloat(entry.amount, 0);
    if (amount === 0) return;

    const entryDate = entry.timestamp ? this.safeParseDate(entry.timestamp) : null;
    const entryMonth = entry.timestamp && typeof entry.timestamp === 'string' ? entry.timestamp.substring(0, 7) : null;

    if (amount > 0) {
      totalIn += amount;
      if (amount > largestIn.amount) {
        largestIn = { amount, reason: entry.reason || entry.type || '-' };
      }
    } else {
      const absAmount = Math.abs(amount);
      totalOut += absAmount;
      if (absAmount > largestOut.amount) {
        largestOut = { amount: absAmount, reason: entry.reason || entry.type || '-' };
      }
    }
    
    if (entryDate && entryDate > thirtyDaysAgo) {
      netFlow30Day += amount;
    }
    
    if (entryMonth) {
      if (entryMonth === thisMonth) {
        thisMonthFlow += amount;
      } else if (entryMonth === lastMonth) {
        lastMonthFlow += amount;
      }
    }
  });
}

// Calculate monthly growth
let monthlyGrowthText = '0.0%';
if (lastMonthFlow > 0) {
  const growth = this.safeDivide((thisMonthFlow - lastMonthFlow) * 100, lastMonthFlow, 0);
  monthlyGrowthText = `${growth.toFixed(1)}% vs last month`;
} else if (thisMonthFlow > 0) {
  monthlyGrowthText = 'N/A (no flow last month)';
}

// Calculate best/worst performers
const sortedBikes = [...soldBikes]
  .filter(b => b && typeof b === 'object')
  .sort((a, b) => {
    const profitA = this.safeParseFloat(a.netProfit, 0);
    const profitB = this.safeParseFloat(b.netProfit, 0);
    return profitB - profitA;
  });

const bestBike = sortedBikes.length > 0 ? sortedBikes[0]?.no || '-' : '-';
const worstBike = sortedBikes.length > 0 ? sortedBikes[sortedBikes.length - 1]?.no || '-' : '-';

// Use provided cash log entries or get latest 50
const logEntries = Array.isArray(cashLogEntries) && cashLogEntries.length > 0 
  ? cashLogEntries.slice(0, 50).reverse() // Show latest 50, most recent first
  : await this.getCashLog(50);
  
const sortedMonths = Object.keys(monthlyData).sort();

const monthlyRows = sortedMonths
  .filter(month => monthlyData[month] && typeof monthlyData[month] === 'object')
  .map(month => {
    const monthData = monthlyData[month];
    const revenue = this.safeParseFloat(monthData.revenue, 0);
    const profit = this.safeParseFloat(monthData.profit, 0);
    const count = this.safeParseFloat(monthData.count, 0);
    const avgProfit = this.safeDivide(profit, count, 0);
    
    return `
      <tr>
        <td>${this.escapeHtml(month)}</td>
        <td style="text-align: right;">${count}</td>
        <td style="text-align: right;">${currency} ${this.formatCurrency(revenue)}</td>
        <td style="text-align: right;">${currency} ${this.formatCurrency(profit)}</td>
        <td style="text-align: right;">${currency} ${this.formatCurrency(avgProfit)}</td>
      </tr>
    `;
  }).join('');

const cashLogRows = Array.isArray(logEntries) && logEntries.length > 0
  ? logEntries
      .filter(entry => entry && typeof entry === 'object')
      .map(entry => {
        const timestamp = entry.timestamp ? this.safeParseDate(entry.timestamp) : null;
        const amount = this.safeParseFloat(entry.amount, 0);
        const balance = this.safeParseFloat(entry.balance, 0);
        
        let amountDisplay;
        if(entry.type === 'set') {
          amountDisplay = `= ${currency} ${this.formatCurrency(amount)}`;
        } else if (amount >= 0) {
          amountDisplay = `+${currency} ${this.formatCurrency(amount)}`;
        } else {
          amountDisplay = `-${currency} ${this.formatCurrency(Math.abs(amount))}`;
        }
        
        return `
          <tr>
            <td>${timestamp ? timestamp.toLocaleString() : '-'}</td>
            <td>${this.escapeHtml(entry.type || '-')}</td>
            <td style="text-align: right;">${amountDisplay}</td>
            <td>${this.escapeHtml(entry.reason || '-')}</td>
            <td style="text-align: right;">${currency} ${this.formatCurrency(balance)}</td>
          </tr>
        `;
      }).join('')
  : '<tr><td colspan="5" style="text-align: center; padding: 20px;">No cash transactions recorded</td></tr>';

return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Business Analytics Report - ${this.settings.businessName || 'Bike Manager'}</title>
  <style>
    .report-container {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #333;
      line-height: 1.6;
    }
    .report-header {
      background: linear-gradient(135deg, #0e7490 0%, #0891b2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .report-header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
      font-weight: 700;
    }
    .report-header .subtitle {
      font-size: 14px;
      opacity: 0.9;
    }
    .report-section {
      margin-bottom: 40px;
      background: white;
      padding: 25px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .report-section h2 {
      color: #0e7490;
      font-size: 20px;
      margin: 0 0 20px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #0e7490;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    .summary-item {
      padding: 15px;
      background: #f8fafc;
      border-radius: 6px;
      border-left: 4px solid #0e7490;
    }
    .summary-item strong {
      display: block;
      color: #64748b;
      font-size: 13px;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .summary-item .value {
      font-size: 24px;
      font-weight: 700;
      color: #0e7490;
    }
    .report-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    .report-table th {
      background: #0e7490;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
    }
    .report-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 14px;
    }
    .report-table tr:nth-child(even) {
      background: #f8fafc;
    }
    .report-table tr:hover {
      background: #f1f5f9;
    }
    .insights-box {
      background: #f0f9ff;
      border-left: 4px solid #0ea5e9;
      padding: 20px;
      border-radius: 6px;
      margin-top: 15px;
    }
    .insights-box p {
      margin: 0;
      color: #0c4a6e;
      line-height: 1.8;
    }
    @media print {
      .report-container {
        padding: 0;
      }
      .report-section {
        box-shadow: none;
        page-break-inside: avoid;
      }
      .modal-header, .modal-footer {
        display: none;
      }
    }
  </style>
  <div class="report-container">
    <div class="report-header">
      <h1>Business Analytics Report</h1>
      <div class="subtitle">
        <strong>${this.settings.businessName || 'Bike Manager'}</strong> | Generated: ${new Date().toLocaleString()}
      </div>
    </div>

    <div class="report-section">
      <h2>Executive Summary</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <strong>Total Inventory</strong>
          <div class="value">${allBikes.length} bikes</div>
        </div>
        <div class="summary-item">
          <strong>Sold</strong>
          <div class="value">${soldBikes.length} (${allBikes.length > 0 ? ((soldBikes.length / allBikes.length) * 100).toFixed(1) : 0}%)</div>
        </div>
        <div class="summary-item">
          <strong>Unsold</strong>
          <div class="value">${unsoldBikes.length} (${allBikes.length > 0 ? ((unsoldBikes.length / allBikes.length) * 100).toFixed(1) : 0}%)</div>
        </div>
        <div class="summary-item">
          <strong>Total Revenue</strong>
          <div class="value">${currency} ${this.formatCurrency(totalRevenue)}</div>
        </div>
        <div class="summary-item">
          <strong>Total Investment</strong>
          <div class="value">${currency} ${this.formatCurrency(totalCost)}</div>
        </div>
        <div class="summary-item">
          <strong>Total Profit</strong>
          <div class="value">${currency} ${this.formatCurrency(totalProfit)}</div>
        </div>
        <div class="summary-item">
          <strong>Profit Margin</strong>
          <div class="value">${profitMargin.toFixed(1)}%</div>
        </div>
        <div class="summary-item">
          <strong>Average ROI</strong>
          <div class="value">${avgROI.toFixed(1)}%</div>
        </div>
        <div class="summary-item">
          <strong>Avg Profit/Sale</strong>
          <div class="value">${soldBikes.length > 0 ? currency + ' ' + this.formatCurrency(this.safeDivide(totalProfit, soldBikes.length, 0)) : 'N/A'}</div>
        </div>
        <div class="summary-item">
          <strong>Avg Days to Sell</strong>
          <div class="value">${avgDaysToSell.toFixed(1)} days</div>
        </div>
        <div class="summary-item">
          <strong>Unsold Inventory Value</strong>
          <div class="value">${currency} ${this.formatCurrency(unsoldValue)}</div>
        </div>
      </div>
    </div>

    ${sortedMonths.length > 0 ? `
    <div class="report-section">
      <h2>Monthly Performance Trends</h2>
      <table class="report-table">
        <thead>
          <tr>
            <th>Month</th>
            <th style="text-align: right;">Sales</th>
            <th style="text-align: right;">Revenue</th>
            <th style="text-align: right;">Profit</th>
            <th style="text-align: right;">Avg Profit</th>
          </tr>
        </thead>
        <tbody>
          ${monthlyRows}
        </tbody>
      </table>
    </div>
    ` : ''}

    <div class="report-section">
      <h2>Business Insights</h2>
      <div class="insights-box">
        <p>${this.escapeHtml(insightText)}</p>
      </div>
    </div>

    <div class="report-section">
      <h2>Cash Flow Summary</h2>
      <table class="report-table">
        <tbody>
          <tr>
            <td><strong>Current Cash</strong></td>
            <td style="text-align: right;">${currency} ${this.formatCurrency(this.settings.cashInHand || 0)}</td>
          </tr>
          <tr>
            <td><strong>Total Inflow</strong></td>
            <td style="text-align: right;">${currency} ${this.formatCurrency(totalIn)}</td>
          </tr>
          <tr>
            <td><strong>Total Outflow</strong></td>
            <td style="text-align: right;">${currency} ${this.formatCurrency(totalOut)}</td>
          </tr>
          <tr>
            <td><strong>Net Cash Flow</strong></td>
            <td style="text-align: right;">${currency} ${this.formatCurrency(totalIn - totalOut)}</td>
          </tr>
          <tr>
            <td><strong>30-Day Summary</strong></td>
            <td style="text-align: right;">${netFlow30Day >= 0 ? '+' : ''}${currency} ${this.formatCurrency(netFlow30Day)}</td>
          </tr>
          <tr>
            <td><strong>Monthly Growth</strong></td>
            <td style="text-align: right;">${monthlyGrowthText}</td>
          </tr>
          <tr>
            <td><strong>Largest Inflow</strong></td>
            <td style="text-align: right;">${currency} ${this.formatCurrency(largestIn.amount)} (${this.escapeHtml(largestIn.reason)})</td>
          </tr>
          <tr>
            <td><strong>Largest Outflow</strong></td>
            <td style="text-align: right;">${currency} ${this.formatCurrency(largestOut.amount)} (${this.escapeHtml(largestOut.reason)})</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="report-section">
      <h2>Performance Metrics</h2>
      <table class="report-table">
        <tbody>
          <tr>
            <td><strong>Average ROI</strong></td>
            <td style="text-align: right;">${avgROI.toFixed(1)}%</td>
          </tr>
          <tr>
            <td><strong>Best Performer</strong></td>
            <td style="text-align: right;">${this.escapeHtml(bestBike)}</td>
          </tr>
          <tr>
            <td><strong>Worst Performer</strong></td>
            <td style="text-align: right;">${this.escapeHtml(worstBike)}</td>
          </tr>
          <tr>
            <td><strong>Avg. Days to Sell</strong></td>
            <td style="text-align: right;">${avgDaysToSell}</td>
          </tr>
          ${modelAverages.length > 0 ? `
          <tr>
            <td><strong>Top Model</strong></td>
            <td style="text-align: right;">${this.escapeHtml(modelAverages[0].model)} (${currency} ${this.formatCurrency(modelAverages[0].avgProfit)})</td>
          </tr>
          <tr>
            <td><strong>Worst Model</strong></td>
            <td style="text-align: right;">${this.escapeHtml(modelAverages[modelAverages.length - 1].model)} (${currency} ${this.formatCurrency(modelAverages[modelAverages.length - 1].avgProfit)})</td>
          </tr>
          ` : ''}
        </tbody>
      </table>
    </div>

    ${modelAverages.length > 0 ? `
    <div class="report-section">
      <h2>Model Performance</h2>
      <table class="report-table">
        <thead>
          <tr>
            <th>Model</th>
            <th style="text-align: right;">Sales</th>
            <th style="text-align: right;">Total Profit</th>
            <th style="text-align: right;">Avg Profit/Sale</th>
          </tr>
        </thead>
        <tbody>
          ${modelAverages.map(m => `
            <tr>
              <td>${this.escapeHtml(m.model)}</td>
              <td style="text-align: right;">${m.count}</td>
              <td style="text-align: right;">${currency} ${this.formatCurrency(m.totalProfit)}</td>
              <td style="text-align: right;">${currency} ${this.formatCurrency(m.avgProfit)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <div class="report-section">
      <h2>Cash Transaction Log (Latest 50)</h2>
      <table class="report-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th style="text-align: right;">Amount</th>
            <th>Reason</th>
            <th style="text-align: right;">New Balance</th>
          </tr>
        </thead>
        <tbody>
          ${cashLogRows || '<tr><td colspan="5" style="text-align: center; padding: 20px;">No transactions found</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
  }
  
  generateInventoryHtmlReport(data) {
const { exportBikes, soldBikes, unsoldBikes, totalProfit, totalInvestment, unsoldValue, currency, filename } = data;

const inventoryRows = exportBikes.map(b => {
  return `
    <tr>
      <td>${this.escapeHtml(b.no || '-')}</td>
      <td>${this.escapeHtml(b.owner || '-')}</td>
      <td>${b.datePurchase || '-'}</td>
      <td style="text-align: right;">${currency} ${this.formatCurrency(b.purchasePrice || 0)}</td>
      <td style="text-align: right;">${currency} ${this.formatCurrency(b.repairCost || 0)}</td>
      <td>${b.dateSelling || 'Unsold'}</td>
      <td style="text-align: right;">${b.dateSelling ? currency + ' ' + this.formatCurrency(b.sellingPrice || 0) : '-'}</td>
      <td style="text-align: right;">${b.dateSelling ? currency + ' ' + this.formatCurrency(b.netProfit || 0) : 'Unsold'}</td>
    </tr>
  `;
}).join('');

return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bike Inventory Report - ${this.settings.businessName || 'Bike Manager'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #333;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      background: #f4f5f7;
    }
    .report-container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .report-header {
      background: linear-gradient(135deg, #0e7490 0%, #0891b2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .report-header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
      font-weight: 700;
    }
    .report-header .subtitle {
      font-size: 14px;
      opacity: 0.9;
    }
    .report-section {
      margin-bottom: 40px;
    }
    .report-section h2 {
      color: #0e7490;
      font-size: 20px;
      margin: 0 0 20px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #0e7490;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    .summary-item {
      padding: 15px;
      background: #f8fafc;
      border-radius: 6px;
      border-left: 4px solid #0e7490;
    }
    .summary-item strong {
      display: block;
      color: #64748b;
      font-size: 13px;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .summary-item .value {
      font-size: 24px;
      font-weight: 700;
      color: #0e7490;
    }
    .report-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    .report-table th {
      background: #0e7490;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
    }
    .report-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 14px;
    }
    .report-table tr:nth-child(even) {
      background: #f8fafc;
    }
    .report-table tr:hover {
      background: #f1f5f9;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .report-container {
        box-shadow: none;
        padding: 0;
      }
      .report-section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <h1>Bike Inventory Report</h1>
      <div class="subtitle">
        <strong>${this.settings.businessName || 'Bike Manager'}</strong> | Generated: ${new Date().toLocaleString()}
      </div>
    </div>

    <div class="report-section">
      <h2>Summary</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <strong>Total Bikes</strong>
          <div class="value">${exportBikes.length}</div>
        </div>
        <div class="summary-item">
          <strong>Sold</strong>
          <div class="value">${soldBikes.length}</div>
        </div>
        <div class="summary-item">
          <strong>Unsold</strong>
          <div class="value">${unsoldBikes.length}</div>
        </div>
        <div class="summary-item">
          <strong>Total Profit (Sold)</strong>
          <div class="value">${currency} ${this.formatCurrency(totalProfit)}</div>
        </div>
        <div class="summary-item">
          <strong>Total Investment</strong>
          <div class="value">${currency} ${this.formatCurrency(totalInvestment)}</div>
        </div>
        <div class="summary-item">
          <strong>Unsold Investment</strong>
          <div class="value">${currency} ${this.formatCurrency(unsoldValue)}</div>
        </div>
        <div class="summary-item">
          <strong>Average Profit per Sale</strong>
          <div class="value">${soldBikes.length > 0 ? currency + ' ' + this.formatCurrency(this.safeDivide(totalProfit, soldBikes.length, 0)) : 'N/A'}</div>
        </div>
      </div>
    </div>

    <div class="report-section">
      <h2>Inventory Details</h2>
      <table class="report-table">
        <thead>
          <tr>
            <th>Plate</th>
            <th>Owner</th>
            <th>Buy Date</th>
            <th style="text-align: right;">Buy Price</th>
            <th style="text-align: right;">Repair</th>
            <th>Sell Date</th>
            <th style="text-align: right;">Sell Price</th>
            <th style="text-align: right;">Profit</th>
          </tr>
        </thead>
        <tbody>
          ${inventoryRows || '<tr><td colspan="8" style="text-align: center; padding: 20px;">No bikes found</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
  }
  
  downloadTemplate() {
const templateData = [{
  no: 'GJ05AB1234',
  owner: 'John Doe',
  model: 'Hero Splendor',
  purchasePrice: 25000,
  repairCost: 2000,
  sellingPrice: 30000,
  netProfit: 3000,
  datePurchase: '2024-01-15',
  dateSelling: '2024-02-20',
  _updatedAt: new Date().toISOString(),
  _deleted: false
}];
const csv = this.jsonToCsv(templateData, false);
this.downloadFile(csv, 'bike_template.csv', 'text/csv;charset=utf-8;');
this.showToast("Template downloaded", 'success');
  }
  
  handleImportFile(event) {
const file = event.target.files[0];
if (!file) return;

if (file.size > 5 * 1024 * 1024) {
  this.showToast('File is too large (max 5MB).', 'error');
  return;
}

const reader = new FileReader();
reader.onload = async (e) => {
  try {
const content = e.target.result;
let bikesToImport = [];

// UPDATED: Only allow CSV
if (file.name.endsWith('.csv')) {
  bikesToImport = this.csvToJson(content);
} else {
  this.showToast("Unsupported file type. Please use .csv", 'error');
  return;
}

if (!Array.isArray(bikesToImport)) throw new Error("Invalid file format.");

const now = new Date().toISOString();
const preparedBikes = bikesToImport.map(b => {
  const purchasePrice = parseFloat(b.purchasePrice) || 0;
  const repairCost = parseFloat(b.repairCost) || 0;
  const sellingPrice = parseFloat(b.sellingPrice) || 0;
  
  return {
no: (b.no || '').trim().toUpperCase(),
owner: b.owner || '',
purchasePrice: purchasePrice,
repairCost: repairCost,
sellingPrice: sellingPrice,
netProfit: sellingPrice - (purchasePrice + repairCost),
datePurchase: b.datePurchase || '',
dateSelling: b.dateSelling || '',
_updatedAt: b._updatedAt || now,
_deleted: b._deleted === 'true' || b._deleted === true || false,
  };
}).filter(b => b.no);

if (confirm(`Found ${preparedBikes.length} records. This will ADD new records and UPDATE existing records based on bike plate. This will NOT affect your "Cash in Hand". Continue?`)) {
  await this.db.bikes.bulkPut(preparedBikes);
  this.showToast(`Successfully imported/updated ${preparedBikes.length} records.`, 'success');
  await this.renderAll();
  this.triggerAutoSync(); // Auto-sync on import
}

  } catch (error) {
console.error("Import failed:", error);
this.showToast("Import failed. Check file format.", 'error');
  } finally {
event.target.value = '';
  }
};

reader.readAsText(file);
  }

  async handleShareData() {
if (!navigator.share) {
  this.showToast("Sharing not supported on this device", 'warning');
  return;
}

try {
  const bikes = await this.db.bikes.filter(b => !b._deleted).toArray();
  const csv = this.jsonToCsv(bikes.map(b => {
const { _id, ...rest } = b;
return rest;
  }), true);
  
  const file = new File([csv], `bikes_${new Date().toISOString().split('T')[0]}.csv`, {
type: 'text/csv;charset=utf-8;'
  });
  
  await navigator.share({
title: 'Bike Inventory',
text: `Bike inventory export (${bikes.length} bikes)`,
files: [file]
  });
  
} catch (error) {
  if (error.name !== 'AbortError') {
console.error("Share failed:", error);
this.showToast("Failed to share data", 'error');
  }
}
  }

  // --- 10. REPOSITORY SYNC (Now with auto-sync) ---
  
  /**
   * Triggers an automatic background sync.
   * @param {boolean} wait - If true, returns a promise that resolves when sync is complete.
   */
  async triggerAutoSync(wait = false) {
if (!this.isOnline || !this.settings.repoOwner || !this.settings.repoName || !this.settings.githubPat) {
  if (wait) {
this.showToast("Cannot sync: Offline or no credentials.", 'warning');
return; // Resolve immediately if sync can't run
  }
  return;
}

console.log(`Triggering auto-sync (wait: ${wait})`);

if (wait) {
  // If we need to wait, bypass debounce and run immediately.
  return this.syncNowInternal(false);
} else {
  // Otherwise, use the debouncer to batch quick changes.
  this.debouncedSyncNow();
}
  }
  
  /**
   * The core sync logic.
   * @param {boolean} isManual - True if triggered by user click, shows more toasts.
   */
  async syncNowInternal(isManual = false) {
if (this.isSyncing) {
if (isManual) this.showToast("Sync already in progress.", 'info');
return;
}

if (!this.isOnline) {
  if (isManual) this.showToast("Cannot sync. You are offline.", 'warning');
  return;
}

const { repoOwner, repoName, githubPat } = this.settings;
if (!repoOwner || !repoName || !githubPat) {
  if (isManual) {
this.showToast("Repository owner, name, and GitHub PAT must be set in Settings.", 'error');
this.navigateTo('view-settings');
  }
  return;
}

this.isSyncing = true;
this.setSyncStatus('syncing', 'Syncing...');
if (isManual) this.showToast("Starting sync...", 'info');

const cashFilename = 'cash_log.json';

try {
  this.setSyncStatus('syncing', 'Fetching remote...');
  
  // Get both bikes and cash data from Repository
  const repoData = await this.fetchFromRepository();
  let remoteBikes = [];
  let remoteCashLog = [];

  if (repoData.bikes && repoData.bikes.content) {
const remoteBikesRaw = this.csvToJson(repoData.bikes.content);

remoteBikes = remoteBikesRaw.map(b => {
  const purchasePrice = parseFloat(b.purchasePrice) || 0;
  const repairCost = parseFloat(b.repairCost) || 0;
  const sellingPrice = parseFloat(b.sellingPrice) || 0;
  
  return {
...b,
no: (b.no || '').trim().toUpperCase(),
owner: b.owner || '',
purchasePrice: purchasePrice,
repairCost: repairCost,
sellingPrice: sellingPrice,
netProfit: sellingPrice - (purchasePrice + repairCost),
_deleted: b._deleted === 'true' || b._deleted === true || false,
  };
});
// Store SHA for bikes file separately
if (!this.settings.lastSyncSha) this.settings.lastSyncSha = {};
this.settings.lastSyncSha.bikes = repoData.bikes.sha;
  }
  
  // Handle cash log sync
  if (repoData.cash && repoData.cash.content) {
try {
  remoteCashLog = JSON.parse(repoData.cash.content);
  if (!Array.isArray(remoteCashLog)) remoteCashLog = [];
} catch (e) {
  console.error('Failed to parse remote cash log:', e);
  remoteCashLog = [];
}
// Store SHA for cash file separately
if (!this.settings.lastSyncSha) this.settings.lastSyncSha = {};
this.settings.lastSyncSha.cash = repoData.cash.sha;
  }
  
  const localBikes = await this.db.bikes.toArray();
  
  this.setSyncStatus('syncing', 'Merging data...');
  const mergedBikesMap = new Map();
  
  // Local data wins by default
  for (const bike of localBikes) { 
mergedBikesMap.set(bike.no, bike); 
  }
  
  // Remote data wins if it's newer
  for (const remoteBike of remoteBikes) {
const localBike = mergedBikesMap.get(remoteBike.no);
if (!localBike || new Date(remoteBike._updatedAt) > new Date(localBike._updatedAt)) {
  mergedBikesMap.set(remoteBike.no, remoteBike);
}
  }
  
  const mergedBikes = Array.from(mergedBikesMap.values());
  
  // Merge images from remote if available (before saving bikes)
  if (repoData.images && repoData.images.content) {
    try {
      const remoteImages = JSON.parse(repoData.images.content);
      if (typeof remoteImages === 'object' && remoteImages !== null) {
        // Merge remote images with local bikes
        mergedBikes.forEach(bike => {
          if (remoteImages[bike.no]) {
            // Remote images exist for this bike - merge with local (local wins if newer)
            const localImages = bike.images || (bike.image ? [bike.image] : []);
            const remoteImagesArray = Array.isArray(remoteImages[bike.no]) ? remoteImages[bike.no] : [remoteImages[bike.no]];
            // Use remote images if local has none, or merge (local first, then remote)
            if (localImages.length === 0) {
              bike.images = remoteImagesArray.slice(0, 3);
            } else {
              // Merge: combine local and remote, remove duplicates, max 3
              const combined = [...localImages, ...remoteImagesArray];
              const unique = Array.from(new Set(combined));
              bike.images = unique.slice(0, 3);
            }
            // Remove old single image field if exists
            if (bike.image) delete bike.image;
          } else if (bike.image && !bike.images) {
            // Migrate single image to array
            bike.images = [bike.image];
            delete bike.image;
          } else if (!bike.images) {
            bike.images = [];
          }
        });
      }
    } catch (e) {
      console.warn('Failed to parse remote images:', e);
    }
  } else {
    // Ensure all bikes have images array format
    mergedBikes.forEach(bike => {
      if (bike.image && !bike.images) {
        bike.images = [bike.image];
        delete bike.image;
      } else if (!bike.images) {
        bike.images = [];
      }
    });
  }
  
  // Get local cash log
  const localCashLog = await this.db.cashLog.toArray();
  
  // Merge cash log entries - local wins on conflict
  const cashLogMap = new Map();
  remoteCashLog.forEach(entry => {
if(entry && entry.timestamp) cashLogMap.set(entry.timestamp, entry);
  });
  localCashLog.forEach(entry => {
if(entry && entry.timestamp) cashLogMap.set(entry.timestamp, entry);
  });
  const mergedCashLog = Array.from(cashLogMap.values())
.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); // Sort old to new
  
  this.setSyncStatus('syncing', 'Saving local...');
  await this.db.transaction('rw', this.db.bikes, this.db.cashLog, async () => {
await this.db.bikes.clear();
await this.db.bikes.bulkPut(mergedBikes);

await this.db.cashLog.clear();
await this.db.cashLog.bulkPut(mergedCashLog);
  });
  
  // Recalculate cash in hand from the merged log
  const lastLogEntry = mergedCashLog.length > 0 ? mergedCashLog[mergedCashLog.length - 1] : null;
  this.settings.cashInHand = lastLogEntry ? lastLogEntry.balance : 0;
  this.saveSettings(); // Save the new calculated cash
  
  this.setSyncStatus('syncing', 'Pushing changes...');
  // Don't export internal _id or image/images data to CSV/JSON (images synced separately)
  const csvContent = this.jsonToCsv(mergedBikes.map(b => {
const {_id, image, images, ...rest} = b; return rest;
  }), false);
  
  // Sync images separately as JSON files in images directory (vehicle number as reference, max 3 per bike)
  const imagesData = {};
  mergedBikes.forEach(bike => {
    if (bike.images && bike.images.length > 0) {
      // Store images array keyed by vehicle number (max 3 images)
      imagesData[bike.no] = bike.images.slice(0, 3);
    } else if (bike.image) {
      // Migrate single image to array format
      imagesData[bike.no] = [bike.image];
    }
  });
  const imagesContentJson = JSON.stringify(imagesData, null, 2);
  
  const cashContent = mergedCashLog.map(entry => {
const {_id, ...rest} = entry;
return rest;
  });
  
  // Get all edit logs (merge with remote if exists)
  let mergedEditLogs = [];
  const localEditLogs = await this.db.editLog.toArray();
  const localEditLogsClean = localEditLogs.map(entry => {
const {_id, ...rest} = entry;
return rest;
  });
  
  if (repoData.editLog && repoData.editLog.content) {
try {
  const remoteEditLogs = JSON.parse(repoData.editLog.content);
  if (Array.isArray(remoteEditLogs)) {
// Merge: combine local and remote, remove duplicates by timestamp+bikeId+action
const allLogs = [...localEditLogsClean, ...remoteEditLogs];
const seen = new Set();
mergedEditLogs = allLogs.filter(log => {
  const key = `${log.timestamp}_${log.bikeId}_${log.action}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  } else {
mergedEditLogs = localEditLogsClean;
  }
} catch (e) {
  console.warn('Failed to parse remote edit log:', e);
  mergedEditLogs = localEditLogsClean;
}
// Store SHA for edit log file separately
if (!this.settings.lastSyncSha) this.settings.lastSyncSha = {};
this.settings.lastSyncSha.editLog = repoData.editLog.sha;
  } else {
mergedEditLogs = localEditLogsClean;
  }
  
  // Save merged edit logs (map to array with indices for bulkPut)
  const editLogsWithIds = mergedEditLogs.map((log, idx) => ({ ...log, _id: idx + 1 }));
  await this.db.transaction('rw', this.db.editLog, async () => {
await this.db.editLog.clear();
await this.db.editLog.bulkPut(editLogsWithIds);
  });
  
  // Prepare edit logs for Repository (without _id)
  const editLogsForRepo = mergedEditLogs.map(log => {
const {_id, ...rest} = log;
return rest;
  });
  
  // Check if any files need to be updated
  // For CSV, compare strings directly
  const bikesChanged = !repoData.bikes || csvContent !== repoData.bikes.content;
  
  // For JSON, compare serialized versions (normalize whitespace)
  const cashContentJson = JSON.stringify(cashContent, null, 2);
  const cashChanged = !repoData.cash || cashContentJson !== repoData.cash.content;
  
  const editLogContentJson = JSON.stringify(editLogsForRepo, null, 2);
  const editLogChanged = !repoData.editLog || editLogContentJson !== repoData.editLog.content;
  
  // Prepare expenses and customers for comparison
  const localExpenses = await this.db.expenses.toArray();
  const localCustomers = await this.db.customers.toArray();
  
  // Merge expenses and customers with remote if they exist
  let mergedExpenses = localExpenses.map(e => {
    const {_id, image, ...rest} = e; // Exclude image from sync (too large)
    return rest;
  });
  let mergedCustomers = localCustomers.map(c => {
    const {_id, ...rest} = c;
    return rest;
  });
  
  if (repoData.expenses && repoData.expenses.content) {
    try {
      const remoteExpenses = JSON.parse(repoData.expenses.content);
      if (Array.isArray(remoteExpenses)) {
        const expenseMap = new Map();
        remoteExpenses.forEach(e => {
          const key = `${e.date}_${e.category}_${e.amount}`;
          expenseMap.set(key, e);
        });
        mergedExpenses.forEach(e => {
          const key = `${e.date}_${e.category}_${e.amount}`;
          expenseMap.set(key, e);
        });
        mergedExpenses = Array.from(expenseMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
      }
    } catch (e) {
      console.warn('Failed to parse remote expenses:', e);
    }
  }
  
  if (repoData.customers && repoData.customers.content) {
    try {
      const remoteCustomers = JSON.parse(repoData.customers.content);
      if (Array.isArray(remoteCustomers)) {
        const customerMap = new Map();
        remoteCustomers.forEach(c => {
          customerMap.set(c.name.toLowerCase(), c);
        });
        mergedCustomers.forEach(c => {
          customerMap.set(c.name.toLowerCase(), c);
        });
        mergedCustomers = Array.from(customerMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      }
    } catch (e) {
      console.warn('Failed to parse remote customers:', e);
    }
  }
  
  // Save merged expenses and customers
  await this.db.transaction('rw', this.db.expenses, this.db.customers, async () => {
    await this.db.expenses.clear();
    const expensesWithIds = mergedExpenses.map((e, idx) => ({ ...e, _id: idx + 1 }));
    await this.db.expenses.bulkPut(expensesWithIds);
    
    await this.db.customers.clear();
    const customersWithIds = mergedCustomers.map((c, idx) => ({ ...c, _id: idx + 1 }));
    await this.db.customers.bulkPut(customersWithIds);
  });
  
  // Handle parts, serviceLog, and suppliers
  const localParts = await this.db.parts.toArray();
  const localServiceLogs = await this.db.serviceLog.toArray();
  const localSuppliers = await this.db.suppliers.toArray();
  
  let mergedParts = localParts.map(p => {
    const {_id, ...rest} = p;
    return rest;
  });
  let mergedServiceLogs = localServiceLogs.map(sl => {
    const {_id, ...rest} = sl;
    return rest;
  });
  let mergedSuppliers = localSuppliers.map(s => {
    const {_id, ...rest} = s;
    return rest;
  });
  
  if (repoData.parts && repoData.parts.content) {
    try {
      const remoteParts = JSON.parse(repoData.parts.content);
      if (Array.isArray(remoteParts)) {
        const partsMap = new Map();
        remoteParts.forEach(p => {
          partsMap.set(p.name?.toLowerCase(), p);
        });
        mergedParts.forEach(p => {
          partsMap.set(p.name?.toLowerCase(), p);
        });
        mergedParts = Array.from(partsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      }
    } catch (e) {
      console.warn('Failed to parse remote parts:', e);
    }
  }
  
  if (repoData.serviceLog && repoData.serviceLog.content) {
    try {
      const remoteServiceLogs = JSON.parse(repoData.serviceLog.content);
      if (Array.isArray(remoteServiceLogs)) {
        const serviceLogMap = new Map();
        remoteServiceLogs.forEach(sl => {
          const key = `${sl.bikeId}_${sl.date}_${sl.description}`;
          serviceLogMap.set(key, sl);
        });
        mergedServiceLogs.forEach(sl => {
          const key = `${sl.bikeId}_${sl.date}_${sl.description}`;
          serviceLogMap.set(key, sl);
        });
        mergedServiceLogs = Array.from(serviceLogMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
      }
    } catch (e) {
      console.warn('Failed to parse remote service logs:', e);
    }
  }
  
  if (repoData.suppliers && repoData.suppliers.content) {
    try {
      const remoteSuppliers = JSON.parse(repoData.suppliers.content);
      if (Array.isArray(remoteSuppliers)) {
        const suppliersMap = new Map();
        remoteSuppliers.forEach(s => {
          suppliersMap.set(s.name?.toLowerCase(), s);
        });
        mergedSuppliers.forEach(s => {
          suppliersMap.set(s.name?.toLowerCase(), s);
        });
        mergedSuppliers = Array.from(suppliersMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      }
    } catch (e) {
      console.warn('Failed to parse remote suppliers:', e);
    }
  }
  
  // Save merged parts, serviceLogs, and suppliers
  await this.db.transaction('rw', this.db.parts, this.db.serviceLog, this.db.suppliers, async () => {
    await this.db.parts.clear();
    const partsWithIds = mergedParts.map((p, idx) => ({ ...p, _id: idx + 1 }));
    await this.db.parts.bulkPut(partsWithIds);
    
    await this.db.serviceLog.clear();
    const serviceLogsWithIds = mergedServiceLogs.map((sl, idx) => ({ ...sl, _id: idx + 1 }));
    await this.db.serviceLog.bulkPut(serviceLogsWithIds);
    
    await this.db.suppliers.clear();
    const suppliersWithIds = mergedSuppliers.map((s, idx) => ({ ...s, _id: idx + 1 }));
    await this.db.suppliers.bulkPut(suppliersWithIds);
  });
  
  const expensesContentJson = JSON.stringify(mergedExpenses, null, 2);
  const customersContentJson = JSON.stringify(mergedCustomers, null, 2);
  const partsContentJson = JSON.stringify(mergedParts, null, 2);
  const serviceLogContentJson = JSON.stringify(mergedServiceLogs, null, 2);
  const suppliersContentJson = JSON.stringify(mergedSuppliers, null, 2);
  
  const expensesChanged = !repoData.expenses || expensesContentJson !== repoData.expenses.content;
  const customersChanged = !repoData.customers || customersContentJson !== repoData.customers.content;
  const partsChanged = !repoData.parts || partsContentJson !== repoData.parts.content;
  const serviceLogChanged = !repoData.serviceLog || serviceLogContentJson !== repoData.serviceLog.content;
  const suppliersChanged = !repoData.suppliers || suppliersContentJson !== repoData.suppliers.content;
  const imagesChanged = !repoData.images || imagesContentJson !== repoData.images.content;
  
  if (bikesChanged || cashChanged || editLogChanged || expensesChanged || customersChanged || partsChanged || serviceLogChanged || suppliersChanged || imagesChanged) {
    // Use the SHAs we just fetched (from repoData) for the push, not stale ones from settings
    // This ensures we're always using the latest SHAs
    const currentShasForPush = {
      bikes: repoData.bikes ? repoData.bikes.sha : null,
      cash: repoData.cash ? repoData.cash.sha : null,
      editLog: repoData.editLog ? repoData.editLog.sha : null,
      expenses: repoData.expenses ? repoData.expenses.sha : null,
      customers: repoData.customers ? repoData.customers.sha : null,
      parts: repoData.parts ? repoData.parts.sha : null,
      serviceLog: repoData.serviceLog ? repoData.serviceLog.sha : null,
      suppliers: repoData.suppliers ? repoData.suppliers.sha : null,
      images: repoData.images ? repoData.images.sha : null
    };
    
    const newShas = await this.pushToRepository(csvContent, cashContentJson, editLogContentJson, expensesContentJson, customersContentJson, partsContentJson, serviceLogContentJson, suppliersContentJson, imagesContentJson, currentShasForPush);
    
    // Update status immediately after successful push
    this.setSyncStatus('syncing', 'Finalizing...');
    
    if (!this.settings.lastSyncSha) this.settings.lastSyncSha = {};
    // Only update SHA if we got a real SHA (not the marker)
    if (bikesChanged && newShas.bikes && newShas.bikes !== 'PUSH_SUCCESS_NO_SHA') {
      this.settings.lastSyncSha.bikes = newShas.bikes;
    }
    if (cashChanged && newShas.cash && newShas.cash !== 'PUSH_SUCCESS_NO_SHA') {
      this.settings.lastSyncSha.cash = newShas.cash;
    }
    if (editLogChanged && newShas.editLog && newShas.editLog !== 'PUSH_SUCCESS_NO_SHA') {
      this.settings.lastSyncSha.editLog = newShas.editLog;
    }
    if (newShas.expenses && newShas.expenses !== 'PUSH_SUCCESS_NO_SHA') {
      this.settings.lastSyncSha.expenses = newShas.expenses;
    }
    if (newShas.customers && newShas.customers !== 'PUSH_SUCCESS_NO_SHA') {
      this.settings.lastSyncSha.customers = newShas.customers;
    }
    if (newShas.parts && newShas.parts !== 'PUSH_SUCCESS_NO_SHA') {
      this.settings.lastSyncSha.parts = newShas.parts;
    }
    if (newShas.serviceLog && newShas.serviceLog !== 'PUSH_SUCCESS_NO_SHA') {
      this.settings.lastSyncSha.serviceLog = newShas.serviceLog;
    }
    if (newShas.suppliers && newShas.suppliers !== 'PUSH_SUCCESS_NO_SHA') {
      this.settings.lastSyncSha.suppliers = newShas.suppliers;
    }
    if (newShas.images && newShas.images !== 'PUSH_SUCCESS_NO_SHA') {
      this.settings.lastSyncSha.images = newShas.images;
    }
  } else {
    console.log("No changes to push.");
    // Update SHAs even if content didn't change (in case files exist but we didn't have their SHAs)
    if (!this.settings.lastSyncSha) this.settings.lastSyncSha = {};
    if (repoData.bikes && repoData.bikes.sha) this.settings.lastSyncSha.bikes = repoData.bikes.sha;
    if (repoData.cash && repoData.cash.sha) this.settings.lastSyncSha.cash = repoData.cash.sha;
    if (repoData.editLog && repoData.editLog.sha) this.settings.lastSyncSha.editLog = repoData.editLog.sha;
    if (repoData.expenses && repoData.expenses.sha) this.settings.lastSyncSha.expenses = repoData.expenses.sha;
    if (repoData.customers && repoData.customers.sha) this.settings.lastSyncSha.customers = repoData.customers.sha;
    if (repoData.parts && repoData.parts.sha) this.settings.lastSyncSha.parts = repoData.parts.sha;
    if (repoData.serviceLog && repoData.serviceLog.sha) this.settings.lastSyncSha.serviceLog = repoData.serviceLog.sha;
    if (repoData.suppliers && repoData.suppliers.sha) this.settings.lastSyncSha.suppliers = repoData.suppliers.sha;
    if (repoData.images && repoData.images.sha) this.settings.lastSyncSha.images = repoData.images.sha;
  }
  
  this.settings.lastSync = new Date().toISOString();
  this.saveSettings();
  this.setSyncStatus('success', 'Sync Done');
  if (isManual) this.showToast("Sync complete.", 'success');
  
  // Clear any retry timers since sync succeeded
  this.clearSyncRetry();
  
  await this.renderAll();
  
} catch (error) {
  console.error("Sync failed:", error);
  this.setSyncStatus('pending', 'Sync Pending');
  if (isManual) this.showToast(error.message || "Sync failed", 'error');
  
  // Schedule automatic retry after 10 seconds
  this.scheduleSyncRetry();
} finally {
this.isSyncing = false;
}
  }
  
  async fetchFromRepository() {
const { repoOwner, repoName, repoBranch, repoPath, githubPat } = this.settings;
const baseUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents`;
const bikesFilename = 'bikes_inventory.csv';
const cashFilename = 'cash_log.json';
const editLogFilename = 'edit_log.json';

const expensesFilename = 'expenses.json';
const customersFilename = 'customers.json';
const partsFilename = 'parts.json';
const serviceLogFilename = 'service_log.json';
const suppliersFilename = 'suppliers.json';

const result = {
  bikes: null,
  cash: null,
  editLog: null,
  expenses: null,
  customers: null,
  parts: null,
  serviceLog: null,
  suppliers: null
};

// Helper function to fetch a file from repository
const fetchFile = async (filename) => {
  // Build file path - handle nested paths properly
  let filePath = filename;
  if (repoPath) {
    // Remove leading/trailing slashes and join
    const cleanPath = repoPath.replace(/^\/+|\/+$/g, '');
    filePath = cleanPath ? `${cleanPath}/${filename}` : filename;
  }
  
  // Encode path segments properly - GitHub API expects path segments to be URL encoded
  const encodedPath = filePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
  const url = `${baseUrl}/${encodedPath}?ref=${encodeURIComponent(repoBranch)}`;
  
  const response = await fetch(url, {
    headers: { 
      'Authorization': `Bearer ${githubPat}`, 
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    cache: 'no-store'
  });

  if (response.status === 404) {
    // File doesn't exist yet, that's okay
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `GitHub API error: ${response.statusText}`;
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.message) errorMessage = errorJson.message;
    } catch (e) {
      // Use default error message
    }
    
    if (response.status === 401) throw new Error("Invalid GitHub PAT. Check settings.");
    if (response.status === 403) throw new Error("Permission denied. Check PAT has 'repo' scope and repository access.");
    if (response.status === 404) return null; // File doesn't exist
    throw new Error(errorMessage);
  }

  const fileData = await response.json();
  
  // Decode base64 content
  let content;
  if (fileData.encoding === 'base64') {
    try {
      content = atob(fileData.content.replace(/\s/g, ''));
    } catch (e) {
      throw new Error(`Failed to decode file ${filename}: ${e.message}`);
    }
  } else {
    content = fileData.content;
  }
  
  return { content, sha: fileData.sha };
};

// Fetch all files in parallel
// Note: images.json is in images/ subdirectory
try {
  const [bikesData, cashData, editLogData, expensesData, customersData, partsData, serviceLogData, suppliersData, imagesData] = await Promise.all([
    fetchFile(bikesFilename),
    fetchFile(cashFilename),
    fetchFile(editLogFilename),
    fetchFile(expensesFilename),
    fetchFile(customersFilename),
    fetchFile(partsFilename),
    fetchFile(serviceLogFilename),
    fetchFile(suppliersFilename),
    fetchFile(`images/${imagesFilename}`).catch(() => null) // Images in subdirectory, may not exist
  ]);

  if (bikesData) result.bikes = bikesData;
  if (cashData) result.cash = cashData;
  if (editLogData) result.editLog = editLogData;
  if (expensesData) result.expenses = expensesData;
  if (customersData) result.customers = customersData;
  if (partsData) result.parts = partsData;
  if (serviceLogData) result.serviceLog = serviceLogData;
  if (suppliersData) result.suppliers = suppliersData;
  if (imagesData) result.images = imagesData;
} catch (error) {
  // Provide better error messages
  if (error.message.includes('Not Found') || error.message.includes('404')) {
    throw new Error(`Repository not found: ${repoOwner}/${repoName}. Check repository owner and name.`);
  }
  if (error.message.includes('Invalid GitHub PAT')) {
    throw error; // Already has good message
  }
  // Re-throw with context
  throw new Error(`Failed to fetch from repository: ${error.message}`);
}

return result;
  }
  
  async pushToRepository(bikesContent, cashContentJson, editLogContentJson, expensesContentJson, customersContentJson, partsContentJson = null, serviceLogContentJson = null, suppliersContentJson = null, imagesContentJson = null, currentShas = null) {
const { repoOwner, repoName, repoBranch, repoPath, githubPat } = this.settings;
const baseUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents`;
const bikesFilename = 'bikes_inventory.csv';
const cashFilename = 'cash_log.json';
const editLogFilename = 'edit_log.json';
const expensesFilename = 'expenses.json';
const customersFilename = 'customers.json';
const partsFilename = 'parts.json';
const serviceLogFilename = 'service_log.json';
const suppliersFilename = 'suppliers.json';

const result = {
  bikes: null,
  cash: null,
  editLog: null,
  expenses: null,
  customers: null,
  parts: null,
  serviceLog: null,
  suppliers: null
};

// Use provided SHAs or fall back to settings
if (!currentShas) {
  currentShas = this.settings.lastSyncSha || {};
}

// Helper function to fetch current file SHA from repository
const fetchFileSha = async (filePath) => {
  const encodedPath = filePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
  const fetchUrl = `${baseUrl}/${encodedPath}?ref=${encodeURIComponent(repoBranch)}`;
  const fetchResponse = await fetch(fetchUrl, {
    headers: {
      'Authorization': `Bearer ${githubPat}`,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  
  if (fetchResponse.ok) {
    const fetchedData = await fetchResponse.json();
    return fetchedData.sha;
  }
  return null;
};

// Helper function to push a file to repository (with automatic SHA conflict retry)
const pushFile = async (filename, content, currentSha, retryCount = 0) => {
  // Build file path - handle nested paths properly
  let filePath = filename;
  if (repoPath) {
    // Remove leading/trailing slashes and join
    const cleanPath = repoPath.replace(/^\/+|\/+$/g, '');
    filePath = cleanPath ? `${cleanPath}/${filename}` : filename;
  }
  
  // Encode path segments properly
  const encodedPath = filePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
  const url = `${baseUrl}/${encodedPath}`;
  
  // Encode content as base64 - GitHub requires base64 without line breaks
  // Use modern TextEncoder for reliable UTF-8 encoding (replaces deprecated btoa(unescape(...)))
  let encodedContent;
  try {
    // Modern approach: Use TextEncoder for reliable UTF-8 to base64 conversion
    if (typeof TextEncoder !== 'undefined') {
      const utf8Bytes = new TextEncoder().encode(content);
      // Convert Uint8Array to binary string for btoa
      let binaryString = '';
      // Process in chunks to avoid stack overflow for very large content
      const chunkSize = 8192;
      for (let i = 0; i < utf8Bytes.length; i += chunkSize) {
        const chunk = utf8Bytes.slice(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, chunk);
      }
      encodedContent = btoa(binaryString);
    } else {
      // Fallback for very old browsers (should not be needed in modern browsers)
      encodedContent = btoa(unescape(encodeURIComponent(content)));
    }
  } catch (e) {
    throw new Error(`Failed to encode content for ${filename}: ${e.message}`);
  }
  
  // Use the provided SHA, or fetch it if not provided
  let shaToUse = currentSha;
  if (!shaToUse) {
    shaToUse = await fetchFileSha(filePath);
  }
  
  const body = {
    message: `Bike Manager: Update ${filename} - ${new Date().toISOString()}`,
    content: encodedContent,
    branch: repoBranch
  };
  
  // Include sha if file exists (for update)
  if (shaToUse) {
    body.sha = shaToUse;
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${githubPat}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Repository push error for ${filename}:`, errorText);
    
    // Handle 409 Conflict (SHA mismatch) - automatically retry with fresh SHA
    if (response.status === 409) {
      if (retryCount < 1) {
        // Fetch the current SHA and retry once
        console.log(`SHA mismatch for ${filename}, fetching current SHA and retrying...`);
        const freshSha = await fetchFileSha(filePath);
        if (freshSha && freshSha !== shaToUse) {
          return pushFile(filename, content, freshSha, retryCount + 1);
        }
      }
      throw new Error(`${filename}: File was modified on GitHub. Please sync again to merge changes.`);
    }
    
    let errorMessage = `Failed to push ${filename}: ${response.statusText}`;
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.message) {
        errorMessage = `${filename}: ${errorJson.message}`;
      }
    } catch (e) {
      // Use default error message
    }
    
    if (response.status === 401) {
      throw new Error("Invalid GitHub PAT. Check settings.");
    }
    if (response.status === 403) {
      throw new Error("Permission denied. Check PAT has 'repo' scope.");
    }
    
    throw new Error(errorMessage);
  }

  const fileData = await response.json();
  
  // GitHub API response structure varies. Check multiple possible locations for SHA:
  // 1. content.sha (most common for file updates - available immediately)
  // 2. Direct sha property (less common)
  // 3. commit.sha (fallback - may need to fetch file SHA)
  
  let sha = null;
  
  // Most common case: SHA is immediately available in content.sha
  if (fileData.content && fileData.content.sha) {
    sha = fileData.content.sha;
  } else if (fileData.sha) {
    sha = fileData.sha;
  } else if (fileData.commit && fileData.commit.sha) {
    // If we only have commit SHA, try fetching file SHA immediately
    // GitHub usually has it ready right away
    sha = await fetchFileSha(filePath);
    
    // If still not available, wait a very short time and retry once
    if (!sha) {
      await new Promise(resolve => setTimeout(resolve, 200));
      sha = await fetchFileSha(filePath);
    }
  }
  
  // If we still don't have a SHA, that's okay - the push succeeded
  // The SHA will be fetched on the next sync
  if (!sha) {
    console.warn(`Could not determine SHA for ${filename} after successful push. Will fetch on next sync.`);
    // Return a special marker so we know the push succeeded
    return 'PUSH_SUCCESS_NO_SHA';
  }
  
  return sha;
};

// Push all files - catch errors individually to provide better feedback
// Images file goes in images/ subdirectory
try {
  const pushResults = await Promise.allSettled([
    pushFile(bikesFilename, bikesContent, currentShas.bikes),
    pushFile(cashFilename, cashContentJson, currentShas.cash),
    pushFile(editLogFilename, editLogContentJson, currentShas.editLog),
    pushFile(expensesFilename, expensesContentJson || '[]', currentShas.expenses),
    pushFile(customersFilename, customersContentJson || '[]', currentShas.customers),
    pushFile(partsFilename, partsContentJson || '[]', currentShas.parts),
    pushFile(serviceLogFilename, serviceLogContentJson || '[]', currentShas.serviceLog),
    pushFile(suppliersFilename, suppliersContentJson || '[]', currentShas.suppliers),
    pushFile(`images/${imagesFilename}`, imagesContentJson || '{}', currentShas.images)
  ]);

  // Handle results - collect all errors first
  const errors = [];
  
  // A push is successful if it doesn't throw an error, even if SHA extraction fails
  // The push succeeded if status is 'fulfilled' (regardless of return value)
  if (pushResults[0].status === 'fulfilled') {
    // Only store SHA if we got a real SHA (not the marker)
    if (pushResults[0].value && pushResults[0].value !== 'PUSH_SUCCESS_NO_SHA') {
      result.bikes = pushResults[0].value;
    }
    // If it's the marker, push succeeded but we'll fetch SHA on next sync
  } else if (pushResults[0].status === 'rejected') {
    errors.push(`bikes file: ${pushResults[0].reason.message || pushResults[0].reason}`);
  }

  if (pushResults[1].status === 'fulfilled') {
    if (pushResults[1].value && pushResults[1].value !== 'PUSH_SUCCESS_NO_SHA') {
      result.cash = pushResults[1].value;
    }
  } else if (pushResults[1].status === 'rejected') {
    errors.push(`cash file: ${pushResults[1].reason.message || pushResults[1].reason}`);
  }

  if (pushResults[2].status === 'fulfilled') {
    if (pushResults[2].value && pushResults[2].value !== 'PUSH_SUCCESS_NO_SHA') {
      result.editLog = pushResults[2].value;
    }
  } else if (pushResults[2].status === 'rejected') {
    errors.push(`edit log file: ${pushResults[2].reason.message || pushResults[2].reason}`);
  }

  if (pushResults[3].status === 'fulfilled') {
    if (pushResults[3].value && pushResults[3].value !== 'PUSH_SUCCESS_NO_SHA') {
      result.expenses = pushResults[3].value;
    }
  } else if (pushResults[3].status === 'rejected') {
    errors.push(`expenses file: ${pushResults[3].reason.message || pushResults[3].reason}`);
  }

  if (pushResults[4].status === 'fulfilled') {
    if (pushResults[4].value && pushResults[4].value !== 'PUSH_SUCCESS_NO_SHA') {
      result.customers = pushResults[4].value;
    }
  } else if (pushResults[4].status === 'rejected') {
    errors.push(`customers file: ${pushResults[4].reason.message || pushResults[4].reason}`);
  }

  if (pushResults[5] && pushResults[5].status === 'fulfilled') {
    if (pushResults[5].value && pushResults[5].value !== 'PUSH_SUCCESS_NO_SHA') {
      result.parts = pushResults[5].value;
    }
  } else if (pushResults[5] && pushResults[5].status === 'rejected') {
    errors.push(`parts file: ${pushResults[5].reason.message || pushResults[5].reason}`);
  }

  if (pushResults[6] && pushResults[6].status === 'fulfilled') {
    if (pushResults[6].value && pushResults[6].value !== 'PUSH_SUCCESS_NO_SHA') {
      result.serviceLog = pushResults[6].value;
    }
  } else if (pushResults[6] && pushResults[6].status === 'rejected') {
    errors.push(`service log file: ${pushResults[6].reason.message || pushResults[6].reason}`);
  }

  if (pushResults[7] && pushResults[7].status === 'fulfilled') {
    if (pushResults[7].value && pushResults[7].value !== 'PUSH_SUCCESS_NO_SHA') {
      result.suppliers = pushResults[7].value;
    }
  } else if (pushResults[7] && pushResults[7].status === 'rejected') {
    errors.push(`suppliers file: ${pushResults[7].reason.message || pushResults[7].reason}`);
  }

  if (pushResults[8] && pushResults[8].status === 'fulfilled') {
    if (pushResults[8].value && pushResults[8].value !== 'PUSH_SUCCESS_NO_SHA') {
      result.images = pushResults[8].value;
    }
  } else if (pushResults[8] && pushResults[8].status === 'rejected') {
    errors.push(`images file: ${pushResults[8].reason.message || pushResults[8].reason}`);
  }

  // If any files failed, throw an error with all failures
  if (errors.length > 0) {
    throw new Error(`Failed to push ${errors.join('; ')}`);
  }
  
  // If all pushes succeeded (even without SHAs), that's fine
} catch (error) {
  // Re-throw with more context
  console.error('Error pushing files to repository:', error);
  throw error;
}

return result;
  }
  
  // --- 11. UNDO FUNCTIONALITY ---
  
  addToUndoStack(action, data) {
// Add current cash state for undo
this.undoStack.push({ action, data, timestamp: Date.now(), cashInHand: this.settings.cashInHand });
if (this.undoStack.length > 10) {
  this.undoStack.shift();
}
this.saveUndoStack();
  }
  
  saveUndoStack() {
try {
  localStorage.setItem(UNDO_KEY, JSON.stringify(this.undoStack));
} catch (e) {
  console.error("Failed to save undo stack:", e);
}
  }
  
  loadUndoStack() {
try {
  const saved = localStorage.getItem(UNDO_KEY);
  if (saved) {
this.undoStack = JSON.parse(saved);
const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
this.undoStack = this.undoStack.filter(a => a.timestamp > oneDayAgo);
  }
} catch (e) {
  console.error("Failed to load undo stack:", e);
  this.undoStack = [];
}
  }
  
  async performUndo() {
if (this.undoStack.length === 0) {
  this.showToast("Nothing to undo", 'info');
  return;
}

const lastAction = this.undoStack.pop();
this.saveUndoStack();

// Restore cash in hand to state *before* the action
const cashBeforeAction = lastAction.cashInHand;

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
  } else if (lastAction.action === 'bulk-delete') {
await this.db.bikes.bulkPut(lastAction.data);
this.showToast(`Restored ${lastAction.data.length} bikes`, 'success');
  } else if (lastAction.action === 'bulk-update') {
await this.db.bikes.bulkPut(lastAction.data);
this.showToast(`Reverted ${lastAction.data.length} bikes`, 'success');
  }
  
  // Don't calculate, just restore
  // This will create a new log entry correcting the balance
  await this.updateCashInHand(
  cashBeforeAction, 
  'set', 
  `Undo: ${lastAction.action}`,
  `undo_${Date.now()}`
  ); 

  await this.renderAll();
  this.triggerAutoSync(); // Sync after undo
} catch (error) {
  console.error("Undo failed:", error);
  this.showToast("Failed to perform undo", 'error');
  this.undoStack.push(lastAction); // Put it back
  this.saveUndoStack();
}
  }
  
  showToastWithUndo(message, undoCallback) {
const container = document.getElementById('toast-container');
const toast = document.createElement('div');
toast.className = 'toast undo';

toast.innerHTML = `
  <span class="toast-message">${message}</span>
  <button class="toast-action">Undo</button>
  <span class="toast-close" role="button" aria-label="Close">X</span>
`;

container.appendChild(toast);

const timer = setTimeout(() => {
  if(toast.parentElement) toast.remove();
}, 8000);

toast.querySelector('.toast-action').addEventListener('click', async () => {
  clearTimeout(timer);
  if(toast.parentElement) toast.remove();
  await undoCallback();
});

toast.querySelector('.toast-close').addEventListener('click', () => {
  clearTimeout(timer);
  if(toast.parentElement) toast.remove();
});
  }
  
  // --- 12. UI HELPERS ---
  
  navigateTo(viewId) {
this.currentView = viewId;
this.dom.views.forEach(v => v.classList.remove('active'));
const targetView = document.getElementById(viewId);
if (targetView) targetView.classList.add('active');

this.dom.navButtons.forEach(btn => {
  btn.classList.toggle('active', btn.dataset.view === viewId);
});

if (viewId === 'view-list') {
  // Switch to bikes tab when navigating to list view
  this.switchTab('bikes');
} else if (viewId === 'view-stats') {
  this.renderStatsDashboard();
}
  }
  
  setFilterStatus(status) {
this.currentFilters.status = status;
document.querySelectorAll('.filter-chips .chip').forEach(c => {
  const isActive = c.dataset.filter === status;
  c.classList.toggle('active', isActive);
  c.setAttribute('aria-checked', isActive);
});
this.currentPage = 1;
this.renderBikeList();
  }
  
  setSyncStatus(status, text) {
    if (this.dom.syncStatus && this.dom.syncStatusText) {
      this.dom.syncStatus.className = `sync-status ${status}`;
      this.dom.syncStatusText.textContent = text;
    }
  }
  
  /**
   * Schedule automatic retry of sync after failure
   */
  scheduleSyncRetry() {
    // Clear any existing retry timer
    this.clearSyncRetry();
    
    // Only retry if online and credentials are configured
    if (!this.isOnline || !this.settings.repoOwner || !this.settings.repoName || !this.settings.githubPat) {
      return;
    }
    
    // Retry after 10 seconds
    this.syncRetryTimer = setTimeout(() => {
      if (!this.isSyncing) {
        console.log('Auto-retrying sync after failure...');
        this.syncNowInternal(false).catch(err => {
          console.error('Auto-retry failed:', err);
          // Schedule another retry
          this.scheduleSyncRetry();
        });
      }
    }, 10000);
  }
  
  /**
   * Clear sync retry timer
   */
  clearSyncRetry() {
    if (this.syncRetryTimer) {
      clearTimeout(this.syncRetryTimer);
      this.syncRetryTimer = null;
    }
  }
  
  /**
   * Start periodic status checking
   */
  startSyncStatusCheck() {
    // Clear any existing interval
    this.stopSyncStatusCheck();
    
    // Check sync status every 5 seconds
    this.syncStatusCheckInterval = setInterval(() => {
      this.updateSyncStatusDisplay();
    }, 5000);
  }
  
  /**
   * Stop periodic status checking
   */
  stopSyncStatusCheck() {
    if (this.syncStatusCheckInterval) {
      clearInterval(this.syncStatusCheckInterval);
      this.syncStatusCheckInterval = null;
    }
  }
  
  /**
   * Update sync status display based on current state
   */
  async updateSyncStatusDisplay() {
    // Don't update if we're currently syncing
    if (this.isSyncing) {
      return;
    }
    
    // If status is pending, try to verify if sync is actually needed
    const currentStatus = this.dom.syncStatus?.className;
    if (currentStatus && currentStatus.includes('pending')) {
      // Check if we can sync now
      if (this.isOnline && this.settings.repoOwner && this.settings.repoName && this.settings.githubPat) {
        // Status is already pending, retry will happen automatically
        // Just ensure the display is correct
        if (!this.syncRetryTimer) {
          this.scheduleSyncRetry();
        }
      } else {
        // Offline or no credentials, update status accordingly
        if (!this.isOnline) {
          this.setSyncStatus('offline', 'Offline');
        } else {
          this.setSyncStatus('pending', 'Sync Pending');
        }
      }
    }
  }
  
  updateOnlineStatus() {
    this.isOnline = navigator.onLine;
    if (this.isOnline) {
      this.setSyncStatus('success', 'Online');
      this.triggerAutoSync(); // Auto-sync on coming online
      // Start periodic status checking when online
      this.startSyncStatusCheck();
    } else {
      this.setSyncStatus('offline', 'Offline');
      this.stopSyncStatusCheck(); // Stop checking when offline
      this.clearSyncRetry(); // Clear retry timer
    }
  }
  
  vibrate(duration) {
if ('vibrate' in navigator) {
  navigator.vibrate(duration);
}
  }
  
  showToast(message, type = 'info') {
const container = document.getElementById('toast-container');
const toast = document.createElement('div');
toast.className = `toast ${type}`;

toast.innerHTML = `<span class="toast-message">${this.escapeHtml(message)}</span><span class="toast-close" role="button" aria-label="Close">X</span>`;

container.appendChild(toast);

const timer = setTimeout(() => {
  if(toast.parentElement) toast.remove();
}, 5000);

toast.querySelector('.toast-close').addEventListener('click', () => {
  clearTimeout(timer);
  if(toast.parentElement) toast.remove();
});
  }

  // --- 13. UTILITY FUNCTIONS ---

  // --- UTILITY FUNCTIONS (Safe Data Operations) ---
  
  /**
   * Safely parse a numeric value, handling null, undefined, NaN, and invalid strings
   */
  safeParseFloat(value, defaultValue = 0) {
    if (value === null || value === undefined || value === '') return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  
  /**
   * Safely calculate a value, returning 0 if invalid
   */
  safeCalculate(value) {
    return this.safeParseFloat(value, 0);
  }
  
  /**
   * Safely parse a date string, returning null if invalid
   */
  safeParseDate(dateString) {
    if (!dateString || typeof dateString !== 'string') return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }
  
  /**
   * Calculate days between two dates safely
   */
  safeDaysBetween(date1, date2) {
    const d1 = typeof date1 === 'string' ? this.safeParseDate(date1) : date1;
    const d2 = typeof date2 === 'string' ? this.safeParseDate(date2) : date2;
    if (!d1 || !d2) return null;
    const diff = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 ? Math.floor(diff) : null;
  }
  
  /**
   * Safe division with zero check
   */
  safeDivide(numerator, denominator, defaultValue = 0) {
    const num = this.safeParseFloat(numerator, 0);
    const den = this.safeParseFloat(denominator, 0);
    return den === 0 ? defaultValue : num / den;
  }
  
  formatCurrency(value) {
    const num = this.safeParseFloat(value, 0);
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  
  debounce(func, delay, immediate = false) {
let timeout;
return function executedFunction(...args) {
  const context = this;
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
  
  downloadFile(content, fileName, contentType) {
const a = document.createElement('a');
const file = new Blob([content], { type: contentType });
a.href = URL.createObjectURL(file);
a.download = fileName;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(a.href);
  }
  
  parseCsvLine(line) {
const values = [];
let inQuotes = false;
let currentField = '';

for (let i = 0; i < line.length; i++) {
  const char = line[i];
  
  if (char === '"') {
if (inQuotes && line[i + 1] === '"') {
  currentField += '"';
  i++;
} else {
  inQuotes = !inQuotes;
}
  } else if (char === ',' && !inQuotes) {
values.push(currentField);
currentField = '';
  } else {
currentField += char;
  }
}
values.push(currentField);
return values.map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
  }
  
  csvToJson(text) {
if (!text || typeof text !== 'string') {
  return [];
}
const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
if (lines.length < 2) return [];

const headers = this.parseCsvLine(lines[0]);

return lines.slice(1).map(line => {
  if (line.trim() === '') return null;
  const values = this.parseCsvLine(line);
  const obj = {};
  headers.forEach((header, index) => {
obj[header] = values[index] || '';
  });
  return obj;
}).filter(Boolean);
  }
  
  jsonToCsv(items, skipDeleted = false) {
// We don't export _id
const headers = ['no', 'owner', 'purchasePrice', 'repairCost', 'sellingPrice', 'netProfit', 'datePurchase', 'dateSelling', '_updatedAt', '_deleted'];
const headerRow = headers.map(h => `"${h}"`).join(',');

let itemsToExport = items;
if (skipDeleted) {
  itemsToExport = items.filter(item => !item._deleted);
}

const rows = itemsToExport.map(row => 
  headers.map(header => {
const value = row[header] === undefined || row[header] === null ? '' : row[header];
return `"${String(value).replace(/"/g, '""')}"`;
  }).join(',')
);

return [headerRow, ...rows].join('\r\n');
  }
  
  escapeHtml(text) {
if (text === null || text === undefined) return '';
return String(text)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');
  }
  
}

// --- Initialize the application ---
window.app = new BikeManagerApp();