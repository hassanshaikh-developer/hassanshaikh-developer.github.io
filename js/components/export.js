/**
 * BIKE MANAGER - EXPORT.JS
 * CSV and PDF export functionality
 */

import { getBikes } from '../storage/local.js';
import { 
  calculateTotalInvestment,
  calculateProfit,
  calculateMarginPercent,
  calculateDaysHeld
} from '../utils/financial.js';
import { formatCurrency, formatPercent, formatDate, getCurrencySymbol } from '../utils/helpers.js';

/**
 * Export bikes to CSV
 */
export function exportToCSV() {
  const bikes = getBikes();
  const currency = getCurrencySymbol();
  
  // Prepare CSV data
  const csvData = bikes.map(bike => {
    const totalInvestment = calculateTotalInvestment(bike);
    const profit = bike.status === 'sold' ? calculateProfit(bike) : '';
    const margin = bike.status === 'sold' ? calculateMarginPercent(bike) : '';
    const days = calculateDaysHeld(bike);
    
    return {
      'ID': bike.id,
      'Model': bike.model,
      'Source': bike.source,
      'Status': bike.status,
      'Purchase Date': bike.purchaseDate,
      'Selling Date': bike.sellingDate || '',
      'Purchase Price': parseFloat(bike.purchasePrice) || 0,
      'Repair Cost': parseFloat(bike.repairCost) || 0,
      'Other Expenses': parseFloat(bike.otherExpenses) || 0,
      'Total Investment': totalInvestment,
      'Selling Price': bike.status === 'sold' ? (parseFloat(bike.sellingPrice) || 0) : '',
      'Profit': profit !== null ? profit : '',
      'Margin %': margin !== null ? margin.toFixed(2) : '',
      'Days Held': days !== null ? days : '',
      'Notes': bike.notes || ''
    };
  });
  
  // Convert to CSV using PapaParse
  if (typeof Papa !== 'undefined') {
    const csv = Papa.unparse(csvData);
    downloadFile(csv, `bike-manager-export-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  } else {
    // Fallback manual CSV generation
    const headers = Object.keys(csvData[0] || {});
    const rows = csvData.map(row => 
      headers.map(h => {
        const value = row[h];
        // Escape values containing commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\r\n');
    downloadFile(csv, `bike-manager-export-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  }
}

/**
 * Export monthly PDF report
 */
export function exportToPDF(month = null) {
  const bikes = getBikes();
  const currency = getCurrencySymbol();
  
  if (typeof window.jspdf === 'undefined') {
    alert('PDF export library not loaded');
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  const now = month ? new Date(month + '-01') : new Date();
  const year = now.getFullYear();
  const monthNum = now.getMonth() + 1;
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  // Title
  doc.setFontSize(20);
  doc.text('Bike Manager Report', 14, 20);
  doc.setFontSize(12);
  doc.text(monthName, 14, 28);
  
  let y = 38;
  
  // Summary stats
  doc.setFontSize(14);
  doc.text('Summary Statistics', 14, y);
  y += 8;
  
  doc.setFontSize(10);
  const monthBikes = bikes.filter(b => {
    if (!b.purchaseDate) return false;
    const purchaseDate = new Date(b.purchaseDate);
    return purchaseDate.getFullYear() === year && purchaseDate.getMonth() + 1 === monthNum;
  });
  
  const monthSold = bikes.filter(b => {
    if (b.status !== 'sold' || !b.sellingDate) return false;
    const sellDate = new Date(b.sellingDate);
    return sellDate.getFullYear() === year && sellDate.getMonth() + 1 === monthNum;
  });
  
  let monthProfit = 0;
  monthSold.forEach(b => {
    const profit = calculateProfit(b);
    if (profit !== null) monthProfit += profit;
  });
  
  doc.text(`Bikes Added: ${monthBikes.length}`, 14, y);
  y += 6;
  doc.text(`Bikes Sold: ${monthSold.length}`, 14, y);
  y += 6;
  doc.text(`Month Profit: ${formatCurrency(monthProfit, currency)}`, 14, y);
  y += 10;
  
  // Best/Worst bikes (sold this month)
  if (monthSold.length > 0) {
    doc.setFontSize(14);
    doc.text('Best & Worst (This Month)', 14, y);
    y += 8;
    
    const withProfit = monthSold.map(b => ({
      ...b,
      profit: calculateProfit(b)
    })).filter(b => b.profit !== null);
    
    withProfit.sort((a, b) => b.profit - a.profit);
    
    doc.setFontSize(10);
    if (withProfit.length > 0) {
      doc.text(`Best: ${withProfit[0].model} - ${formatCurrency(withProfit[0].profit, currency)}`, 14, y);
      y += 6;
    }
    if (withProfit.length > 1) {
      doc.text(`Worst: ${withProfit[withProfit.length - 1].model} - ${formatCurrency(withProfit[withProfit.length - 1].profit, currency)}`, 14, y);
      y += 10;
    }
  }
  
  // 6-month profit trend (simplified text)
  doc.setFontSize(14);
  doc.text('6-Month Profit Trend', 14, y);
  y += 8;
  
  doc.setFontSize(10);
  for (let i = 5; i >= 0; i--) {
    const date = new Date(year, monthNum - i - 1, 1);
    const trendYear = date.getFullYear();
    const trendMonth = date.getMonth() + 1;
    
    const trendProfit = bikes.filter(b => {
      if (b.status !== 'sold' || !b.sellingDate) return false;
      const sellDate = new Date(b.sellingDate);
      return sellDate.getFullYear() === trendYear && sellDate.getMonth() + 1 === trendMonth;
    }).reduce((sum, b) => {
      const profit = calculateProfit(b);
      return sum + (profit !== null ? profit : 0);
    }, 0);
    
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    doc.text(`${monthLabel}: ${formatCurrency(trendProfit, currency)}`, 14, y);
    y += 6;
  }
  
  y += 4;
  
  // Aging distribution (text summary)
  doc.setFontSize(14);
  doc.text('Inventory Aging', 14, y);
  y += 8;
  
  doc.setFontSize(10);
  const unsold = bikes.filter(b => b.status === 'unsold');
  const aging = {
    '0-30': 0,
    '31-60': 0,
    '61-90': 0,
    '90+': 0
  };
  
  unsold.forEach(b => {
    const days = calculateDaysHeld(b);
    if (days === null) return;
    if (days <= 30) aging['0-30']++;
    else if (days <= 60) aging['31-60']++;
    else if (days <= 90) aging['61-90']++;
    else aging['90+']++;
  });
  
  Object.entries(aging).forEach(([range, count]) => {
    doc.text(`${range} days: ${count} bikes`, 14, y);
    y += 6;
  });
  
  // Footer
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 280);
  
  // Save
  doc.save(`bike-manager-report-${monthName.replace(/\s+/g, '-')}.pdf`);
}

/**
 * Download file helper
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

