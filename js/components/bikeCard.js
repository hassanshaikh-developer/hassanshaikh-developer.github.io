/**
 * BIKE MANAGER - BIKE CARD.JS
 * Bike card UI component
 */

import { deleteBike, getBikeById, addBike, updateBike } from '../storage/local.js';
import { 
  calculateTotalInvestment, 
  calculateProfit, 
  calculateMarginPercent, 
  calculateDaysHeld,
  getAgingCategory 
} from '../utils/financial.js';
import { formatCurrency, formatPercent, formatDate, getCurrencySymbol, showToast } from '../utils/helpers.js';
import { refreshCurrentView } from '../app.js';

/**
 * Render bike list with filters
 */
export function renderBikeList(bikes, filters) {
  const container = document.getElementById('bikes-container');
  if (!container) return;
  
  // Apply filters and sorting
  let filteredBikes = applyFilters(bikes, filters);
  
  if (filteredBikes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🏍️</div>
        <div class="empty-state-message">No bikes found</div>
        <div class="empty-state-hint">Try adjusting your filters or add a new bike</div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = filteredBikes.map(bike => renderBikeCardHTML(bike)).join('');
  
  // Setup card event listeners
  setupCardListeners();
}

/**
 * Render single bike card HTML
 */
function renderBikeCardHTML(bike) {
  const currency = getCurrencySymbol();
  const totalInvestment = calculateTotalInvestment(bike);
  const profit = bike.status === 'sold' ? calculateProfit(bike) : null;
  const margin = bike.status === 'sold' ? calculateMarginPercent(bike) : null;
  const days = calculateDaysHeld(bike);
  const aging = getAgingCategory(days);
  
  const agingEmoji = {
    green: '🟢',
    yellow: '🟡',
    orange: '🟠',
    red: '🔴'
  }[aging] || '⚪';
  
  return `
    <div class="bike-card" data-bike-id="${bike.id}">
      <div class="bike-card-header">
        <div class="bike-model">${bike.model || 'Unknown Model'}</div>
        <span class="bike-status-badge ${bike.status}">${bike.status}</span>
      </div>
      
      <div class="bike-info">
        <div class="bike-info-row">
          <span>Source:</span>
          <span>${bike.source || '—'}</span>
        </div>
        <div class="bike-info-row">
          <span>Purchased:</span>
          <span>${formatDate(bike.purchaseDate)}</span>
        </div>
        ${bike.sellingDate ? `
        <div class="bike-info-row">
          <span>Sold:</span>
          <span>${formatDate(bike.sellingDate)}</span>
        </div>
        ` : ''}
        <div class="bike-info-row">
          <span>Aging:</span>
          <span class="bike-aging-indicator aging-${aging}">
            ${agingEmoji} ${days !== null ? `${days} days` : '—'}
          </span>
        </div>
      </div>
      
      <div class="bike-financial">
        ${bike.status === 'sold' && profit !== null ? `
          <div class="bike-financial-value ${profit >= 0 ? 'profit' : 'loss'}">
            ${profit >= 0 ? 'Profit' : 'Loss'}: ${formatCurrency(profit, currency)}
            ${margin !== null ? ` (${formatPercent(margin)})` : ''}
          </div>
        ` : `
          <div class="bike-financial-value investment">
            Investment: ${formatCurrency(totalInvestment, currency)}
          </div>
        `}
      </div>
      
      <div class="bike-actions">
        <button class="btn btn-icon btn-edit" data-action="edit" aria-label="Edit bike">
          ✏️
        </button>
        ${bike.status === 'unsold' ? `
        <button class="btn btn-icon btn-sell" data-action="sell" aria-label="Mark as sold">
          ✅
        </button>
        ` : ''}
        <button class="btn btn-icon btn-duplicate" data-action="duplicate" aria-label="Duplicate bike">
          📋
        </button>
        <button class="btn btn-icon btn-delete" data-action="delete" aria-label="Delete bike">
          🗑️
        </button>
      </div>
      
      <div class="bike-card-expanded" style="display: none;">
        <div class="bike-info">
          <div class="bike-info-row">
            <span>Purchase Price:</span>
            <span>${formatCurrency(parseFloat(bike.purchasePrice) || 0, currency)}</span>
          </div>
          <div class="bike-info-row">
            <span>Repair Cost:</span>
            <span>${formatCurrency(parseFloat(bike.repairCost) || 0, currency)}</span>
          </div>
          <div class="bike-info-row">
            <span>Other Expenses:</span>
            <span>${formatCurrency(parseFloat(bike.otherExpenses) || 0, currency)}</span>
          </div>
          <div class="bike-info-row">
            <span>Total Investment:</span>
            <span>${formatCurrency(totalInvestment, currency)}</span>
          </div>
          ${bike.sellingPrice ? `
          <div class="bike-info-row">
            <span>Selling Price:</span>
            <span>${formatCurrency(parseFloat(bike.sellingPrice) || 0, currency)}</span>
          </div>
          ` : ''}
          ${bike.notes ? `
          <div class="bike-info-row">
            <span>Notes:</span>
            <span>${bike.notes}</span>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * Setup card event listeners
 */
function setupCardListeners() {
  const cards = document.querySelectorAll('.bike-card');
  
  cards.forEach(card => {
    const bikeId = card.dataset.bikeId;
    
    // Expand/collapse on click (but not on button clicks)
    card.addEventListener('click', (e) => {
      if (e.target.closest('.bike-actions')) return;
      if (e.target.closest('button')) return;
      
      const expanded = card.querySelector('.bike-card-expanded');
      if (expanded) {
        const isVisible = expanded.style.display !== 'none';
        expanded.style.display = isVisible ? 'none' : 'block';
      }
    });
    
    // Action buttons
    const editBtn = card.querySelector('[data-action="edit"]');
    const sellBtn = card.querySelector('[data-action="sell"]');
    const duplicateBtn = card.querySelector('[data-action="duplicate"]');
    const deleteBtn = card.querySelector('[data-action="delete"]');
    
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.openBikeModal) {
          window.openBikeModal(bikeId);
        }
      });
    }
    
    if (sellBtn) {
      sellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleMarkSold(bikeId);
      });
    }
    
    if (duplicateBtn) {
      duplicateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDuplicate(bikeId);
      });
    }
    
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDelete(bikeId);
      });
    }
  });
}

/**
 * Handle mark as sold
 */
function handleMarkSold(bikeId) {
  const sellingPrice = prompt('Enter selling price:');
  if (!sellingPrice || isNaN(parseFloat(sellingPrice))) {
    return;
  }
  
  const sellingDate = prompt('Enter selling date (YYYY-MM-DD):');
  if (!sellingDate) {
    return;
  }
  
  try {
    updateBike(bikeId, {
      status: 'sold',
      sellingPrice: parseFloat(sellingPrice),
      sellingDate: sellingDate
    });
    
    showToast('Bike marked as sold', 'success');
    refreshCurrentView();
  } catch (error) {
    console.error('Error marking as sold:', error);
    showToast('Failed to update bike', 'error');
  }
}

/**
 * Handle duplicate bike
 */
function handleDuplicate(bikeId) {
  try {
    const bike = getBikeById(bikeId);
    if (!bike) return;
    
    const newBike = {
      ...bike,
      status: 'unsold',
      sellingDate: '',
      sellingPrice: 0
    };
    
    addBike(newBike);
    showToast('Bike duplicated', 'success');
    refreshCurrentView();
  } catch (error) {
    console.error('Error duplicating bike:', error);
    showToast('Failed to duplicate bike', 'error');
  }
}

/**
 * Handle delete bike
 */
function handleDelete(bikeId) {
  if (!confirm('Are you sure you want to delete this bike?')) {
    return;
  }
  
  try {
    deleteBike(bikeId);
    showToast('Bike deleted', 'success');
    refreshCurrentView();
  } catch (error) {
    console.error('Error deleting bike:', error);
    showToast('Failed to delete bike', 'error');
  }
}

/**
 * Apply filters and sorting
 */
function applyFilters(bikes, filters) {
  let result = [...bikes];
  
  // Apply active filters
  if (filters.activeFilters && filters.activeFilters.length > 0) {
    filters.activeFilters.forEach(filter => {
      switch (filter) {
        case 'high-value':
          result = result.filter(b => calculateTotalInvestment(b) > 50000);
          break;
        case 'profitable':
          result = result.filter(b => {
            if (b.status !== 'sold') return false;
            const profit = calculateProfit(b);
            return profit !== null && profit > 0;
          });
          break;
        case 'unsold':
          result = result.filter(b => b.status === 'unsold');
          break;
        case 'source-dealer':
          result = result.filter(b => b.source === 'Dealer');
          break;
        case 'source-owner':
          result = result.filter(b => b.source === 'Owner');
          break;
        case 'source-auction':
          result = result.filter(b => b.source === 'Auction');
          break;
      }
    });
  }
  
  // Apply sorting
  switch (filters.sortBy) {
    case 'highest-profit':
      result.sort((a, b) => {
        const profitA = a.status === 'sold' ? calculateProfit(a) : -Infinity;
        const profitB = b.status === 'sold' ? calculateProfit(b) : -Infinity;
        return (profitB || -Infinity) - (profitA || -Infinity);
      });
      break;
    case 'lowest-profit':
      result.sort((a, b) => {
        const profitA = a.status === 'sold' ? calculateProfit(a) : Infinity;
        const profitB = b.status === 'sold' ? calculateProfit(b) : Infinity;
        return (profitA || Infinity) - (profitB || Infinity);
      });
      break;
    case 'longest-held':
      result.sort((a, b) => {
        const daysA = calculateDaysHeld(a) || 0;
        const daysB = calculateDaysHeld(b) || 0;
        return daysB - daysA;
      });
      break;
    case 'newest':
      result.sort((a, b) => {
        const dateA = new Date(a.purchaseDate || 0);
        const dateB = new Date(b.purchaseDate || 0);
        return dateB - dateA;
      });
      break;
    case 'oldest':
      result.sort((a, b) => {
        const dateA = new Date(a.purchaseDate || 0);
        const dateB = new Date(b.purchaseDate || 0);
        return dateA - dateB;
      });
      break;
    default:
      // Default: newest first
      result.sort((a, b) => {
        const dateA = new Date(a.purchaseDate || 0);
        const dateB = new Date(b.purchaseDate || 0);
        return dateB - dateA;
      });
  }
  
  return result;
}

/**
 * Export function for rendering single card (if needed)
 */
export { renderBikeCardHTML };

