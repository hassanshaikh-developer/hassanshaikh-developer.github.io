/**
 * BIKE MANAGER - ANALYTICS.JS
 * Analytics tabs and charts component
 */

import { renderKeyInsights } from './analytics/keyInsights.js';
import { renderFinancialAnalytics } from './analytics/financial.js';
import { renderInventoryAnalytics } from './analytics/inventory.js';
import { renderPerformanceAnalytics } from './analytics/performance.js';

// Export functions that need to be imported elsewhere
export { renderKeyInsights, renderFinancialAnalytics, renderInventoryAnalytics, renderPerformanceAnalytics };

/**
 * Render analytics view
 */
export function renderAnalytics(bikes, activeTab = 'financial') {
  const container = document.getElementById('analytics-container');
  const keyInsightsPanel = document.getElementById('key-insights-panel');
  
  if (!container || !keyInsightsPanel) return;
  
  // Always render key insights
  renderKeyInsights(bikes);
  
  // Render active tab
  switch (activeTab) {
    case 'financial':
      renderFinancialAnalytics(bikes);
      break;
    case 'inventory':
      renderInventoryAnalytics(bikes);
      break;
    case 'performance':
      renderPerformanceAnalytics(bikes);
      break;
    default:
      renderFinancialAnalytics(bikes);
  }
}

