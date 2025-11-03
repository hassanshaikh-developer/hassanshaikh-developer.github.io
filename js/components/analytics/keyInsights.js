/**
 * BIKE MANAGER - KEY INSIGHTS.JS
 * Key insights panel (always visible)
 */

import { 
  calculateAvgProfitPerSale,
  calculateROI,
  calculateUnsoldInvestment,
  getBestMonth,
  calculateAvgDaysToSell,
  getSweetSpot
} from '../../utils/financial.js';
import { formatCurrency, formatPercent, getCurrencySymbol, getMonthAbbr } from '../../utils/helpers.js';

/**
 * Render key insights panel
 */
export function renderKeyInsights(bikes) {
  const container = document.getElementById('key-insights-panel');
  if (!container) return;
  
  const currency = getCurrencySymbol();
  const avgProfit = calculateAvgProfitPerSale(bikes);
  const roi = calculateROI(bikes);
  const unsoldInvestment = calculateUnsoldInvestment(bikes);
  const bestMonth = getBestMonth(bikes);
  const avgDays = calculateAvgDaysToSell(bikes);
  const sweetSpot = getSweetSpot(bikes);
  
  container.innerHTML = `
    <h3>Key Insights</h3>
    <div class="insights-grid">
      <div class="insight-item">
        <div class="insight-label">Avg Profit/Sale</div>
        <div class="insight-value">${formatCurrency(avgProfit, currency)}</div>
      </div>
      
      <div class="insight-item">
        <div class="insight-label">ROI</div>
        <div class="insight-value">${formatPercent(roi)}</div>
      </div>
      
      <div class="insight-item">
        <div class="insight-label">Locked Capital</div>
        <div class="insight-value">${formatCurrency(unsoldInvestment, currency)}</div>
      </div>
      
      <div class="insight-item">
        <div class="insight-label">Best Month</div>
        <div class="insight-value">
          ${bestMonth ? 
            `${bestMonth.month.split('-')[1]}/${bestMonth.month.split('-')[0]} (${formatCurrency(bestMonth.profit, currency)})` : 
            '—'}
        </div>
      </div>
      
      <div class="insight-item">
        <div class="insight-label">Avg Sale Days</div>
        <div class="insight-value">${avgDays > 0 ? `${avgDays} days` : '—'}</div>
      </div>
      
      <div class="insight-item">
        <div class="insight-label">Sweet Spot</div>
        <div class="insight-value">
          ${sweetSpot ? 
            `${sweetSpot.range} (${formatCurrency(sweetSpot.avgProfit, currency)})` : 
            '—'}
        </div>
      </div>
    </div>
  `;
}

