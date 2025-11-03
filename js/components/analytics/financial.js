/**
 * BIKE MANAGER - FINANCIAL ANALYTICS.JS
 * Financial analytics tab
 */

import { renderMonthlyProfitChart, renderTopBottomPerformersChart } from '../../charts/chartRender.js';
import { 
  calculateMonthlyProfit,
  getPriceRangeCategory,
  calculateProfit,
  calculateTotalInvestment
} from '../../utils/financial.js';
import { formatCurrency, getCurrencySymbol } from '../../utils/helpers.js';

/**
 * Render financial analytics
 */
export function renderFinancialAnalytics(bikes) {
  const container = document.getElementById('analytics-container');
  if (!container) return;
  
  // Calculate data
  const monthlyProfitData = getMonthlyProfitData(bikes);
  const topBottomPerformers = getTopBottomPerformers(bikes);
  const categoryPerformance = getCategoryPerformance(bikes);
  
  container.innerHTML = `
    <!-- Monthly Profit Chart -->
    <div class="chart-container">
      <h4 class="chart-title">Monthly Profit Trend</h4>
      <div class="chart-wrapper">
        <canvas id="monthly-profit-chart"></canvas>
      </div>
    </div>
    
    <!-- Top/Bottom Performers Chart -->
    <div class="chart-container">
      <h4 class="chart-title">Top & Bottom Performers</h4>
      <div class="chart-wrapper">
        <canvas id="performers-chart"></canvas>
      </div>
    </div>
    
    <!-- Category Performance -->
    <div class="chart-container">
      <h4 class="chart-title">Category Performance</h4>
      <div id="category-performance"></div>
    </div>
  `;
  
  // Render charts after a brief delay to ensure DOM is ready
  setTimeout(() => {
    renderMonthlyProfitChart(monthlyProfitData);
    renderTopBottomPerformersChart(topBottomPerformers);
    renderCategoryPerformance(categoryPerformance);
  }, 100);
}

/**
 * Get monthly profit data for chart
 */
function getMonthlyProfitData(bikes) {
  const now = new Date();
  const months = [];
  const profits = [];
  
  // Get last 6 months
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    const profit = calculateMonthlyProfit(bikes, year, month);
    months.push(`${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`);
    profits.push(profit);
  }
  
  return { months, profits };
}

/**
 * Get top and bottom performers
 */
function getTopBottomPerformers(bikes) {
  const soldBikes = bikes.filter(b => b.status === 'sold');
  
  const withProfit = soldBikes.map(bike => ({
    ...bike,
    profit: calculateProfit(bike)
  })).filter(b => b.profit !== null);
  
  withProfit.sort((a, b) => b.profit - a.profit);
  
  const top5 = withProfit.slice(0, 5).map(b => ({ model: b.model, profit: b.profit }));
  const bottom5 = withProfit.slice(-5).reverse().map(b => ({ model: b.model, profit: b.profit }));
  
  return { top5, bottom5 };
}

/**
 * Get category performance
 */
function getCategoryPerformance(bikes) {
  const soldBikes = bikes.filter(b => b.status === 'sold');
  
  // By source
  const bySource = {
    Dealer: { count: 0, totalProfit: 0 },
    Owner: { count: 0, totalProfit: 0 },
    Auction: { count: 0, totalProfit: 0 }
  };
  
  // By price range
  const byPriceRange = {
    '<25k': { count: 0, totalProfit: 0 },
    '25-50k': { count: 0, totalProfit: 0 },
    '50k-1L': { count: 0, totalProfit: 0 },
    '>1L': { count: 0, totalProfit: 0 }
  };
  
  soldBikes.forEach(bike => {
    const profit = calculateProfit(bike);
    if (profit === null) return;
    
    // By source
    if (bySource[bike.source]) {
      bySource[bike.source].count++;
      bySource[bike.source].totalProfit += profit;
    }
    
    // By price range
    const totalInvestment = calculateTotalInvestment(bike);
    const range = getPriceRangeCategory(totalInvestment);
    if (byPriceRange[range]) {
      byPriceRange[range].count++;
      byPriceRange[range].totalProfit += profit;
    }
  });
  
  return { bySource, byPriceRange };
}

/**
 * Render category performance
 */
function renderCategoryPerformance(data) {
  const container = document.getElementById('category-performance');
  if (!container) return;
  
  const currency = getCurrencySymbol();
  
  container.innerHTML = `
    <div class="metric-cards">
      <div class="metric-card">
        <div class="metric-card-label">Best Source (Avg Profit)</div>
        <div class="metric-card-value">
          ${getBestCategory(data.bySource, currency)}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-card-label">Best Price Range (Avg Profit)</div>
        <div class="metric-card-value">
          ${getBestCategory(data.byPriceRange, currency)}
        </div>
      </div>
    </div>
  `;
}

/**
 * Get best category
 */
function getBestCategory(categories, currency) {
  let best = null;
  let bestAvg = -Infinity;
  
  Object.entries(categories).forEach(([name, data]) => {
    if (data.count > 0) {
      const avg = data.totalProfit / data.count;
      if (avg > bestAvg) {
        bestAvg = avg;
        best = { name, avg, count: data.count };
      }
    }
  });
  
  return best ? `${best.name}: ${formatCurrency(best.avg, currency)} (${best.count} sales)` : '—';
}

