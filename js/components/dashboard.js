/**
 * BIKE MANAGER - DASHBOARD.JS
 * 8-card summary dashboard
 */

import { 
  calculateTotalInvestment,
  calculateProfit,
  calculateMarginPercent,
  calculateMonthlyProfit,
  calculateUnsoldInvestment,
  calculateAvgProfitPerSale,
  calculateAvgDaysToSell,
  calculateROI
} from '../utils/financial.js';
import { formatCurrency, formatPercent, getCurrencySymbol, formatTrend } from '../utils/helpers.js';

/**
 * Render dashboard with 8 stat cards
 */
export async function renderDashboard(bikes) {
  const container = document.getElementById('dashboard-container');
  if (!container) return;
  
  const currency = getCurrencySymbol();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  
  // Calculate metrics
  const thisMonthProfit = calculateMonthlyProfit(bikes, currentYear, currentMonth);
  const lastMonthProfit = calculateMonthlyProfit(bikes, lastMonthYear, lastMonth);
  
  const unsoldCount = bikes.filter(b => b.status === 'unsold').length;
  const soldCount = bikes.filter(b => b.status === 'sold').length;
  
  const unsoldInvestment = calculateUnsoldInvestment(bikes);
  const totalProfit = bikes
    .filter(b => b.status === 'sold')
    .reduce((sum, b) => {
      const profit = calculateProfit(b);
      return sum + (profit !== null ? profit : 0);
    }, 0);
  
  const avgProfitPerSale = calculateAvgProfitPerSale(bikes);
  const avgMarginPercent = calculateAvgMarginPercent(bikes);
  const avgDaysToSell = calculateAvgDaysToSell(bikes);
  const monthROI = calculateMonthlyROI(bikes, currentYear, currentMonth);
  
  // Row 1: This Month (4 cards)
  const row1Cards = [
    {
      label: 'Month Profit',
      value: formatCurrency(thisMonthProfit, currency),
      change: formatTrend(thisMonthProfit, lastMonthProfit)
    },
    {
      label: 'Unsold Count',
      value: unsoldCount.toString(),
      change: null
    },
    {
      label: 'Sold Count',
      value: soldCount.toString(),
      change: null
    },
    {
      label: 'Month ROI',
      value: formatPercent(monthROI),
      change: null
    }
  ];
  
  // Row 2: All-Time (4 cards)
  const row2Cards = [
    {
      label: 'Total Profit',
      value: formatCurrency(totalProfit, currency),
      change: null
    },
    {
      label: 'Unsold Investment',
      value: formatCurrency(unsoldInvestment, currency),
      change: null
    },
    {
      label: 'Avg Profit/Sale',
      value: `${formatCurrency(avgProfitPerSale, currency)} (${formatPercent(avgMarginPercent)})`,
      change: null
    },
    {
      label: 'Avg Days to Sell',
      value: `${avgDaysToSell} days`,
      change: null
    }
  ];
  
  // Render all cards
  container.innerHTML = `
    ${row1Cards.map(card => renderStatCard(card)).join('')}
    ${row2Cards.map(card => renderStatCard(card)).join('')}
  `;
}

/**
 * Render single stat card
 */
function renderStatCard(card) {
  const changeClass = card.change ? 
    (card.change.includes('↑') ? 'positive' : card.change.includes('↓') ? 'negative' : 'neutral') : '';
  
  return `
    <div class="stat-card">
      <div class="stat-label">${card.label}</div>
      <div class="stat-value">${card.value}</div>
      ${card.change ? `
      <div class="stat-change ${changeClass}">
        ${card.change}
      </div>
      ` : ''}
    </div>
  `;
}

/**
 * Calculate average margin percent
 */
function calculateAvgMarginPercent(bikes) {
  const soldBikes = bikes.filter(b => b.status === 'sold');
  if (soldBikes.length === 0) return 0;
  
  let totalMargin = 0;
  let count = 0;
  
  soldBikes.forEach(bike => {
    const margin = calculateMarginPercent(bike);
    if (margin !== null) {
      totalMargin += margin;
      count++;
    }
  });
  
  return count > 0 ? totalMargin / count : 0;
}

/**
 * Calculate monthly ROI
 */
function calculateMonthlyROI(bikes, year, month) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  
  const monthBikes = bikes.filter(bike => {
    if (!bike.purchaseDate) return false;
    const purchaseDate = new Date(bike.purchaseDate);
    return purchaseDate >= monthStart && purchaseDate <= monthEnd;
  });
  
  const monthSoldBikes = bikes.filter(bike => {
    if (bike.status !== 'sold' || !bike.sellingDate) return false;
    const sellDate = new Date(bike.sellingDate);
    return sellDate >= monthStart && sellDate <= monthEnd;
  });
  
  if (monthBikes.length === 0) return 0;
  
  let totalInvestment = 0;
  monthBikes.forEach(bike => {
    totalInvestment += calculateTotalInvestment(bike);
  });
  
  let totalRevenue = 0;
  monthSoldBikes.forEach(bike => {
    totalRevenue += parseFloat(bike.sellingPrice) || 0;
  });
  
  if (totalInvestment === 0) return 0;
  return ((totalRevenue - totalInvestment) / totalInvestment) * 100;
}

