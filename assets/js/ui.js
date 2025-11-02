/**
 * UI Module
 * Handles all UI rendering, toast notifications, modals, and DOM interactions
 */

/**
 * Utility function to escape HTML
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format currency value
 */
export function formatCurrency(value, currency = '₹') {
  return (value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Toast Notification System using Web Animations API
 */
export class ToastManager {
  constructor() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      this.container.id = 'toast-container';
      this.container.setAttribute('role', 'region');
      this.container.setAttribute('aria-live', 'polite');
      document.body.appendChild(this.container);
    }
  }

  show(message, type = 'info', duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');
    
    toast.innerHTML = `
      <span class="toast-message">${escapeHtml(message)}</span>
      <span class="toast-close" aria-label="Close">×</span>
    `;
    
    this.container.appendChild(toast);
    
    // Animate in using Web Animations API
    toast.animate([
      { transform: 'translateY(20px)', opacity: 0 },
      { transform: 'translateY(0)', opacity: 1 }
    ], {
      duration: 300,
      easing: 'ease-out',
      fill: 'forwards'
    });
    
    const timer = setTimeout(() => {
      this.remove(toast);
    }, duration);
    
    toast.querySelector('.toast-close').addEventListener('click', () => {
      clearTimeout(timer);
      this.remove(toast);
    });
    
    return toast;
  }

  showWithUndo(message, undoCallback, duration = 8000) {
    const toast = document.createElement('div');
    toast.className = 'toast undo';
    toast.setAttribute('role', 'alert');
    
    toast.innerHTML = `
      <span class="toast-message">${escapeHtml(message)}</span>
      <button class="toast-action">Undo</button>
      <span class="toast-close" aria-label="Close">×</span>
    `;
    
    this.container.appendChild(toast);
    
    // Animate in
    toast.animate([
      { transform: 'translateY(20px)', opacity: 0 },
      { transform: 'translateY(0)', opacity: 1 }
    ], {
      duration: 300,
      easing: 'ease-out',
      fill: 'forwards'
    });
    
    const timer = setTimeout(() => {
      this.remove(toast);
    }, duration);
    
    toast.querySelector('.toast-action').addEventListener('click', async () => {
      clearTimeout(timer);
      this.remove(toast);
      if (undoCallback) await undoCallback();
    });
    
    toast.querySelector('.toast-close').addEventListener('click', () => {
      clearTimeout(timer);
      this.remove(toast);
    });
    
    return toast;
  }

  remove(toast) {
    if (!toast || !toast.parentNode) return;
    
    // Animate out
    toast.animate([
      { transform: 'translateY(0)', opacity: 1 },
      { transform: 'translateY(-20px)', opacity: 0 }
    ], {
      duration: 200,
      easing: 'ease-in',
      fill: 'forwards'
    }).onfinish = () => {
      toast.remove();
    };
  }
}

/**
 * Modal Manager
 */
export class ModalManager {
  constructor() {
    this.activeModal = null;
    this.focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    this.initFocusTrap();
  }

  initFocusTrap() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.close(this.activeModal);
      }
      
      if (e.key === 'Tab' && this.activeModal) {
        this.trapFocus(e);
      }
    });
  }

  open(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    this.activeModal = modal;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    
    // Focus first focusable element
    const firstFocusable = modal.querySelector(this.focusableElements);
    if (firstFocusable) {
      setTimeout(() => firstFocusable.focus(), 100);
    }
    
    // Prevent body scroll on mobile
    document.body.style.overflow = 'hidden';
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.close(modal);
      }
    }, { once: true });
  }

  close(modalElement = null) {
    const modal = modalElement || this.activeModal;
    if (!modal) return;
    
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    
    if (modal === this.activeModal) {
      this.activeModal = null;
    }
  }

  trapFocus(e) {
    const modal = this.activeModal;
    if (!modal) return;
    
    const focusableElements = Array.from(modal.querySelectorAll(this.focusableElements));
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }
}

/**
 * Search Suggestions with fuzzy matching
 */
export class SearchSuggestions {
  constructor(inputElement, suggestionsElement, onSelect) {
    this.input = inputElement;
    this.suggestionsEl = suggestionsElement;
    this.onSelect = onSelect;
    this.allBikes = [];
    this.init();
  }

  init() {
    this.input.addEventListener('input', () => this.handleInput());
    this.input.addEventListener('focus', () => {
      if (this.input.value) {
        this.showSuggestions();
      }
    });
    
    document.addEventListener('click', (e) => {
      if (!this.input.contains(e.target) && !this.suggestionsEl.contains(e.target)) {
        this.hideSuggestions();
      }
    });
  }

  updateBikes(bikes) {
    this.allBikes = bikes;
  }

  fuzzyMatch(query, text) {
    if (!query || !text) return false;
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    return t.includes(q) || this.levenshteinDistance(q, t) <= 2;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  handleInput() {
    const query = this.input.value.trim();
    if (query.length < 2) {
      this.hideSuggestions();
      return;
    }
    this.showSuggestions();
  }

  showSuggestions() {
    const query = this.input.value.trim().toLowerCase();
    if (!query || query.length < 1) {
      this.hideSuggestions();
      return;
    }

    const matches = this.allBikes
      .filter(bike => 
        !bike._deleted && (
          this.fuzzyMatch(query, bike.no) || 
          this.fuzzyMatch(query, bike.owner)
        )
      )
      .slice(0, 5);

    if (matches.length === 0) {
      this.hideSuggestions();
      return;
    }

    this.suggestionsEl.innerHTML = matches.map(bike => `
      <div class="search-suggestion" data-id="${bike._id}">
        <div class="suggestion-plate">${escapeHtml(bike.no)}</div>
        <div class="suggestion-owner">${escapeHtml(bike.owner)}</div>
      </div>
    `).join('');

    this.suggestionsEl.classList.remove('hidden');
    
    // Add click handlers
    this.suggestionsEl.querySelectorAll('.search-suggestion').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        if (this.onSelect && id) {
          this.onSelect(Number(id));
        }
        this.hideSuggestions();
      });
    });
  }

  hideSuggestions() {
    this.suggestionsEl.classList.add('hidden');
  }
}

/**
 * Debounce utility
 */
export function debounce(func, delay, immediate = false) {
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

/**
 * Vibrate utility (for mobile)
 */
export function vibrate(duration) {
  if ('vibrate' in navigator) {
    navigator.vibrate(duration);
  }
}

/**
 * Download file utility
 */
export function downloadFile(content, fileName, contentType) {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Export singleton instances
export const toastManager = new ToastManager();
export const modalManager = new ModalManager();

