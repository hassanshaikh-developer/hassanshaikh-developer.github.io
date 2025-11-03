/**
 * BIKE MANAGER - APP.JS
 * Main entry point: routing, tab navigation, initialization
 */

import { loadBikes, getBikes } from './storage/local.js';
import { renderDashboard } from './components/dashboard.js';
import { renderBikeList, renderBikeCard } from './components/bikeCard.js';
import { renderBikeForm } from './components/bikeForm.js';
import { renderFilters } from './components/filters.js';
import { renderAnalytics } from './components/analytics.js';
import { renderSettings } from './components/settings.js';
import { showToast } from './utils/helpers.js';

// App state
const appState = {
  currentView: 'dashboard',
  currentTab: 'financial',
  bikes: [],
  filters: {
    sortBy: 'newest',
    activeFilters: []
  }
};

// Initialize app
async function init() {
  try {
    // Load bikes from localStorage
    await loadBikes();
    appState.bikes = getBikes();
    
    // Setup navigation
    setupNavigation();
    
    // Setup bike form modal
    setupBikeModal();
    
    // Setup view change handlers
    setupViewHandlers();
    
    // Render initial view
    showView('dashboard');
    
    // Load persisted filters
    loadPersistedFilters();
    
    showToast('App loaded successfully', 'success');
  } catch (error) {
    console.error('Initialization error:', error);
    showToast('Failed to initialize app', 'error');
  }
}

// Setup navigation buttons
function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      showView(view);
      
      // Update active nav button
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  
  // Set initial active button
  const initialBtn = document.querySelector(`.nav-btn[data-view="${appState.currentView}"]`);
  if (initialBtn) {
    initialBtn.classList.add('active');
  }
}

// Show a specific view
function showView(viewName) {
  // Hide all views
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });
  
  // Show target view
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) {
    targetView.classList.add('active');
    appState.currentView = viewName;
    
    // Render view content
    renderViewContent(viewName);
  }
}

// Render content for a specific view
async function renderViewContent(viewName) {
  const bikes = getBikes();
  
  switch (viewName) {
    case 'dashboard':
      await renderDashboard(bikes);
      break;
      
    case 'bikes':
      // Render filters
      renderFilters(appState.filters, (newFilters) => {
        appState.filters = newFilters;
        savePersistedFilters();
        renderBikeList(bikes, newFilters);
      });
      
      // Render bike list
      renderBikeList(bikes, appState.filters);
      break;
      
    case 'analytics':
      renderAnalytics(bikes, appState.currentTab);
      break;
      
    case 'settings':
      renderSettings();
      break;
      
    default:
      console.warn(`Unknown view: ${viewName}`);
  }
}

// Setup bike form modal
function setupBikeModal() {
  const modal = document.getElementById('bike-modal');
  const closeBtn = modal.querySelector('.modal-close');
  const addBikeBtn = document.getElementById('btn-add-bike');
  
  // Close modal
  function closeModal() {
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  
  // Open modal
  function openModal(bikeId = null) {
    const bike = bikeId ? getBikes().find(b => b.id === bikeId) : null;
    renderBikeForm(bike, () => {
      closeModal();
      // Refresh current view
      renderViewContent(appState.currentView);
      showToast(bike ? 'Bike updated' : 'Bike added', 'success');
    });
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Update modal title
    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) {
      modalTitle.textContent = bike ? 'Edit Bike' : 'Add Bike';
    }
  }
  
  // Event listeners
  closeBtn.addEventListener('click', closeModal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // ESC key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
      closeModal();
    }
  });
  
  // Add bike button
  if (addBikeBtn) {
    addBikeBtn.addEventListener('click', () => openModal());
  }
  
  // Expose openModal globally for bike cards
  window.openBikeModal = openModal;
}

// Setup view-specific handlers
function setupViewHandlers() {
  // Analytics tab switching
  const analyticsTabs = document.querySelectorAll('.analytics-tab');
  analyticsTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      
      // Update active tab
      analyticsTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Update state and render
      appState.currentTab = tabName;
      const bikes = getBikes();
      renderAnalytics(bikes, tabName);
    });
  });
  
  // Set initial active analytics tab
  const initialTab = document.querySelector(`.analytics-tab[data-tab="${appState.currentTab}"]`);
  if (initialTab) {
    initialTab.classList.add('active');
  }
}

// Load persisted filters from localStorage
function loadPersistedFilters() {
  try {
    const saved = localStorage.getItem('bikeManager_filters');
    if (saved) {
      const parsed = JSON.parse(saved);
      appState.filters = {
        ...appState.filters,
        ...parsed
      };
    }
  } catch (error) {
    console.warn('Failed to load persisted filters:', error);
  }
}

// Save filters to localStorage
function savePersistedFilters() {
  try {
    localStorage.setItem('bikeManager_filters', JSON.stringify(appState.filters));
  } catch (error) {
    console.warn('Failed to save persisted filters:', error);
  }
}

// Refresh current view (called after data changes)
export function refreshCurrentView() {
  renderViewContent(appState.currentView);
}

// Get current app state
export function getAppState() {
  return { ...appState };
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

