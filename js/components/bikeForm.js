/**
 * BIKE MANAGER - BIKE FORM.JS
 * Add/edit bike form component
 */

import { addBike, updateBike } from '../storage/local.js';
import { validateBikeForm } from '../utils/helpers.js';
import { 
  calculateTotalInvestment, 
  calculateProfit, 
  calculateMarginPercent, 
  calculateDaysHeld,
  getBikeDerivedFields 
} from '../utils/financial.js';
import { formatCurrency, formatPercent, formatDate, getCurrencySymbol } from '../utils/helpers.js';

/**
 * Render bike form in modal
 */
export function renderBikeForm(bike = null, onSuccess = null) {
  const container = document.getElementById('bike-form-container');
  if (!container) return;
  
  const isEdit = !!bike;
  const currency = getCurrencySymbol();
  
  container.innerHTML = `
    <form id="bike-form" class="bike-form">
      <div class="form-group">
        <label for="bike-model" class="form-label">Model *</label>
        <input 
          type="text" 
          id="bike-model" 
          class="form-input" 
          placeholder="e.g., Hero Splendor"
          value="${bike?.model || ''}"
          required
        />
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="bike-source" class="form-label">Source *</label>
          <select id="bike-source" class="form-select" required>
            <option value="Dealer" ${bike?.source === 'Dealer' ? 'selected' : ''}>Dealer</option>
            <option value="Owner" ${bike?.source === 'Owner' ? 'selected' : ''}>Owner</option>
            <option value="Auction" ${bike?.source === 'Auction' ? 'selected' : ''}>Auction</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="bike-status" class="form-label">Status *</label>
          <select id="bike-status" class="form-select" required>
            <option value="unsold" ${(!bike || bike.status === 'unsold') ? 'selected' : ''}>Unsold</option>
            <option value="sold" ${bike?.status === 'sold' ? 'selected' : ''}>Sold</option>
          </select>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="bike-purchase-date" class="form-label">Purchase Date *</label>
          <input 
            type="date" 
            id="bike-purchase-date" 
            class="form-input" 
            value="${bike?.purchaseDate ? formatDate(bike.purchaseDate, 'iso') : ''}"
            required
          />
        </div>
        
        <div class="form-group" id="selling-date-group" style="${bike?.status === 'sold' ? '' : 'display: none;'}">
          <label for="bike-selling-date" class="form-label">Selling Date *</label>
          <input 
            type="date" 
            id="bike-selling-date" 
            class="form-input" 
            value="${bike?.sellingDate ? formatDate(bike.sellingDate, 'iso') : ''}"
          />
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="bike-purchase-price" class="form-label">Purchase Price ${currency} *</label>
          <input 
            type="number" 
            id="bike-purchase-price" 
            class="form-input" 
            placeholder="0"
            value="${bike?.purchasePrice || ''}"
            min="0"
            step="100"
            required
          />
        </div>
        
        <div class="form-group">
          <label for="bike-repair-cost" class="form-label">Repair Cost ${currency}</label>
          <input 
            type="number" 
            id="bike-repair-cost" 
            class="form-input" 
            placeholder="0"
            value="${bike?.repairCost || ''}"
            min="0"
            step="100"
          />
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="bike-other-expenses" class="form-label">Other Expenses ${currency}</label>
          <input 
            type="number" 
            id="bike-other-expenses" 
            class="form-input" 
            placeholder="0"
            value="${bike?.otherExpenses || ''}"
            min="0"
            step="100"
          />
        </div>
        
        <div class="form-group" id="selling-price-group" style="${bike?.status === 'sold' ? '' : 'display: none;'}">
          <label for="bike-selling-price" class="form-label">Selling Price ${currency} *</label>
          <input 
            type="number" 
            id="bike-selling-price" 
            class="form-input" 
            placeholder="0"
            value="${bike?.sellingPrice || ''}"
            min="0"
            step="100"
          />
        </div>
      </div>
      
      <div class="form-group">
        <label for="bike-notes" class="form-label">Notes</label>
        <textarea 
          id="bike-notes" 
          class="form-textarea" 
          placeholder="Additional notes..."
          rows="3"
        >${bike?.notes || ''}</textarea>
      </div>
      
      <div class="form-preview" id="form-preview">
        <div class="form-preview-label">Live Preview</div>
        <div class="form-preview-grid" id="preview-grid"></div>
      </div>
      
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="btn-cancel">Cancel</button>
        <button type="submit" class="btn btn-primary" id="btn-submit">
          ${isEdit ? 'Update' : 'Add'} Bike
        </button>
      </div>
    </form>
  `;
  
  // Setup form handlers
  setupFormHandlers(bike, onSuccess);
}

/**
 * Setup form event handlers
 */
function setupFormHandlers(bike, onSuccess) {
  const form = document.getElementById('bike-form');
  const statusSelect = document.getElementById('bike-status');
  const sellingDateGroup = document.getElementById('selling-date-group');
  const sellingPriceGroup = document.getElementById('selling-price-group');
  const cancelBtn = document.getElementById('btn-cancel');
  
  // Toggle selling date/price based on status
  statusSelect.addEventListener('change', (e) => {
    const isSold = e.target.value === 'sold';
    sellingDateGroup.style.display = isSold ? 'block' : 'none';
    sellingPriceGroup.style.display = isSold ? 'block' : 'none';
    
    if (!isSold) {
      document.getElementById('bike-selling-date').value = '';
      document.getElementById('bike-selling-price').value = '';
    }
    
    updatePreview();
  });
  
  // Live preview updates
  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    input.addEventListener('input', updatePreview);
    input.addEventListener('change', updatePreview);
  });
  
  // Cancel button
  cancelBtn.addEventListener('click', () => {
    const modal = document.getElementById('bike-modal');
    if (modal) {
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  });
  
  // Form submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleFormSubmit(bike, onSuccess);
  });
  
  // Initial preview
  updatePreview();
}

/**
 * Update live preview
 */
function updatePreview() {
  const previewGrid = document.getElementById('preview-grid');
  if (!previewGrid) return;
  
  const formData = getFormData();
  if (!formData) {
    previewGrid.innerHTML = '<div class="form-preview-item">Fill the form to see preview</div>';
    return;
  }
  
  const totalInvestment = calculateTotalInvestment(formData);
  const profit = formData.status === 'sold' ? calculateProfit(formData) : null;
  const margin = formData.status === 'sold' ? calculateMarginPercent(formData) : null;
  const days = calculateDaysHeld(formData);
  const currency = getCurrencySymbol();
  
  previewGrid.innerHTML = `
    <div class="form-preview-item">
      <div class="form-preview-item-label">Total Investment</div>
      <div class="form-preview-item-value">${formatCurrency(totalInvestment, currency)}</div>
    </div>
    ${profit !== null ? `
    <div class="form-preview-item">
      <div class="form-preview-item-label">Profit</div>
      <div class="form-preview-item-value ${profit >= 0 ? 'profit' : 'loss'}">${formatCurrency(profit, currency)}</div>
    </div>
    ` : ''}
    ${margin !== null ? `
    <div class="form-preview-item">
      <div class="form-preview-item-label">Margin</div>
      <div class="form-preview-item-value ${margin >= 0 ? 'profit' : 'loss'}">${formatPercent(margin)}</div>
    </div>
    ` : ''}
    ${days !== null ? `
    <div class="form-preview-item">
      <div class="form-preview-item-label">Days Held</div>
      <div class="form-preview-item-value">${days} days</div>
    </div>
    ` : ''}
  `;
}

/**
 * Get form data
 */
function getFormData() {
  return {
    model: document.getElementById('bike-model')?.value.trim() || '',
    source: document.getElementById('bike-source')?.value || '',
    status: document.getElementById('bike-status')?.value || 'unsold',
    purchaseDate: document.getElementById('bike-purchase-date')?.value || '',
    sellingDate: document.getElementById('bike-selling-date')?.value || '',
    purchasePrice: document.getElementById('bike-purchase-price')?.value || '0',
    repairCost: document.getElementById('bike-repair-cost')?.value || '0',
    otherExpenses: document.getElementById('bike-other-expenses')?.value || '0',
    sellingPrice: document.getElementById('bike-selling-price')?.value || '0',
    notes: document.getElementById('bike-notes')?.value.trim() || ''
  };
}

/**
 * Handle form submission
 */
function handleFormSubmit(bike, onSuccess) {
  const formData = getFormData();
  
  // Validate
  const validation = validateBikeForm(formData);
  if (!validation.valid) {
    alert(validation.errors.join('\n'));
    return;
  }
  
  try {
    if (bike) {
      // Update existing
      updateBike(bike.id, formData);
    } else {
      // Add new
      addBike(formData);
    }
    
    if (onSuccess) {
      onSuccess();
    }
  } catch (error) {
    console.error('Form submission error:', error);
    alert('Failed to save bike: ' + error.message);
  }
}

