/**
 * BIKE MANAGER - SETTINGS.JS
 * Settings page component
 */

import { setGistToken, hasGistToken, testGistConnection, exportToGist, importFromGist } from '../storage/gist.js';
import { showToast } from '../utils/helpers.js';
import { refreshCurrentView } from '../app.js';

const CURRENCY_SYMBOLS = [
  { value: '₹', label: '₹ Rupee (INR)' },
  { value: '$', label: '$ Dollar (USD)' },
  { value: '€', label: '€ Euro (EUR)' },
  { value: '£', label: '£ Pound (GBP)' }
];

/**
 * Render settings page
 */
export function renderSettings() {
  const container = document.getElementById('settings-container');
  if (!container) return;
  
  const settings = getSettings();
  
  container.innerHTML = `
    <div class="settings-content">
      <!-- Currency Settings -->
      <div class="settings-section">
        <h3>Currency</h3>
        
        <div class="settings-item">
          <label for="currency-select" class="settings-item-label">Currency Symbol</label>
          <p class="settings-item-description">Select your preferred currency symbol</p>
          <select id="currency-select" class="form-select">
            ${CURRENCY_SYMBOLS.map(opt => `
              <option value="${opt.value}" ${settings.currencySymbol === opt.value ? 'selected' : ''}>
                ${opt.label}
              </option>
            `).join('')}
          </select>
        </div>
      </div>
      
      <!-- Profit Margin Settings -->
      <div class="settings-section">
        <h3>Profit Projections</h3>
        
        <div class="settings-item">
          <label for="default-margin" class="settings-item-label">Default Profit Margin (%)</label>
          <p class="settings-item-description">Used for profit projections and calculations</p>
          <input 
            type="number" 
            id="default-margin" 
            class="form-input" 
            value="${settings.defaultProfitMargin || 20}"
            min="0"
            max="100"
            step="0.1"
          />
        </div>
      </div>
      
      <!-- Analytics Settings -->
      <div class="settings-section">
        <h3>Analytics</h3>
        
        <div class="settings-item">
          <label class="settings-item-label">Advanced Analytics</label>
          <p class="settings-item-description">Enable detailed analytics and charts</p>
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              id="advanced-analytics" 
              ${settings.advancedAnalytics !== false ? 'checked' : ''}
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      
      <!-- Gist Sync Settings -->
      <div class="settings-section">
        <h3>GitHub Gist Sync</h3>
        
        <div class="settings-item">
          <label for="gist-token" class="settings-item-label">Personal Access Token</label>
          <p class="settings-item-description">
            Your GitHub token for syncing data to/from a private Gist. 
            Token is stored securely in localStorage and never logged.
          </p>
          <input 
            type="password" 
            id="gist-token" 
            class="form-input" 
            placeholder="${hasGistToken() ? '•••••••• (token configured)' : 'Enter GitHub token'}"
          />
          <div style="margin-top: 8px;">
            <button id="btn-test-gist" class="btn btn-secondary">Test Connection</button>
            <span id="gist-status" style="margin-left: 12px; color: var(--text-secondary);"></span>
          </div>
        </div>
        
        <div class="settings-item">
          <label class="settings-item-label">Sync Actions</label>
          <p class="settings-item-description">Export your data to Gist or import from Gist</p>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <button id="btn-export-gist" class="btn btn-primary">Export to Gist</button>
            <button id="btn-import-gist" class="btn btn-secondary">Import from Gist</button>
          </div>
        </div>
      </div>
      
      <!-- Data Management -->
      <div class="settings-section">
        <h3>Data Management</h3>
        
        <div class="settings-item">
          <label class="settings-item-label">Export/Import</label>
          <p class="settings-item-description">Backup or restore your data</p>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <button id="btn-export-json" class="btn btn-secondary">Export JSON</button>
            <button id="btn-import-json" class="btn btn-secondary">Import JSON</button>
          </div>
          <input type="file" id="import-file-input" accept=".json" style="display: none;" />
        </div>
      </div>
    </div>
  `;
  
  // Setup event listeners
  setupSettingsListeners();
}

/**
 * Setup settings event listeners
 */
function setupSettingsListeners() {
  // Currency select
  const currencySelect = document.getElementById('currency-select');
  if (currencySelect) {
    currencySelect.addEventListener('change', (e) => {
      saveSetting('currencySymbol', e.target.value);
      showToast('Currency symbol updated', 'success');
      refreshCurrentView();
    });
  }
  
  // Default margin
  const defaultMargin = document.getElementById('default-margin');
  if (defaultMargin) {
    defaultMargin.addEventListener('change', (e) => {
      const value = parseFloat(e.target.value);
      if (!isNaN(value) && value >= 0 && value <= 100) {
        saveSetting('defaultProfitMargin', value);
        showToast('Default margin updated', 'success');
      }
    });
  }
  
  // Advanced analytics toggle
  const advancedAnalytics = document.getElementById('advanced-analytics');
  if (advancedAnalytics) {
    advancedAnalytics.addEventListener('change', (e) => {
      saveSetting('advancedAnalytics', e.target.checked);
      showToast('Analytics settings updated', 'success');
      refreshCurrentView();
    });
  }
  
  // Gist token
  const gistToken = document.getElementById('gist-token');
  const btnTestGist = document.getElementById('btn-test-gist');
  const gistStatus = document.getElementById('gist-status');
  
  if (btnTestGist) {
    btnTestGist.addEventListener('click', async () => {
      const token = gistToken?.value.trim() || (hasGistToken() ? 'configured' : '');
      if (!token || token === 'configured') {
        const testResult = await testGistConnection();
        if (testResult.success) {
          gistStatus.textContent = `✓ Connected as ${testResult.username}`;
          gistStatus.style.color = 'var(--success)';
        } else {
          gistStatus.textContent = '✗ Connection failed';
          gistStatus.style.color = 'var(--error)';
        }
      } else {
        setGistToken(token);
        const testResult = await testGistConnection();
        if (testResult.success) {
          gistStatus.textContent = `✓ Connected as ${testResult.username}`;
          gistStatus.style.color = 'var(--success)';
          showToast('Token saved and verified', 'success');
        } else {
          gistStatus.textContent = '✗ Invalid token';
          gistStatus.style.color = 'var(--error)';
          showToast('Invalid token', 'error');
        }
      }
    });
  }
  
  if (gistToken) {
    gistToken.addEventListener('blur', () => {
      const token = gistToken.value.trim();
      if (token) {
        setGistToken(token);
        showToast('Token saved', 'success');
      }
    });
  }
  
  // Export to Gist
  const btnExportGist = document.getElementById('btn-export-gist');
  if (btnExportGist) {
    btnExportGist.addEventListener('click', async () => {
      try {
        btnExportGist.disabled = true;
        btnExportGist.textContent = 'Exporting...';
        await exportToGist();
      } catch (error) {
        console.error('Export error:', error);
      } finally {
        btnExportGist.disabled = false;
        btnExportGist.textContent = 'Export to Gist';
      }
    });
  }
  
  // Import from Gist
  const btnImportGist = document.getElementById('btn-import-gist');
  if (btnImportGist) {
    btnImportGist.addEventListener('click', async () => {
      try {
        btnImportGist.disabled = true;
        btnImportGist.textContent = 'Importing...';
        await importFromGist();
        refreshCurrentView();
      } catch (error) {
        console.error('Import error:', error);
      } finally {
        btnImportGist.disabled = false;
        btnImportGist.textContent = 'Import from Gist';
      }
    });
  }
  
  // Export JSON
  const btnExportJSON = document.getElementById('btn-export-json');
  if (btnExportJSON) {
    btnExportJSON.addEventListener('click', async () => {
      const { exportBikes } = await import('../storage/local.js');
      const data = exportBikes();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bike-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Data exported', 'success');
    });
  }
  
  // Import JSON
  const btnImportJSON = document.getElementById('btn-import-json');
  const fileInput = document.getElementById('import-file-input');
  if (btnImportJSON && fileInput) {
    btnImportJSON.addEventListener('click', () => {
      fileInput.click();
    });
    
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const { importBikes } = await import('../storage/local.js');
        const merge = confirm('Merge with existing data? (No = Replace all)');
        importBikes(text, merge);
        showToast('Data imported', 'success');
        refreshCurrentView();
      } catch (error) {
        console.error('Import error:', error);
        showToast('Failed to import data', 'error');
      } finally {
        fileInput.value = '';
      }
    });
  }
}

/**
 * Get settings from localStorage
 */
function getSettings() {
  try {
    return JSON.parse(localStorage.getItem('bikeManager_settings') || '{}');
  } catch {
    return {};
  }
}

/**
 * Save setting to localStorage
 */
function saveSetting(key, value) {
  try {
    const settings = getSettings();
    settings[key] = value;
    localStorage.setItem('bikeManager_settings', JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

