/**
 * BIKE MANAGER - INVENTORY ANALYTICS.JS
 * Inventory intelligence tab
 */

import { renderAgingDonutChart } from '../../charts/chartRender.js';
import { 
  calculateDaysHeld,
  getAgingCategory,
  calculateTurnoverRate,
  calculateSuccessRate,
  calculateTotalInvestment,
  calculateProfit
} from '../../utils/financial.js';
import { formatCurrency, formatPercent, getCurrencySymbol } from '../../utils/helpers.js';

/**
 * Render inventory analytics
 */
export function renderInventoryAnalytics(bikes) {
  const container = document.getElementById('analytics-container');
  if (!container) return;
  
  // Calculate aging distribution
  const agingData = getAgingDistribution(bikes);
  const actionRequired = getActionRequired(bikes);
  const quickSellers = getQuickSellers(bikes);
  const metrics = getInventoryMetrics(bikes);
  
  container.innerHTML = `
    <!-- Aging Donut Chart -->
    <div class="chart-container">
      <h4 class="chart-title">Inventory Aging Distribution</h4>
      <div class="chart-wrapper">
        <canvas id="aging-donut-chart"></canvas>
      </div>
    </div>
    
    <!-- Metrics -->
    <div class="metric-cards">
      <div class="metric-card">
        <div class="metric-card-label">Turnover Rate</div>
        <div class="metric-card-value">${formatPercent(metrics.turnoverRate)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-card-label">Success Rate</div>
        <div class="metric-card-value">${formatPercent(metrics.successRate)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-card-label">Avg Holding Cost</div>
        <div class="metric-card-value">${formatCurrency(metrics.avgHoldingCost, metrics.currency)}</div>
      </div>
    </div>
    
    <!-- Action Required (60+ days) -->
    <div class="chart-container">
      <h4 class="chart-title">Action Required (60+ days)</h4>
      <div id="action-required-list" class="bikes-grid"></div>
    </div>
    
    <!-- Quick Sellers (<30 days) -->
    <div class="chart-container">
      <h4 class="chart-title">Quick Sellers (<30 days)</h4>
      <div id="quick-sellers-list" class="bikes-grid"></div>
    </div>
  `;
  
  // Render chart
  setTimeout(() => {
    renderAgingDonutChart(agingData);
    renderActionRequired(actionRequired);
    renderQuickSellers(quickSellers);
  }, 100);
}

/**
 * Get aging distribution
 */
function getAgingDistribution(bikes) {
  const unsoldBikes = bikes.filter(b => b.status === 'unsold');
  
  const distribution = {
    '0-30': 0,
    '31-60': 0,
    '61-90': 0,
    '90+': 0
  };
  
  unsoldBikes.forEach(bike => {
    const days = calculateDaysHeld(bike);
    if (days === null) return;
    
    if (days <= 30) {
      distribution['0-30']++;
    } else if (days <= 60) {
      distribution['31-60']++;
    } else if (days <= 90) {
      distribution['61-90']++;
    } else {
      distribution['90+']++;
    }
  });
  
  return distribution;
}

/**
 * Get action required bikes (60+ days)
 */
function getActionRequired(bikes) {
  return bikes.filter(bike => {
    if (bike.status !== 'unsold') return false;
    const days = calculateDaysHeld(bike);
    return days !== null && days > 60;
  });
}

/**
 * Get quick sellers (<30 days)
 */
function getQuickSellers(bikes) {
  return bikes.filter(bike => {
    if (bike.status !== 'sold') return false;
    const days = calculateDaysHeld(bike);
    return days !== null && days < 30;
  });
}

/**
 * Get inventory metrics
 */
function getInventoryMetrics(bikes) {
  const turnoverRate = calculateTurnoverRate(bikes);
  const successRate = calculateSuccessRate(bikes);
  const currency = getCurrencySymbol();
  
  // Calculate avg holding cost (simplified - total unsold investment / unsold count)
  const unsoldBikes = bikes.filter(b => b.status === 'unsold');
  const totalUnsoldInvestment = unsoldBikes.reduce((sum, b) => {
    return sum + calculateTotalInvestment(b);
  }, 0);
  const avgHoldingCost = unsoldBikes.length > 0 ? totalUnsoldInvestment / unsoldBikes.length : 0;
  
  return {
    turnoverRate,
    successRate,
    avgHoldingCost,
    currency
  };
}

/**
 * Render action required list
 */
function renderActionRequired(bikes) {
  const container = document.getElementById('action-required-list');
  if (!container) return;
  
  if (bikes.length === 0) {
    container.innerHTML = '<div class="empty-state">No bikes require action</div>';
    return;
  }
  
  const currency = getCurrencySymbol();
  container.innerHTML = bikes.slice(0, 10).map(bike => {
    const days = calculateDaysHeld(bike);
    const investment = calculateTotalInvestment(bike);
    return `
      <div class="bike-card">
        <div class="bike-model">${bike.model}</div>
        <div class="bike-info">
          <div>Days: ${days}</div>
          <div>Investment: ${formatCurrency(investment, currency)}</div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render quick sellers list
 */
function renderQuickSellers(bikes) {
  const container = document.getElementById('quick-sellers-list');
  if (!container) return;
  
  if (bikes.length === 0) {
    container.innerHTML = '<div class="empty-state">No quick sellers</div>';
    return;
  }
  
  const currency = getCurrencySymbol();
  container.innerHTML = bikes.slice(0, 10).map(bike => {
    const days = calculateDaysHeld(bike);
    const profit = calculateProfit(bike);
    return `
      <div class="bike-card">
        <div class="bike-model">${bike.model}</div>
        <div class="bike-info">
          <div>Days: ${days}</div>
          <div>Profit: ${formatCurrency(profit || 0, currency)}</div>
        </div>
      </div>
    `;
  }).join('');
}

