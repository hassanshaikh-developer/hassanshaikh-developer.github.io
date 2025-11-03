/**
 * BIKE MANAGER - HELPERS.JS
 * Generic helper functions (formatting, validation, etc.)
 */

/**
 * Format currency value
 */
export function formatCurrency(value, currencySymbol = '₹') {
  if (value === null || value === undefined || isNaN(value)) return `${currencySymbol}0`;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `${currencySymbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Format percentage
 */
export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `${num.toFixed(decimals)}%`;
}

/**
 * Format date
 */
export function formatDate(dateString, format = 'short') {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  if (format === 'short') {
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } else if (format === 'long') {
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  } else if (format === 'iso') {
    return date.toISOString().split('T')[0];
  }
  
  return date.toLocaleDateString();
}

/**
 * Get currency symbol from settings
 */
export function getCurrencySymbol() {
  try {
    const settings = JSON.parse(localStorage.getItem('bikeManager_settings') || '{}');
    return settings.currencySymbol || '₹';
  } catch {
    return '₹';
  }
}

/**
 * Show toast notification
 */
export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'alert');
  
  const messageEl = document.createElement('div');
  messageEl.className = 'toast-message';
  messageEl.textContent = message;
  toast.appendChild(messageEl);
  
  container.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);
  
  // Remove after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}

/**
 * Validate bike form data
 */
export function validateBikeForm(formData) {
  const errors = [];
  
  if (!formData.model || formData.model.trim() === '') {
    errors.push('Model is required');
  }
  
  if (!formData.source || !['Dealer', 'Owner', 'Auction'].includes(formData.source)) {
    errors.push('Valid source is required');
  }
  
  if (!formData.purchaseDate) {
    errors.push('Purchase date is required');
  }
  
  const purchasePrice = parseFloat(formData.purchasePrice);
  if (isNaN(purchasePrice) || purchasePrice <= 0) {
    errors.push('Valid purchase price is required');
  }
  
  if (formData.status === 'sold') {
    if (!formData.sellingDate) {
      errors.push('Selling date is required for sold bikes');
    }
    
    const sellingPrice = parseFloat(formData.sellingPrice);
    if (isNaN(sellingPrice) || sellingPrice <= 0) {
      errors.push('Valid selling price is required for sold bikes');
    }
  }
  
  const repairCost = parseFloat(formData.repairCost || 0);
  if (isNaN(repairCost) || repairCost < 0) {
    errors.push('Repair cost must be a valid number');
  }
  
  const otherExpenses = parseFloat(formData.otherExpenses || 0);
  if (isNaN(otherExpenses) || otherExpenses < 0) {
    errors.push('Other expenses must be a valid number');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate unique ID
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Safe parse JSON
 */
export function safeParseJSON(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

/**
 * Handle divide by zero gracefully
 */
export function safeDivide(numerator, denominator, defaultValue = 0) {
  if (!denominator || denominator === 0 || isNaN(denominator)) {
    return defaultValue;
  }
  const result = numerator / denominator;
  return isNaN(result) ? defaultValue : result;
}

/**
 * Get month name from number (1-12)
 */
export function getMonthName(monthNum) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNum - 1] || '';
}

/**
 * Get month abbreviation
 */
export function getMonthAbbr(monthNum) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[monthNum - 1] || '';
}

/**
 * Format date range string
 */
export function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) return '';
  const start = formatDate(startDate, 'short');
  const end = formatDate(endDate, 'short');
  return `${start} - ${end}`;
}

/**
 * Compare dates (for sorting)
 */
export function compareDates(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1 - d2;
}

/**
 * Get trend indicator (up/down/neutral)
 */
export function getTrendIndicator(current, previous) {
  if (previous === null || previous === undefined || previous === 0) return 'neutral';
  const diff = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(diff) < 0.01) return 'neutral';
  return diff > 0 ? 'positive' : 'negative';
}

/**
 * Format trend text with arrow
 */
export function formatTrend(current, previous) {
  const trend = getTrendIndicator(current, previous);
  const diff = previous !== null && previous !== undefined ? current - previous : 0;
  const currency = getCurrencySymbol();
  
  if (trend === 'positive') {
    return `↑ ${formatCurrency(Math.abs(diff), currency)}`;
  } else if (trend === 'negative') {
    return `↓ ${formatCurrency(Math.abs(diff), currency)}`;
  } else {
    return '—';
  }
}

/**
 * Clone object deeply
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Sleep/delay utility
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if value is empty
 */
export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

