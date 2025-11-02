/**
 * Bike Manager v7.0 - Main Application
 * Modular, offline-first PWA for bike inventory management
 */

import { bikeDB, SETTINGS_KEY, PAT_KEY, THEME_KEY, UNDO_KEY } from './db.js';
import { toastManager, modalManager, SearchSuggestions, escapeHtml, formatCurrency, debounce, vibrate, downloadFile } from './ui.js';
import { chartManager } from './charts.js';
import { initGistSync, gistSync } from './sync.js';

const ITEMS_PER_PAGE = 50;
const OLD_STORAGE_KEY = 'bikes_db_v2';

class BikeManagerApp {
  constructor() {
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
    
    this.currentFilters = {
      search: '',
      status: 'all',
      sort: 'latest',
      owner: '',
      profitMin: null,
      profitMax: null,
      dateFrom: null,
      dateTo: null,
    };
    
    this.currentView = 'view-list';
    this.isMobile = window.innerWidth < 768;
    this.isOnline = navigator.onLine;
    this.selectedBikes = new Set();
    this.undoStack = [];
    this.currentPage = 1;
    this.totalPages = 1;
    this.statsDateFilter = { from: null, to: null };
    this.allBikes = [];
    
    // DOM element cache
    this.dom = {};
    this.initDOMCache();
    
    // Debounced functions
    this.debouncedRenderList = debounce(() => this.renderBikeList(), 250);
    this.debouncedSync = debounce(() => this.syncNowInternal(), 5000, true);
    
    // Search suggestions
    this.searchSuggestions = null;
  }

  initDOMCache() {
    this.dom.loader = document.getElementById('app-loader');
    this.dom.loaderStatus = document.getElementById('app-loader-status');
    this.dom.headerTitle = document.getElementById('header-title');
    this.dom.views = document.querySelectorAll('.view');
    this.dom.navButtons = document.querySelectorAll('.nav-btn');
    this.dom.syncStatus = document.getElementById('sync-status');
    this.dom.syncStatusText = document.getElementById('sync-status-text');
    this.dom.syncNowBtn = document.getElementById('sync-now-btn');
    this.dom.searchInput = document.getElementById('search-input');
    this.dom.searchClear = document.getElementById('search-clear');
    this.dom.formModal = document.getElementById('form-modal');
    this.dom.bikeList = document.getElementById('bike-list');
    
    // Ensure DOM elements exist before proceeding
    if (!this.dom.bikeList) {
      console.warn('bike-list element not found');
    }
    if (!this.dom.loader) {
      console.warn('app-loader element not found');
    }
  }

  /**
   * Primary initialization
   */
  async init() {
    try {
      console.log('Starting initialization...');
      this.updateLoaderStatus('Initializing database...');
      await bikeDB.init();
      
      this.updateLoaderStatus('Loading settings...');
      await this.loadSettings();
      
      const corruptedCount = await bikeDB.cleanCorruptedData();
      if (corruptedCount > 0 && toastManager) {
        toastManager.show(`Fixed ${corruptedCount} corrupted data entries`, 'info');
      }
      
      this.updateLoaderStatus('Loading bikes...');
      await this.loadAllBikes();
      
      this.updateLoaderStatus('Preparing UI...');
      this.initUI();
      this.initEventListeners();
      
      this.updateLoaderStatus('Rendering data...');
      await this.renderAll();
      
      this.checkPATStatus();
      
      console.log('Initialization complete!');
      this.dom.loader.classList.add('hidden');
      
    } catch (error) {
      console.error("Critical initialization failed:", error);
      this.dom.loaderStatus.textContent = "Error loading app: " + error.message;
      this.dom.loaderStatus.classList.add('text-error');
      toastManager.show("Failed to initialize app: " + error.message, 'error');
    }
  }

  updateLoaderStatus(text) {
    console.log('Status:', text);
    if (this.dom.loaderStatus) {
      this.dom.loaderStatus.textContent = text;
    }
  }

  // --- SETTINGS & DATA LOADING ---

  async loadSettings() {
    const saved = bikeDB.loadSettings();
    if (saved) {
      this.settings = { ...this.settings, ...saved };
    }
    
    const savedPat = bikeDB.loadPAT();
    if (savedPat) {
      this.settings.githubPat = savedPat;
    }
    
    const savedTheme = bikeDB.loadTheme();
    this.applyTheme(savedTheme);
    
    this.undoStack = bikeDB.loadUndoStack();
    
    // Initialize Gist sync
    if (this.settings.gistId && this.settings.githubPat) {
      initGistSync(this.settings);
    }
    
    this.applySettings();
  }

  async saveSettings() {
    const { githubPat, ...settingsToSave } = this.settings;
    bikeDB.saveSettings(settingsToSave);
    if (githubPat) {
      bikeDB.savePAT(githubPat);
    }
    this.applySettings();
    vibrate(10);
  }

  applySettings() {
    if (this.dom.headerTitle) {
      this.dom.headerTitle.textContent = this.settings.businessName || 'Bike Manager';
    }
    document.title = this.settings.businessName || 'Bike Manager';
    document.querySelectorAll('.currency').forEach(el => {
      el.textContent = this.settings.currency || '₹';
    });
    
    const elements = {
      'setting-gist-id': this.settings.gistId || '',
      'setting-gist-filename': this.settings.gistFilename || 'bikes_inventory.csv',
      'setting-github-pat': this.settings.githubPat || '',
      'setting-business-name': this.settings.businessName || '',
      'setting-currency': this.settings.currency || '₹',
      'list-density': this.settings.listDensity || 'comfortable',
    };
    
    Object.entries(elements).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.value = value;
    });
    
    if (this.dom.bikeList) {
      this.dom.bikeList.classList.toggle('compact', this.settings.listDensity === 'compact');
    }
  }

  applyTheme(theme) {
    if (theme === 'light') {
      document.body.classList.add('theme-light');
      document.body.classList.remove('theme-dark');
    } else if (theme === 'dark') {
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
    } else {
      // Auto theme based on system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.body.classList.add('theme-dark');
        document.body.classList.remove('theme-light');
      } else {
        document.body.classList.add('theme-light');
        document.body.classList.remove('theme-dark');
      }
    }
    
    const themeSwitch = document.getElementById('theme-switch');
    if (themeSwitch) {
      const isDark = !document.body.classList.contains('theme-light');
      themeSwitch.classList.toggle('active', isDark);
    }
  }

  // --- UI INITIALIZATION ---

  initUI() {
    if (!this.isMobile) {
      const desktopBtn = document.getElementById('buy-bike-desktop');
      if (desktopBtn) desktopBtn.style.display = 'inline-flex';
    }
    
    if (navigator.share) {
      const shareBtn = document.getElementById('share-data');
      if (shareBtn) shareBtn.classList.remove('hidden');
    }
    
    document.getElementById('filter-all')?.classList.add('active');
    this.updateOnlineStatus();
    
    // Initialize search suggestions
    const suggestionsEl = document.getElementById('search-suggestions');
    if (this.dom.searchInput && suggestionsEl) {
      this.searchSuggestions = new SearchSuggestions(
        this.dom.searchInput,
        suggestionsEl,
        (id) => this.handleEditBike(id)
      );
    }
  }

  initEventListeners() {
    // Navigation
    this.dom.navButtons.forEach(btn => {
      btn.addEventListener('click', () => this.navigateTo(btn.dataset.view));
    });
    
    this.dom.syncNowBtn?.addEventListener('click', () => this.syncNow());
    
    // Search
    this.dom.searchInput?.addEventListener('input', (e) => {
      const value = e.target.value;
      if (this.dom.searchClear) {
        this.dom.searchClear.style.display = value ? 'block' : 'none';
      }
      this.currentFilters.search = value.toLowerCase();
      this.currentPage = 1;
      this.debouncedRenderList();
    });
    
    this.dom.searchClear?.addEventListener('click', () => {
      if (this.dom.searchInput) this.dom.searchInput.value = '';
      if (this.dom.searchClear) this.dom.searchClear.style.display = 'none';
      this.currentFilters.search = '';
      this.currentPage = 1;
      this.debouncedRenderList();
    });
    
    // Sort dropdown
    const sortBtn = document.getElementById('sort-btn');
    if (sortBtn) {
      sortBtn.addEventListener('click', () => {
        const menu = document.getElementById('sort-menu');
        if (menu) menu.classList.toggle('active');
      });
    }
    
    document.querySelectorAll('.sort-option').forEach(opt => {
      opt.addEventListener('click', () => {
        this.currentFilters.sort = opt.dataset.sort;
        document.querySelectorAll('.sort-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        const label = document.getElementById('sort-label');
        if (label) label.textContent = opt.textContent.replace('✓', '').trim();
        document.getElementById('sort-menu')?.classList.remove('active');
        this.currentPage = 1;
        this.renderBikeList();
      });
    });
    
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.sort-dropdown')) {
        document.getElementById('sort-menu')?.classList.remove('active');
      }
    });
    
    // Advanced filters
    document.getElementById('toggle-advanced-filters')?.addEventListener('click', () => {
      const filters = document.getElementById('advanced-filters');
      if (filters) filters.classList.toggle('hidden');
    });
    
    document.getElementById('apply-filters')?.addEventListener('click', () => {
      this.currentFilters.owner = document.getElementById('filter-owner')?.value || '';
      this.currentFilters.profitMin = parseFloat(document.getElementById('filter-profit-min')?.value) || null;
      this.currentFilters.profitMax = parseFloat(document.getElementById('filter-profit-max')?.value) || null;
      this.currentFilters.dateFrom = document.getElementById('filter-date-from')?.value || null;
      this.currentFilters.dateTo = document.getElementById('filter-date-to')?.value || null;
      this.currentPage = 1;
      this.renderBikeList();
      toastManager.show('Filters applied', 'success');
    });
    
    document.getElementById('clear-filters')?.addEventListener('click', () => {
      this.currentFilters.owner = '';
      this.currentFilters.profitMin = null;
      this.currentFilters.profitMax = null;
      this.currentFilters.dateFrom = null;
      this.currentFilters.dateTo = null;
      const filterOwner = document.getElementById('filter-owner');
      const filterProfitMin = document.getElementById('filter-profit-min');
      const filterProfitMax = document.getElementById('filter-profit-max');
      const filterDateFrom = document.getElementById('filter-date-from');
      const filterDateTo = document.getElementById('filter-date-to');
      if (filterOwner) filterOwner.value = '';
      if (filterProfitMin) filterProfitMin.value = '';
      if (filterProfitMax) filterProfitMax.value = '';
      if (filterDateFrom) filterDateFrom.value = '';
      if (filterDateTo) filterDateTo.value = '';
      this.currentPage = 1;
      this.renderBikeList();
      toastManager.show('Filters cleared', 'success');
    });
    
    // Status filters
    document.getElementById('filter-all')?.addEventListener('click', () => this.setFilterStatus('all'));
    document.getElementById('filter-sold')?.addEventListener('click', () => this.setFilterStatus('sold'));
    document.getElementById('filter-unsold')?.addEventListener('click', () => this.setFilterStatus('unsold'));
    
    // Bike list interactions
    this.dom.bikeList?.addEventListener('click', (e) => {
      const card = e.target.closest('.bike-card');
      if (card) {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          this.toggleBikeSelection(card.dataset.id);
        } else {
          this.handleEditBike(card.dataset.id);
        }
      }
    });
    
    // Add bike buttons
    [document.getElementById('fab-buy'), document.getElementById('buy-bike-desktop')].forEach(btn => {
      btn?.addEventListener('click', () => this.handleNewBike());
    });
    
    // Bulk actions
    document.getElementById('bulk-mark-sold')?.addEventListener('click', () => this.handleBulkMarkSold());
    document.getElementById('bulk-export')?.addEventListener('click', () => this.handleBulkExport());
    document.getElementById('bulk-deselect')?.addEventListener('click', () => this.clearSelection());
    
    // Pagination
    document.getElementById('prev-page')?.addEventListener('click', () => this.changePage(-1));
    document.getElementById('next-page')?.addEventListener('click', () => this.changePage(1));
    
    // Modal buttons
    document.getElementById('close-form-modal')?.addEventListener('click', () => this.closeFormModal());
    document.getElementById('cancel-form-btn')?.addEventListener('click', () => this.closeFormModal());
    document.getElementById('save-form-btn')?.addEventListener('click', () => this.handleSaveBike());
    document.getElementById('delete-bike-btn')?.addEventListener('click', () => this.handleDeleteBike());
    document.getElementById('duplicate-bike-btn')?.addEventListener('click', () => this.handleDuplicateBike());
    
    // Form profit calculation
    ['form-purchasePrice', 'form-repairCost', 'form-sellingPrice'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.calculateFormProfit());
    });
    
    // Settings
    document.getElementById('save-sync-settings')?.addEventListener('click', () => this.handleSaveSyncSettings());
    document.getElementById('save-display-settings')?.addEventListener('click', () => this.handleSaveDisplaySettings());
    
    // Theme toggle
    document.getElementById('theme-switch')?.addEventListener('click', () => this.toggleTheme());
    
    document.getElementById('list-density')?.addEventListener('change', (e) => {
      this.settings.listDensity = e.target.value;
      this.saveSettings();
      this.renderBikeList();
    });
    
    // Data management
    document.getElementById('export-csv')?.addEventListener('click', () => this.exportData('csv'));
    document.getElementById('export-json')?.addEventListener('click', () => this.exportData('json'));
    document.getElementById('export-xlsx')?.addEventListener('click', () => this.exportData('xlsx'));
    document.getElementById('import-csv')?.addEventListener('click', () => document.getElementById('import-file-input')?.click());
    document.getElementById('download-template')?.addEventListener('click', () => this.downloadTemplate());
    document.getElementById('share-data')?.addEventListener('click', () => this.handleShareData());
    document.getElementById('import-file-input')?.addEventListener('change', (e) => this.handleImportFile(e));
    document.getElementById('wipe-data-btn')?.addEventListener('click', () => this.handleWipeData());
    
    // Stats date filters
    document.getElementById('apply-date-filter')?.addEventListener('click', () => this.applyStatsDateFilter());
    document.getElementById('reset-date-filter')?.addEventListener('click', () => this.resetStatsDateFilter());
    
    // Chart download buttons
    document.getElementById('download-profit-chart')?.addEventListener('click', () => chartManager.downloadChart('chart-profit-trend', 'profit-trend'));
    document.getElementById('export-profit-csv')?.addEventListener('click', () => this.exportChartData('profit'));
    document.getElementById('download-pie-chart')?.addEventListener('click', () => chartManager.downloadChart('chart-profit-pie', 'profit-distribution'));
    document.getElementById('download-top-chart')?.addEventListener('click', () => chartManager.downloadChart('chart-top-bikes', 'top-bikes'));
    
    // PAT modal
    document.getElementById('pat-skip')?.addEventListener('click', () => {
      document.getElementById('pat-modal')?.classList.remove('active');
      localStorage.removeItem('pat_needs_reentry');
    });
    
    document.getElementById('pat-submit')?.addEventListener('click', () => {
      const pat = document.getElementById('pat-reenter')?.value.trim();
      if (pat) {
        this.settings.githubPat = pat;
        bikeDB.savePAT(pat);
        if (gistSync) {
          gistSync.updateSettings(this.settings);
        } else {
          initGistSync(this.settings);
        }
        document.getElementById('pat-modal')?.classList.remove('active');
        localStorage.removeItem('pat_needs_reentry');
        toastManager.show('PAT restored for this session.', 'success');
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        this.handleNewBike();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        const formModal = document.getElementById('form-modal');
        if (formModal && formModal.classList.contains('active') && !e.target.matches('input, textarea')) {
          e.preventDefault();
          this.handleSaveBike();
        }
      }
      if (e.key === 'Escape') {
        const formModal = document.getElementById('form-modal');
        if (formModal && formModal.classList.contains('active')) {
          this.closeFormModal();
        }
        const sortMenu = document.getElementById('sort-menu');
        if (sortMenu) sortMenu.classList.remove('active');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        this.performUndo();
      }
    });
    
    // Online/offline detection
    window.addEventListener('online', () => this.updateOnlineStatus());
    window.addEventListener('offline', () => this.updateOnlineStatus());
    
    // Window resize
    window.addEventListener('resize', debounce(() => {
      this.isMobile = window.innerWidth < 768;
      chartManager.resizeAll();
    }, 200));
    
    window.addEventListener('beforeunload', () => {
      if (this.settings.githubPat) {
        localStorage.setItem('pat_needs_reentry', 'true');
      }
    });
  }

  // --- RENDERING ---

  async renderAll() {
    await this.renderBikeList();
    await this.renderStatsDashboard();
  }

  async renderBikeList() {
    if (!this.dom.bikeList) return;
    
    let bikes = [...this.allBikes];
    const emptyEl = document.getElementById('bike-list-empty');
    
    // Apply status filter
    if (this.currentFilters.status === 'sold') {
      bikes = bikes.filter(b => b.dateSelling && b.dateSelling !== '');
    } else if (this.currentFilters.status === 'unsold') {
      bikes = bikes.filter(b => !b.dateSelling || b.dateSelling === '');
    }
    
    // Apply search filter
    if (this.currentFilters.search) {
      const search = this.currentFilters.search;
      bikes = bikes.filter(b => 
        (b.no && b.no.toLowerCase().includes(search)) || 
        (b.owner && b.owner.toLowerCase().includes(search))
      );
    }
    
    // Apply advanced filters
    if (this.currentFilters.owner && this.currentFilters.owner.trim()) {
      const ownerLower = this.currentFilters.owner.toLowerCase();
      bikes = bikes.filter(b => b.owner && b.owner.toLowerCase().includes(ownerLower));
    }
    
    if (this.currentFilters.profitMin !== null && !isNaN(this.currentFilters.profitMin)) {
      bikes = bikes.filter(b => parseFloat(b.netProfit || 0) >= this.currentFilters.profitMin);
    }
    
    if (this.currentFilters.profitMax !== null && !isNaN(this.currentFilters.profitMax)) {
      bikes = bikes.filter(b => parseFloat(b.netProfit || 0) <= this.currentFilters.profitMax);
    }
    
    if (this.currentFilters.dateFrom) {
      const fromDate = new Date(this.currentFilters.dateFrom);
      if (!isNaN(fromDate.getTime())) {
        bikes = bikes.filter(b => {
          if (!b.datePurchase) return false;
          const purchaseDate = new Date(b.datePurchase);
          return !isNaN(purchaseDate.getTime()) && purchaseDate >= fromDate;
        });
      }
    }
    
    if (this.currentFilters.dateTo) {
      const toDate = new Date(this.currentFilters.dateTo);
      if (!isNaN(toDate.getTime())) {
        bikes = bikes.filter(b => {
          if (!b.datePurchase) return false;
          const purchaseDate = new Date(b.datePurchase);
          return !isNaN(purchaseDate.getTime()) && purchaseDate <= toDate;
        });
      }
    }
    
    // Sort
    bikes = this.sortBikes(bikes, this.currentFilters.sort);
    
    // Pagination
    this.totalPages = Math.ceil(bikes.length / ITEMS_PER_PAGE) || 1;
    const startIdx = (this.currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedBikes = bikes.slice(startIdx, startIdx + ITEMS_PER_PAGE);
    
    if (bikes.length === 0) {
      this.dom.bikeList.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      const pagination = document.getElementById('pagination');
      if (pagination) pagination.classList.add('hidden');
      return;
    }
    
    if (emptyEl) emptyEl.classList.add('hidden');
    
    requestAnimationFrame(() => {
      if (!this.dom.bikeList) return;
      
      this.dom.bikeList.innerHTML = paginatedBikes.map(bike => this.createBikeCardHTML(bike)).join('');
      
      // Re-attach event listeners to bike cards for selection
      this.dom.bikeList.querySelectorAll('.bike-checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', (e) => {
          e.stopPropagation();
          const card = checkbox.closest('.bike-card');
          if (card && card.dataset.id) {
            this.toggleBikeSelection(card.dataset.id);
          }
        });
      });
      
      const pagination = document.getElementById('pagination');
      if (pagination) {
        if (this.totalPages > 1) {
          pagination.classList.remove('hidden');
          const pageInfo = document.getElementById('page-info');
          if (pageInfo) pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
          const prevBtn = document.getElementById('prev-page');
          const nextBtn = document.getElementById('next-page');
          if (prevBtn) prevBtn.disabled = this.currentPage === 1;
          if (nextBtn) nextBtn.disabled = this.currentPage === this.totalPages;
        } else {
          pagination.classList.add('hidden');
        }
      }
    });
  }

  sortBikes(bikes, sortType) {
    const sortedBikes = [...bikes]; // Create copy to avoid mutating original
    switch (sortType) {
      case 'latest':
        return sortedBikes.sort((a, b) => {
          const dateA = new Date(a._updatedAt || 0).getTime();
          const dateB = new Date(b._updatedAt || 0).getTime();
          return dateB - dateA;
        });
      case 'oldest':
        return sortedBikes.sort((a, b) => {
          const dateA = new Date(a._updatedAt || 0).getTime();
          const dateB = new Date(b._updatedAt || 0).getTime();
          return dateA - dateB;
        });
      case 'profit-high':
        return sortedBikes.sort((a, b) => {
          const profitA = parseFloat(a.netProfit) || 0;
          const profitB = parseFloat(b.netProfit) || 0;
          return profitB - profitA;
        });
      case 'profit-low':
        return sortedBikes.sort((a, b) => {
          const profitA = parseFloat(a.netProfit) || 0;
          const profitB = parseFloat(b.netProfit) || 0;
          return profitA - profitB;
        });
      case 'plate':
        return sortedBikes.sort((a, b) => {
          const noA = (a.no || '').toString();
          const noB = (b.no || '').toString();
          return noA.localeCompare(noB);
        });
      case 'owner':
        return sortedBikes.sort((a, b) => {
          const ownerA = (a.owner || '').toString();
          const ownerB = (b.owner || '').toString();
          return ownerA.localeCompare(ownerB);
        });
      default:
        return sortedBikes;
    }
  }

  createBikeCardHTML(bike) {
    if (!bike) return '';
    
    const isSold = !!(bike.dateSelling && bike.dateSelling !== '');
    const profit = parseFloat(bike.netProfit) || 0;
    let profitClass = 'profit-value';
    let profitDisplay = `${this.settings.currency} ${formatCurrency(profit)}`;
    
    if (!isSold) {
      profitClass += ' unrealized';
      profitDisplay = 'Unsold';
    } else if (profit < 0) {
      profitClass += ' loss';
    } else if (profit === 0) {
      profitClass = 'text-secondary';
    }
    
    const bikeId = bike._id ? bike._id.toString() : '';
    const isSelected = bikeId && this.selectedBikes.has(bikeId);
    
    return `
      <div class="bike-card ${isSelected ? 'selected' : ''}" data-id="${bikeId}" role="listitem">
        <div class="bike-checkbox" role="checkbox" aria-checked="${isSelected}">
          <svg><use href="#icon-check"></use></svg>
        </div>
        <div class="bike-card-main">
          <div class="bike-card-plate">${escapeHtml(bike.no || '')}</div>
          <div class="bike-card-owner">${escapeHtml(bike.owner || '')}</div>
        </div>
        <div class="bike-card-profit">
          <div class="${profitClass}">${profitDisplay}</div>
        </div>
      </div>
    `;
  }

  async renderStatsDashboard() {
    let bikes = [...this.allBikes];
    
    if (this.statsDateFilter.from || this.statsDateFilter.to) {
      bikes = bikes.filter(b => {
        if (!b.dateSelling) return false;
        const saleDate = new Date(b.dateSelling);
        if (this.statsDateFilter.from && saleDate < new Date(this.statsDateFilter.from)) return false;
        if (this.statsDateFilter.to && saleDate > new Date(this.statsDateFilter.to)) return false;
        return true;
      });
    }
    
    const soldBikes = bikes.filter(b => b.dateSelling && b.dateSelling !== '');
    const unsoldBikes = bikes.filter(b => !b.dateSelling || b.dateSelling === '');
    
    const totalProfit = soldBikes.reduce((sum, b) => sum + parseFloat(b.netProfit || 0), 0);
    const unsoldValue = unsoldBikes.reduce((sum, b) => sum + parseFloat(b.purchasePrice || 0) + parseFloat(b.repairCost || 0), 0);
    
    const statTotalProfit = document.getElementById('stat-total-profit');
    const statUnsoldValue = document.getElementById('stat-unsold-value');
    const statSoldCount = document.getElementById('stat-sold-count');
    const statUnsoldCount = document.getElementById('stat-unsold-count');
    
    if (statTotalProfit) statTotalProfit.textContent = formatCurrency(totalProfit);
    if (statUnsoldValue) statUnsoldValue.textContent = formatCurrency(unsoldValue);
    if (statSoldCount) statSoldCount.textContent = soldBikes.length;
    if (statUnsoldCount) statUnsoldCount.textContent = unsoldBikes.length;

    const avgProfit = soldBikes.length > 0 ? totalProfit / soldBikes.length : 0;
    
    let insightText = `You have ${unsoldBikes.length} bikes in stock (total investment: ${this.settings.currency}${formatCurrency(unsoldValue)}).`;
    if (soldBikes.length > 0) {
      insightText += ` Your average profit per bike is ${this.settings.currency}${formatCurrency(avgProfit)}.`;
      
      if (avgProfit < 0) {
        insightText += ` ⚠️ Review pricing strategy - average loss detected.`;
      } else if (totalProfit > 100000) {
        insightText += ` 🎉 Congratulations on crossing ₹1 lakh in profits!`;
      }
    }
    const insightEl = document.getElementById('auto-insight-text');
    if (insightEl) insightEl.textContent = insightText;
    
    this.renderPerformanceMetrics(soldBikes);

    if (this.currentView === 'view-stats') {
      chartManager.renderProfitTrend(soldBikes);
      chartManager.renderProfitPie(soldBikes);
      chartManager.renderTopBikes(soldBikes);
    }
  }

  renderPerformanceMetrics(soldBikes) {
    const avgRoiEl = document.getElementById('stat-avg-roi');
    const bestBikeEl = document.getElementById('stat-best-bike');
    const worstBikeEl = document.getElementById('stat-worst-bike');
    const avgDaysEl = document.getElementById('stat-avg-days');
    
    if (!avgRoiEl) return;
    
    if (soldBikes.length === 0) {
      avgRoiEl.textContent = '0%';
      if (bestBikeEl) bestBikeEl.textContent = '-';
      if (worstBikeEl) worstBikeEl.textContent = '-';
      if (avgDaysEl) avgDaysEl.textContent = '0';
      return;
    }
    
    let totalROI = 0;
    soldBikes.forEach(b => {
      const investment = parseFloat(b.purchasePrice || 0) + parseFloat(b.repairCost || 0);
      if (investment > 0) {
        const roi = (parseFloat(b.netProfit || 0) / investment) * 100;
        totalROI += roi;
      }
    });
    const avgROI = totalROI / soldBikes.length;
    avgRoiEl.textContent = avgROI.toFixed(1) + '%';
    
    const sorted = [...soldBikes].sort((a, b) => parseFloat(b.netProfit || 0) - parseFloat(a.netProfit || 0));
    if (bestBikeEl) bestBikeEl.textContent = sorted[0]?.no || '-';
    if (worstBikeEl) worstBikeEl.textContent = sorted[sorted.length - 1]?.no || '-';
    
    let totalDays = 0;
    let validCount = 0;
    soldBikes.forEach(b => {
      if (b.datePurchase && b.dateSelling) {
        const days = (new Date(b.dateSelling) - new Date(b.datePurchase)) / (1000 * 60 * 60 * 24);
        if (days >= 0) {
          totalDays += days;
          validCount++;
        }
      }
    });
    const avgDays = validCount > 0 ? Math.round(totalDays / validCount) : 0;
    if (avgDaysEl) avgDaysEl.textContent = avgDays;
  }

  // --- BIKE CRUD OPERATIONS ---

  handleNewBike() {
    this.openFormModal('buy');
  }

  async handleEditBike(id) {
    try {
      const bike = await bikeDB.getBike(Number(id));
      if (bike) {
        const mode = (bike.dateSelling && bike.dateSelling !== '') ? 'view' : 'sell';
        this.openFormModal(mode, bike);
      }
    } catch (error) {
      console.error("Failed to get bike for editing:", error);
      toastManager.show("Could not load bike data.", 'error');
    }
  }

  async handleSaveBike() {
    const form = document.getElementById('bike-form');
    const id = document.getElementById('form-bike-id')?.value;
    
    const plateInput = document.getElementById('form-no');
    const ownerInput = document.getElementById('form-owner');
    
    if (!plateInput || !ownerInput) {
      toastManager.show("Form fields not found.", 'error');
      return;
    }
    
    const plate = plateInput.value ? plateInput.value.trim().toUpperCase() : '';
    const owner = ownerInput.value ? ownerInput.value.trim() : '';
    
    if (!plate || !owner) {
      toastManager.show("Bike Plate and Owner Name are required.", 'error');
      return;
    }
    
    const bikeData = {
      no: plate,
      owner: owner,
      purchasePrice: parseFloat(document.getElementById('form-purchasePrice')?.value) || 0,
      repairCost: parseFloat(document.getElementById('form-repairCost')?.value) || 0,
      sellingPrice: parseFloat(document.getElementById('form-sellingPrice')?.value) || 0,
      datePurchase: document.getElementById('form-datePurchase')?.value || '',
      dateSelling: document.getElementById('form-dateSelling')?.value || '',
    };
    
    try {
      let oldBike = null;
      if (id) {
        oldBike = await bikeDB.getBike(Number(id));
        await bikeDB.updateBike(Number(id), bikeData);
        toastManager.show("Bike updated successfully.", 'success');
      } else {
        await bikeDB.addBike(bikeData);
        toastManager.show("Bike added successfully.", 'success');
        
        if (bikeData.dateSelling) {
          this.showConfetti();
        }
      }
      
      this.addToUndoStack('update', oldBike || bikeData);
      
      vibrate(20);
      this.closeFormModal();
      await this.loadAllBikes();
      await this.renderAll();
      this.triggerAutoSync();
      
    } catch (error) {
      console.error("Save bike failed:", error);
      if (error.name === 'ConstraintError') {
        toastManager.show("A bike with this plate number already exists.", 'error');
      } else {
        toastManager.show("Failed to save bike.", 'error');
      }
    }
  }

  async handleDeleteBike() {
    const id = document.getElementById('form-bike-id')?.value;
    if (!id) return;
    
    if (confirm("Are you sure you want to delete this bike? You can undo this action.")) {
      try {
        const bike = await bikeDB.getBike(Number(id));
        await bikeDB.deleteBike(Number(id));
        
        this.addToUndoStack('delete', bike);
        
        toastManager.showWithUndo("Bike deleted.", () => this.undoDelete(bike));
        vibrate(50);
        this.closeFormModal();
        await this.loadAllBikes();
        await this.renderAll();
        this.triggerAutoSync();
      } catch (error) {
        console.error("Delete failed:", error);
        toastManager.show("Failed to delete bike.", 'error');
      }
    }
  }

  async handleDuplicateBike() {
    const id = document.getElementById('form-bike-id')?.value;
    if (!id) return;
    
    try {
      const bike = await bikeDB.getBike(Number(id));
      if (bike) {
        this.closeFormModal();
        
        setTimeout(() => {
          this.openFormModal('buy');
          const formOwner = document.getElementById('form-owner');
          const formPurchasePrice = document.getElementById('form-purchasePrice');
          const formRepairCost = document.getElementById('form-repairCost');
          const formDatePurchase = document.getElementById('form-datePurchase');
          
          if (formOwner) formOwner.value = bike.owner || '';
          if (formPurchasePrice) formPurchasePrice.value = bike.purchasePrice || '';
          if (formRepairCost) formRepairCost.value = bike.repairCost || '';
          if (formDatePurchase) formDatePurchase.value = new Date().toISOString().split('T')[0];
          toastManager.show("Fill in the new plate number", 'info');
        }, 300);
      }
    } catch (error) {
      console.error("Duplicate failed:", error);
      toastManager.show("Failed to duplicate bike.", 'error');
    }
  }

  async handleBulkMarkSold() {
    if (this.selectedBikes.size === 0) return;
    
    const sellDate = prompt("Enter selling date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
    if (!sellDate) return;
    
    const sellPriceStr = prompt("Enter selling price for all selected bikes:");
    const sellPrice = parseFloat(sellPriceStr);
    if (isNaN(sellPrice)) {
      toastManager.show("Invalid selling price", 'error');
      return;
    }
    
    try {
      for (const idStr of this.selectedBikes) {
        const bike = await bikeDB.getBike(Number(idStr));
        if (bike && (!bike.dateSelling || bike.dateSelling === '')) {
          await bikeDB.updateBike(Number(idStr), {
            dateSelling: sellDate,
            sellingPrice: sellPrice,
          });
        }
      }
      
      toastManager.show(`${this.selectedBikes.size} bikes marked as sold`, 'success');
      this.clearSelection();
      await this.loadAllBikes();
      await this.renderAll();
      this.triggerAutoSync();
    } catch (error) {
      console.error("Bulk mark sold failed:", error);
      toastManager.show("Failed to mark bikes as sold", 'error');
    }
  }

  async handleBulkExport() {
    if (this.selectedBikes.size === 0) return;
    
    const bikes = [];
    for (const idStr of this.selectedBikes) {
      const bike = await bikeDB.getBike(Number(idStr));
      if (bike) {
        const { _id, _deleted, ...rest } = bike;
        bikes.push(rest);
      }
    }
    
    const csv = this.jsonToCsv(bikes, true);
    const filename = `selected-bikes-${new Date().toISOString().split('T')[0]}.csv`;
    downloadFile(csv, filename, 'text/csv');
    toastManager.show(`Exported ${bikes.length} bikes`, 'success');
  }

  // --- FORM & MODAL ---

  openFormModal(mode = 'buy', bike = null) {
    const title = document.getElementById('form-title');
    const deleteBtn = document.getElementById('delete-bike-btn');
    const duplicateBtn = document.getElementById('duplicate-bike-btn');
    const saveBtn = document.getElementById('save-form-btn');
    const saveBtnText = document.getElementById('save-form-btn-text');
    const buySection = document.getElementById('form-section-buy');
    const sellSection = document.getElementById('form-section-sell');
    
    document.getElementById('bike-form')?.reset();
    
    if (title) title.textContent = "Buy New Bike";
    if (deleteBtn) deleteBtn.classList.add('hidden');
    if (duplicateBtn) duplicateBtn.classList.add('hidden');
    if (saveBtn) saveBtn.classList.remove('hidden');
    if (saveBtnText) saveBtnText.textContent = "Save Purchase";
    if (buySection) buySection.classList.remove('readonly-section');
    if (sellSection) sellSection.classList.add('hidden');
    const formDatePurchase = document.getElementById('form-datePurchase');
    const formBikeId = document.getElementById('form-bike-id');
    if (formDatePurchase) formDatePurchase.value = new Date().toISOString().split('T')[0];
    if (formBikeId) formBikeId.value = '';
    
    if (mode === 'sell' && bike) {
      if (title) title.textContent = "Sell Bike";
      if (deleteBtn) deleteBtn.classList.remove('hidden');
      if (duplicateBtn) duplicateBtn.classList.remove('hidden');
      if (saveBtnText) saveBtnText.textContent = "Save Sale";
      
      if (buySection) buySection.classList.add('readonly-section');
      if (sellSection) sellSection.classList.remove('hidden');
      
      this.fillForm(bike);
      const formDateSelling = document.getElementById('form-dateSelling');
      if (formDateSelling) formDateSelling.value = new Date().toISOString().split('T')[0];
    
    } else if (mode === 'view' && bike) {
      if (title) title.textContent = "View Sale";
      if (deleteBtn) deleteBtn.classList.remove('hidden');
      if (duplicateBtn) duplicateBtn.classList.remove('hidden');
      if (saveBtn) saveBtn.classList.add('hidden');
      
      if (buySection) buySection.classList.add('readonly-section');
      if (sellSection) {
        sellSection.classList.remove('hidden');
        sellSection.classList.add('readonly-section');
      }
      
      this.fillForm(bike);
    }
    
    modalManager.open('form-modal');
    setTimeout(() => document.getElementById('form-no')?.focus(), 100);
  }

  fillForm(bike) {
    if (!bike) return;
    
    const formId = document.getElementById('form-bike-id');
    const formNo = document.getElementById('form-no');
    const formOwner = document.getElementById('form-owner');
    const formDatePurchase = document.getElementById('form-datePurchase');
    const formPurchasePrice = document.getElementById('form-purchasePrice');
    const formRepairCost = document.getElementById('form-repairCost');
    const formDateSelling = document.getElementById('form-dateSelling');
    const formSellingPrice = document.getElementById('form-sellingPrice');
    
    if (formId) formId.value = bike._id || '';
    if (formNo) formNo.value = bike.no || '';
    if (formOwner) formOwner.value = bike.owner || '';
    if (formDatePurchase) formDatePurchase.value = bike.datePurchase || '';
    if (formPurchasePrice) formPurchasePrice.value = bike.purchasePrice || '';
    if (formRepairCost) formRepairCost.value = bike.repairCost || '';
    if (formDateSelling) formDateSelling.value = bike.dateSelling || '';
    if (formSellingPrice) formSellingPrice.value = bike.sellingPrice || '';
    this.calculateFormProfit();
  }

  closeFormModal() {
    modalManager.close('form-modal');
    document.getElementById('form-section-buy')?.classList.remove('readonly-section');
    document.getElementById('form-section-sell')?.classList.remove('readonly-section');
  }

  calculateFormProfit() {
    const p = parseFloat(document.getElementById('form-purchasePrice')?.value) || 0;
    const r = parseFloat(document.getElementById('form-repairCost')?.value) || 0;
    const s = parseFloat(document.getElementById('form-sellingPrice')?.value) || 0;
    const profit = s - (p + r);
    const profitEl = document.getElementById('form-netProfit');
    if (profitEl) profitEl.value = profit.toFixed(2);
  }

  // --- SETTINGS HANDLERS ---

  handleSaveSyncSettings() {
    this.settings.gistId = document.getElementById('setting-gist-id')?.value.trim() || '';
    this.settings.gistFilename = document.getElementById('setting-gist-filename')?.value.trim() || 'bikes_inventory.csv';
    this.settings.githubPat = document.getElementById('setting-github-pat')?.value.trim() || '';
    this.settings.lastSyncSha = null;
    
    if (this.settings.githubPat) {
      bikeDB.savePAT(this.settings.githubPat);
    }
    
    if (this.settings.gistId && this.settings.githubPat) {
      if (gistSync) {
        gistSync.updateSettings(this.settings);
      } else {
        initGistSync(this.settings);
      }
    }
    
    this.saveSettings();
    toastManager.show("Sync settings saved for this session.", 'success');
  }

  handleSaveDisplaySettings() {
    this.settings.businessName = document.getElementById('setting-business-name')?.value.trim() || 'Bike Manager';
    this.settings.currency = document.getElementById('setting-currency')?.value.trim() || '₹';
    this.saveSettings();
    toastManager.show("Display settings saved.", 'success');
    this.renderAll();
  }

  toggleTheme() {
    const isDark = document.body.classList.contains('theme-dark') || 
                  !document.body.classList.contains('theme-light');
    
    if (isDark) {
      bikeDB.saveTheme('light');
      this.applyTheme('light');
    } else {
      bikeDB.saveTheme('dark');
      this.applyTheme('dark');
    }
    
    vibrate(10);
  }

  async handleWipeData() {
    if (confirm("WARNING: This will delete ALL local bike data. Are you sure?")) {
      await bikeDB.clearAll();
      this.allBikes = [];
      toastManager.show("All local data has been wiped.", 'success');
      await this.renderAll();
    }
  }

  // --- IMPORT / EXPORT ---

  async exportData(format) {
    const bikes = this.allBikes.filter(b => !b._deleted);
    if (bikes.length === 0) {
      toastManager.show("No data to export.", 'warning');
      return;
    }
    
    const exportBikes = bikes.map(b => {
      const { _id, _deleted, ...rest } = b;
      return rest;
    });
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `bike_inventory_${timestamp}`;

    if (format === 'json') {
      downloadFile(JSON.stringify(exportBikes, null, 2), `${filename}.json`, 'application/json');
      toastManager.show("Exported as JSON", 'success');
    } else if (format === 'csv') {
      downloadFile(this.jsonToCsv(exportBikes, true), `${filename}.csv`, 'text/csv');
      toastManager.show("Exported as CSV", 'success');
    } else if (format === 'xlsx') {
      if (typeof XLSX !== 'undefined') {
        const ws = XLSX.utils.json_to_sheet(exportBikes);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Bikes');
        XLSX.writeFile(wb, `${filename}.xlsx`);
        toastManager.show("Exported as XLSX", 'success');
      } else {
        toastManager.show("XLSX library not loaded", 'error');
      }
    }
  }

  downloadTemplate() {
    const templateData = [{
      no: 'GJ05AB1234',
      owner: 'John Doe',
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
    downloadFile(csv, 'bike_template.csv', 'text/csv');
    toastManager.show("Template downloaded", 'success');
  }

  async handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toastManager.show('File is too large (max 5MB).', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        let bikesToImport = [];
        
        if (file.name.endsWith('.json')) {
          bikesToImport = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          bikesToImport = this.csvToJson(content);
        } else {
          toastManager.show("Unsupported file type. Please use .csv or .json", 'error');
          return;
        }
        
        if (!Array.isArray(bikesToImport)) throw new Error("Invalid file format.");
        
        const now = new Date().toISOString();
        const preparedBikes = bikesToImport.map(b => {
          const purchasePrice = parseFloat(b.purchasePrice) || 0;
          const repairCost = parseFloat(b.repairCost) || 0;
          const sellingPrice = parseFloat(b.sellingPrice) || 0;
          
          return {
            no: (b.no || '').toString().trim().toUpperCase(),
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
        
        if (confirm(`Found ${preparedBikes.length} records. This will ADD new records and UPDATE existing records based on bike plate. Continue?`)) {
          await bikeDB.bulkUpdate(preparedBikes);
          toastManager.show(`Successfully imported/updated ${preparedBikes.length} records.`, 'success');
          await this.loadAllBikes();
          await this.renderAll();
          this.triggerAutoSync();
        }
        
      } catch (error) {
        console.error("Import failed:", error);
        toastManager.show("Import failed. Check file format.", 'error');
      } finally {
        event.target.value = '';
      }
    };
    
    reader.readAsText(file);
  }

  async handleShareData() {
    if (!navigator.share) {
      toastManager.show("Sharing not supported on this device", 'warning');
      return;
    }
    
    try {
      const bikes = this.allBikes.filter(b => !b._deleted);
      const csv = this.jsonToCsv(bikes.map(b => {
        const { _id, _deleted, ...rest } = b;
        return rest;
      }), true);
      
      const file = new File([csv], `bikes_${new Date().toISOString().split('T')[0]}.csv`, {
        type: 'text/csv'
      });
      
      await navigator.share({
        title: 'Bike Inventory',
        text: `Bike inventory export (${bikes.length} bikes)`,
        files: [file]
      });
      
      toastManager.show("Shared successfully", 'success');
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Share failed:", error);
        toastManager.show("Failed to share data", 'error');
      }
    }
  }

  // --- SYNC ---

  syncNow() {
    this.debouncedSync();
  }

  async syncNowInternal() {
    if (!this.isOnline) {
      if (toastManager) {
        toastManager.show("Cannot sync. You are offline.", 'warning');
      }
      return;
    }
    
    if (!this.settings.gistId || !this.settings.githubPat) {
      if (toastManager) {
        toastManager.show("Gist ID and GitHub PAT must be set in Settings.", 'error');
      }
      this.navigateTo('view-settings');
      return;
    }
    
    // Initialize sync if not already done
    if (!gistSync) {
      initGistSync(this.settings);
    } else {
      gistSync.updateSettings(this.settings);
    }
    
    this.setSyncStatus('syncing', 'Syncing...');
    
    try {
      const mergedBikes = await gistSync.sync(this.allBikes, (progress) => {
        this.setSyncStatus('syncing', progress);
      });
      
      // Update local database with merged data
      await bikeDB.bulkUpdate(mergedBikes);
      
      this.settings.lastSync = new Date().toISOString();
      this.saveSettings();
      
      await this.loadAllBikes();
      await this.renderAll();
      
      this.setSyncStatus('success', 'Up to date');
      toastManager.show("Sync complete.", 'success');
      
    } catch (error) {
      console.error("Sync failed:", error);
      this.setSyncStatus('error', 'Sync Failed');
      toastManager.show(error.message || "Sync failed", 'error');
    }
  }

  triggerAutoSync() {
    if (this.isOnline && this.settings.gistId && this.settings.githubPat && gistSync) {
      console.log("Triggering auto-sync in background...");
      this.debouncedSync();
    }
  }

  // --- UNDO FUNCTIONALITY ---

  addToUndoStack(action, data) {
    this.undoStack.push({ action, data, timestamp: Date.now() });
    if (this.undoStack.length > 10) {
      this.undoStack.shift();
    }
    bikeDB.saveUndoStack(this.undoStack);
  }

  async performUndo() {
    if (this.undoStack.length === 0) {
      toastManager.show("Nothing to undo", 'info');
      return;
    }
    
    const lastAction = this.undoStack.pop();
    bikeDB.saveUndoStack(this.undoStack);
    
    if (lastAction.action === 'delete') {
      await this.undoDelete(lastAction.data);
    } else if (lastAction.action === 'update') {
      await this.undoUpdate(lastAction.data);
    }
  }

  async undoDelete(bike) {
    if (!bike || !bike._id) {
      toastManager.show("Cannot undo: Invalid bike data", 'error');
      return;
    }
    try {
      await bikeDB.restoreBike(bike._id);
      toastManager.show("Deletion undone", 'success');
      await this.loadAllBikes();
      await this.renderAll();
      this.triggerAutoSync();
    } catch (error) {
      console.error("Undo delete failed:", error);
      toastManager.show("Failed to undo deletion", 'error');
    }
  }

  async undoUpdate(oldBike) {
    if (!oldBike || !oldBike._id) {
      toastManager.show("Cannot undo: Invalid bike data", 'error');
      return;
    }
    try {
      await bikeDB.updateBike(oldBike._id, {
        ...oldBike,
        _updatedAt: new Date().toISOString()
      });
      toastManager.show("Update undone", 'success');
      await this.loadAllBikes();
      await this.renderAll();
      this.triggerAutoSync();
    } catch (error) {
      console.error("Undo update failed:", error);
      toastManager.show("Failed to undo update", 'error');
    }
  }

  // --- UTILITY METHODS ---

  navigateTo(viewId) {
    this.currentView = viewId;
    this.dom.views.forEach(v => v.classList.remove('active'));
    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.add('active');
    
    this.dom.navButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewId);
    });
    
    if (viewId === 'view-stats') {
      this.renderStatsDashboard();
    }
  }

  setFilterStatus(status) {
    this.currentFilters.status = status;
    document.querySelectorAll('.filter-chips .chip').forEach(c => {
      c.classList.toggle('active', c.dataset.filter === status);
    });
    this.currentPage = 1;
    this.renderBikeList();
  }

  setSyncStatus(status, text) {
    if (this.dom.syncStatus) {
      this.dom.syncStatus.className = `sync-status ${status}`;
    }
    if (this.dom.syncStatusText) {
      this.dom.syncStatusText.textContent = text;
    }
  }

  updateOnlineStatus() {
    this.isOnline = navigator.onLine;
    if (this.isOnline) {
      this.setSyncStatus('success', 'Online');
    } else {
      this.setSyncStatus('offline', 'Offline');
    }
  }

  toggleBikeSelection(id) {
    const idStr = id.toString();
    if (this.selectedBikes.has(idStr)) {
      this.selectedBikes.delete(idStr);
    } else {
      this.selectedBikes.add(idStr);
    }
    
    this.updateBulkActionBar();
    this.renderBikeList();
  }

  updateBulkActionBar() {
    const bar = document.getElementById('bulk-action-bar');
    const count = this.selectedBikes.size;
    const countEl = document.getElementById('selected-count');
    if (countEl) countEl.textContent = count;
    
    if (bar) {
      if (count > 0) {
        bar.classList.add('active');
      } else {
        bar.classList.remove('active');
      }
    }
  }

  clearSelection() {
    this.selectedBikes.clear();
    this.updateBulkActionBar();
    this.renderBikeList();
  }

  changePage(delta) {
    const newPage = this.currentPage + delta;
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage;
      this.renderBikeList();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  applyStatsDateFilter() {
    const dateFrom = document.getElementById('stats-date-from');
    const dateTo = document.getElementById('stats-date-to');
    
    if (dateFrom && dateTo) {
      this.statsDateFilter.from = dateFrom.value;
      this.statsDateFilter.to = dateTo.value;
      this.renderStatsDashboard();
      toastManager.show('Date filter applied', 'success');
    }
  }

  resetStatsDateFilter() {
    this.statsDateFilter = { from: null, to: null };
    const dateFrom = document.getElementById('stats-date-from');
    const dateTo = document.getElementById('stats-date-to');
    if (dateFrom) dateFrom.value = '';
    if (dateTo) dateTo.value = '';
    this.renderStatsDashboard();
    toastManager.show('Date filter reset', 'success');
  }

  async exportChartData(chartType) {
    const soldBikes = this.allBikes.filter(b => !b._deleted && b.dateSelling);
    
    if (chartType === 'profit') {
      const monthlyData = soldBikes.reduce((acc, bike) => {
        if (!bike.dateSelling) return acc;
        const month = bike.dateSelling.substring(0, 7);
        acc[month] = (acc[month] || 0) + parseFloat(bike.netProfit || 0);
        return acc;
      }, {});
      
      const csvData = Object.keys(monthlyData).sort().map(month => ({
        month,
        profit: monthlyData[month]
      }));
      
      const csv = this.jsonToCsv(csvData, true);
      downloadFile(csv, `profit-trend-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
      toastManager.show('Chart data exported', 'success');
    }
  }

  checkPATStatus() {
    if (this.settings.gistId && !this.settings.githubPat && localStorage.getItem('pat_needs_reentry') === 'true') {
      modalManager.open('pat-modal');
    }
  }

  showConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const particleCount = 150;
    const colors = ['#00D0FF', '#6EE7B7', '#22c55e', '#f59e0b', '#ef4444'];
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 6 + 2,
        d: Math.random() * particleCount,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 10,
        tiltAngleIncremental: Math.random() * 0.07 + 0.05,
        tiltAngle: 0
      });
    }
    
    let animationFrame;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Use reverse iteration to safely remove items
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        ctx.beginPath();
        ctx.lineWidth = p.r / 2;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
        ctx.stroke();
        
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
        p.x += Math.sin(p.d);
        p.tilt = Math.sin(p.tiltAngle - i / 3) * 15;
        
        if (p.y > canvas.height) {
          particles.splice(i, 1);
        }
      }
      
      if (particles.length > 0) {
        animationFrame = requestAnimationFrame(draw);
      } else {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
      }
    };
    
    draw();
    vibrate([50, 100, 50]);
  }

  // --- CSV UTILITIES ---

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
        values.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    values.push(currentField.trim());
    return values.map(v => v.replace(/^"|"$/g, ''));
  }

  csvToJson(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }
    const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    
    const headers = this.parseCsvLine(lines[0]);
    
    return lines.slice(1).map(line => {
      const values = this.parseCsvLine(line);
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      return obj;
    });
  }

  jsonToCsv(items, skipDeleted = false) {
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

  async loadAllBikes() {
    this.allBikes = await bikeDB.getAllBikes();
    if (this.searchSuggestions) {
      this.searchSuggestions.updateBikes(this.allBikes);
    }
  }
}

// Initialize app when DOM is ready
let app = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app = new BikeManagerApp();
    app.init();
    window.app = app;
  });
} else {
  app = new BikeManagerApp();
  app.init();
  window.app = app;
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('Service Worker registered:', registration.scope);
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available
                modalManager.open('update-modal');
                // Use once flag to prevent duplicate listeners
                const refreshBtn = document.getElementById('update-refresh-btn');
                if (refreshBtn) {
                  refreshBtn.addEventListener('click', () => {
                    window.location.reload();
                  }, { once: true });
                }
              }
            };
          }
        };
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

