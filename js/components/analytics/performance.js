/**
 * BIKE MANAGER - PERFORMANCE ANALYTICS.JS
 * Performance insights tab
 */

import { 
  calculateProfit,
  calculateTotalInvestment,
  getPriceRangeCategory
} from '../../utils/financial.js';
import { formatCurrency, getCurrencySymbol } from '../../utils/helpers.js';

/**
 * Render performance analytics
 */
export function renderPerformanceAnalytics(bikes) {
  const container = document.getElementById('analytics-container');
  if (!container) return;
  
  const top5 = getTop5Profitable(bikes);
  const bottom5 = getBottom5Losses(bikes);
  const winners = getCategoryWinners(bikes);
  
  container.innerHTML = `
    <!-- Top 5 Profitable -->
    <div class="chart-container">
      <h4 class="chart-title">Top 5 Most Profitable</h4>
      <div id="top5-list"></div>
    </div>
    
    <!-- Bottom 5 Losses -->
    <div class="chart-container">
      <h4 class="chart-title">Bottom 5 Losses</h4>
      <div id="bottom5-list"></div>
    </div>
    
    <!-- Category Winners -->
    <div class="chart-container">
      <h4 class="chart-title">Best Performing Categories</h4>
      <div id="category-winners"></div>
    </div>
  `;
  
  renderTop5(top5);
  renderBottom5(bottom5);
  renderCategoryWinners(winners);
}

/**
 * Get top 5 profitable bikes
 */
function getTop5Profitable(bikes) {
  const soldBikes = bikes.filter(b => b.status === 'sold');
  return soldBikes
    .map(bike => ({
      ...bike,
      profit: calculateProfit(bike)
    }))
    .filter(b => b.profit !== null)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);
}

/**
 * Get bottom 5 losses
 */
function getBottom5Losses(bikes) {
  const soldBikes = bikes.filter(b => b.status === 'sold');
  return soldBikes
    .map(bike => ({
      ...bike,
      profit: calculateProfit(bike)
    }))
    .filter(b => b.profit !== null)
    .sort((a, b) => a.profit - b.profit)
    .slice(0, 5);
}

/**
 * Get category winners
 */
function getCategoryWinners(bikes) {
  const soldBikes = bikes.filter(b => b.status === 'sold');
  
  // By source
  const bySource = {};
  // By price range
  const byPriceRange = {};
  
  soldBikes.forEach(bike => {
    const profit = calculateProfit(bike);
    if (profit === null) return;
    
    // Source
    if (!bySource[bike.source]) {
      bySource[bike.source] = { total: 0, count: 0 };
    }
    bySource[bike.source].total += profit;
    bySource[bike.source].count++;
    
    // Price range
    const totalInvestment = calculateTotalInvestment(bike);
    const range = getPriceRangeCategory(totalInvestment);
    if (!byPriceRange[range]) {
      byPriceRange[range] = { total: 0, count: 0 };
    }
    byPriceRange[range].total += profit;
    byPriceRange[range].count++;
  });
  
  // Find best in each category
  let bestSource = null;
  let bestSourceAvg = -Infinity;
  Object.entries(bySource).forEach(([source, data]) => {
    const avg = data.total / data.count;
    if (avg > bestSourceAvg) {
      bestSourceAvg = avg;
      bestSource = { source, avg, count: data.count };
    }
  });
  
  let bestRange = null;
  let bestRangeAvg = -Infinity;
  Object.entries(byPriceRange).forEach(([range, data]) => {
    const avg = data.total / data.count;
    if (avg > bestRangeAvg) {
      bestRangeAvg = avg;
      bestRange = { range, avg, count: data.count };
    }
  });
  
  return { bestSource, bestRange };
}

/**
 * Render top 5 list
 */
function renderTop5(bikes) {
  const container = document.getElementById('top5-list');
  if (!container) return;
  
  const currency = getCurrencySymbol();
  
  container.innerHTML = bikes.map((bike, index) => {
    return `
      <div class="metric-card" style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 600;">#${index + 1} ${bike.model}</div>
            <div style="font-size: 0.875rem; color: var(--text-secondary);">
              ${bike.source} • ${formatCurrency(calculateTotalInvestment(bike), currency)} investment
            </div>
          </div>
          <div style="font-size: 1.25rem; font-weight: 700; color: var(--success);">
            ${formatCurrency(bike.profit, currency)}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render bottom 5 list
 */
function renderBottom5(bikes) {
  const container = document.getElementById('bottom5-list');
  if (!container) return;
  
  const currency = getCurrencySymbol();
  
  container.innerHTML = bikes.map((bike, index) => {
    return `
      <div class="metric-card" style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 600;">#${index + 1} ${bike.model}</div>
            <div style="font-size: 0.875rem; color: var(--text-secondary);">
              ${bike.source} • ${formatCurrency(calculateTotalInvestment(bike), currency)} investment
            </div>
          </div>
          <div style="font-size: 1.25rem; font-weight: 700; color: var(--error);">
            ${formatCurrency(bike.profit, currency)}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render category winners
 */
function renderCategoryWinners(winners) {
  const container = document.getElementById('category-winners');
  if (!container) return;
  
  const currency = getCurrencySymbol();
  
  container.innerHTML = `
    <div class="metric-cards">
      <div class="metric-card">
        <div class="metric-card-label">Best Source</div>
        <div class="metric-card-value">
          ${winners.bestSource ? 
            `${winners.bestSource.source}: ${formatCurrency(winners.bestSource.avg, currency)} avg (${winners.bestSource.count} sales)` : 
            '—'}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-card-label">Best Price Range</div>
        <div class="metric-card-value">
          ${winners.bestRange ? 
            `${winners.bestRange.range}: ${formatCurrency(winners.bestRange.avg, currency)} avg (${winners.bestRange.count} sales)` : 
            '—'}
        </div>
      </div>
    </div>
  `;
}

