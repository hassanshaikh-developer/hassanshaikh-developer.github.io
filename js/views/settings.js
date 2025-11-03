/**
 * Settings View Module
 * Handles settings page functionality
 */

(function(window) {
  'use strict';

  if (!window.app) {
    console.error('Settings view: app not initialized');
    return;
  }

  const app = window.app;

  Object.assign(app, {
    /**
     * Toggle theme
     */
    toggleTheme() {
      const themeSwitch = document.getElementById('theme-switch');
      const isDark = document.documentElement.classList.contains('theme-dark') || 
                    (!document.documentElement.classList.contains('theme-light') && 
                     window.matchMedia('(prefers-color-scheme: dark)').matches);
      
      if (isDark) {
        document.documentElement.classList.remove('theme-dark');
        document.documentElement.classList.add('theme-light');
        localStorage.setItem('bike_manager_theme', 'light');
        if (themeSwitch) {
          themeSwitch.classList.remove('active');
          themeSwitch.setAttribute('aria-checked', 'false');
        }
      } else {
        document.documentElement.classList.remove('theme-light');
        document.documentElement.classList.add('theme-dark');
        localStorage.setItem('bike_manager_theme', 'dark');
        if (themeSwitch) {
          themeSwitch.classList.add('active');
          themeSwitch.setAttribute('aria-checked', 'true');
        }
      }
      
      this.vibrate(10);
      // Re-render charts if on stats view
      if (this.currentView === 'view-stats' && typeof this.renderStatsDashboard === 'function') {
        this.renderStatsDashboard();
      }
    },

    /**
     * Handle save sync settings
     */
    handleSaveSyncSettings() {
      const gistId = document.getElementById('setting-gist-id')?.value.trim();
      const filename = document.getElementById('setting-gist-filename')?.value.trim();
      const pat = document.getElementById('setting-github-pat')?.value.trim();
      
      this.settings.gistId = gistId;
      this.settings.gistFilename = filename || 'bikes_inventory.csv';
      
      if (pat) {
        this.settings.githubPat = pat;
      }
      
      this.saveSettings();
      this.showToast('Sync settings saved', 'success');
    },

    /**
     * Handle save display settings
     */
    handleSaveDisplaySettings() {
      const businessName = document.getElementById('setting-business-name')?.value.trim();
      const currency = document.getElementById('setting-currency')?.value.trim();
      
      this.settings.businessName = businessName || 'Bike Manager';
      this.settings.currency = currency || '₹';
      
      this.saveSettings();
      
      // Update UI
      const headerTitle = document.getElementById('header-title');
      if (headerTitle) headerTitle.textContent = this.settings.businessName;
      
      document.querySelectorAll('.currency').forEach(el => {
        el.textContent = this.settings.currency;
      });
      
      this.showToast('Display settings saved', 'success');
    },

    /**
     * Load settings into form
     */
    loadSettingsIntoForm() {
      document.getElementById('setting-gist-id').value = this.settings.gistId || '';
      document.getElementById('setting-gist-filename').value = this.settings.gistFilename || 'bikes_inventory.csv';
      document.getElementById('setting-github-pat').value = '';
      document.getElementById('setting-business-name').value = this.settings.businessName || 'Bike Manager';
      document.getElementById('setting-currency').value = this.settings.currency || '₹';
      document.getElementById('list-density').value = this.settings.listDensity || 'comfortable';
      
      // Set theme switch
      const themeSwitch = document.getElementById('theme-switch');
      const isDark = document.documentElement.classList.contains('theme-dark') ||
                    (!document.documentElement.classList.contains('theme-light') &&
                     window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (themeSwitch) {
        themeSwitch.classList.toggle('active', isDark);
        themeSwitch.setAttribute('aria-checked', isDark);
      }
    },

    /**
     * Initialize settings view listeners
     */
    initSettingsViewListeners() {
      // Theme toggle
      const themeSwitch = document.getElementById('theme-switch');
      if (themeSwitch) {
        themeSwitch.addEventListener('click', () => this.toggleTheme());
        themeSwitch.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.toggleTheme();
          }
        });
      }
      
      // List density
      const listDensity = document.getElementById('list-density');
      if (listDensity) {
        listDensity.addEventListener('change', (e) => {
          this.settings.listDensity = e.target.value;
          this.saveSettings();
          const bikeList = document.getElementById('bike-list');
          if (bikeList) {
            bikeList.className = `bike-list ${this.settings.listDensity}`;
          }
          this.renderBikeList();
        });
      }
      
      // Save buttons
      document.getElementById('save-sync-settings')?.addEventListener('click', () => this.handleSaveSyncSettings());
      document.getElementById('save-display-settings')?.addEventListener('click', () => this.handleSaveDisplaySettings());
      
      // Data management
      document.getElementById('export-csv')?.addEventListener('click', () => this.exportData('csv'));
      document.getElementById('export-json')?.addEventListener('click', () => this.exportData('json'));
      document.getElementById('export-xlsx')?.addEventListener('click', () => this.exportData('xlsx'));
      document.getElementById('import-csv')?.addEventListener('click', () => {
        document.getElementById('import-file-input')?.click();
      });
      document.getElementById('download-template')?.addEventListener('click', () => {
        this.exportData('csv', [{
          no: 'EXAMPLE123',
          owner: 'John Doe',
          purchasePrice: 10000,
          repairCost: 500,
          sellingPrice: 12000,
          netProfit: 1500,
          datePurchase: new Date().toISOString().split('T')[0],
          dateSelling: ''
        }]);
      });
      
      // Import file
      document.getElementById('import-file-input')?.addEventListener('change', (e) => {
        this.handleImportFile(e);
      });
      
      // Wipe data
      document.getElementById('wipe-data-btn')?.addEventListener('click', () => {
        if (confirm('Are you sure? This will delete ALL local data and cannot be undone!')) {
          this.handleWipeData();
        }
      });
      
      // PAT modal
      document.getElementById('pat-skip')?.addEventListener('click', () => {
        document.getElementById('pat-modal')?.classList.remove('active');
        localStorage.removeItem('pat_needs_reentry');
      });
      
      document.getElementById('pat-submit')?.addEventListener('click', () => {
        const pat = document.getElementById('pat-reenter')?.value.trim();
        if (pat) {
          this.settings.githubPat = pat;
          sessionStorage.setItem('bike_manager_pat_v6', pat);
          document.getElementById('pat-modal')?.classList.remove('active');
          localStorage.removeItem('pat_needs_reentry');
          this.showToast('PAT restored for this session', 'success');
          this.syncNow();
        } else {
          this.showToast('Please enter a valid PAT', 'error');
        }
      });
      
      // Load settings when navigating to settings view
      this.loadSettingsIntoForm();
    },

    /**
     * Handle import file
     */
    async handleImportFile(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const bikes = this.csvToJson(text);
        
        if (bikes.length === 0) {
          this.showToast('No valid data found in file', 'warning');
          return;
        }
        
        let count = 0;
        for (const bikeData of bikes) {
          const bike = {
            _id: `bike_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            no: bikeData.no || '',
            owner: bikeData.owner || '',
            purchasePrice: parseFloat(bikeData.purchasePrice) || 0,
            repairCost: parseFloat(bikeData.repairCost) || 0,
            sellingPrice: parseFloat(bikeData.sellingPrice) || 0,
            netProfit: parseFloat(bikeData.netProfit) || 0,
            datePurchase: bikeData.datePurchase || '',
            dateSelling: bikeData.dateSelling || '',
            _updatedAt: Date.now(),
            _deleted: false
          };
          
          await this.db.bikes.add(bike);
          count++;
        }
        
        this.showToast(`Imported ${count} bikes`, 'success');
        await this.renderAll();
      } catch (error) {
        console.error('Import failed:', error);
        this.showToast('Failed to import file', 'error');
      }
    },

    /**
     * Handle wipe data
     */
    async handleWipeData() {
      try {
        await this.db.bikes.clear();
        this.showToast('All local data wiped', 'success');
        await this.renderAll();
      } catch (error) {
        console.error('Wipe failed:', error);
        this.showToast('Failed to wipe data', 'error');
      }
    },

    /**
     * CSV to JSON parser
     */
    csvToJson(text) {
      if (!text || typeof text !== 'string') return [];
      
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
    },

    /**
     * Parse CSV line
     */
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
  });

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.app) {
        window.app.initSettingsViewListeners();
        // Also load settings when navigating
        const originalNavigate = window.app.navigateTo;
        window.app.navigateTo = function(viewId) {
          originalNavigate.call(this, viewId);
          if (viewId === 'view-settings') {
            this.loadSettingsIntoForm();
          }
        };
      }
    });
  } else {
    if (window.app) {
      window.app.initSettingsViewListeners();
      const originalNavigate = window.app.navigateTo;
      window.app.navigateTo = function(viewId) {
        originalNavigate.call(this, viewId);
        if (viewId === 'view-settings') {
          this.loadSettingsIntoForm();
        }
      };
    }
  }

})(window);

