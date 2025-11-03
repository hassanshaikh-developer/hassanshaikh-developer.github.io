/**
 * BIKE MANAGER - FINANCIAL.JS
 * Core financial calculations and metrics
 */

/**
 * Calculate total investment for a bike
 */
export function calculateTotalInvestment(bike) {
  const purchase = parseFloat(bike.purchasePrice) || 0;
  const repair = parseFloat(bike.repairCost) || 0;
  const other = parseFloat(bike.otherExpenses) || 0;
  return purchase + repair + other;
}

/**
 * Calculate profit for a bike
 */
export function calculateProfit(bike) {
  if (bike.status !== 'sold') return null;
  const selling = parseFloat(bike.sellingPrice) || 0;
  const totalInvestment = calculateTotalInvestment(bike);
  return selling - totalInvestment;
}

/**
 * Calculate profit margin percentage
 */
export function calculateMarginPercent(bike) {
  if (bike.status !== 'sold') return null;
  const profit = calculateProfit(bike);
  const totalInvestment = calculateTotalInvestment(bike);
  if (totalInvestment === 0) return null;
  return (profit / totalInvestment) * 100;
}

/**
 * Calculate days held for a bike
 */
export function calculateDaysHeld(bike) {
  if (!bike.purchaseDate) return null;
  
  const purchaseDate = new Date(bike.purchaseDate);
  const endDate = bike.sellingDate ? new Date(bike.sellingDate) : new Date();
  
  const diffTime = Math.abs(endDate - purchaseDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Get aging category based on days held
 */
export function getAgingCategory(days) {
  if (days === null || days === undefined) return null;
  if (days <= 30) return 'green';
  if (days <= 60) return 'yellow';
  if (days <= 90) return 'orange';
  return 'red';
}

/**
 * Calculate ROI (Return on Investment)
 */
export function calculateROI(bikes) {
  if (!bikes || bikes.length === 0) return 0;
  
  const soldBikes = bikes.filter(b => b.status === 'sold');
  if (soldBikes.length === 0) return 0;
  
  let totalInvestment = 0;
  let totalRevenue = 0;
  
  soldBikes.forEach(bike => {
    totalInvestment += calculateTotalInvestment(bike);
    totalRevenue += parseFloat(bike.sellingPrice) || 0;
  });
  
  if (totalInvestment === 0) return 0;
  return ((totalRevenue - totalInvestment) / totalInvestment) * 100;
}

/**
 * Calculate average profit per sale
 */
export function calculateAvgProfitPerSale(bikes) {
  const soldBikes = bikes.filter(b => b.status === 'sold');
  if (soldBikes.length === 0) return 0;
  
  let totalProfit = 0;
  soldBikes.forEach(bike => {
    const profit = calculateProfit(bike);
    if (profit !== null) {
      totalProfit += profit;
    }
  });
  
  return totalProfit / soldBikes.length;
}

/**
 * Calculate average days to sell
 */
export function calculateAvgDaysToSell(bikes) {
  const soldBikes = bikes.filter(b => b.status === 'sold' && b.sellingDate);
  if (soldBikes.length === 0) return 0;
  
  let totalDays = 0;
  soldBikes.forEach(bike => {
    const days = calculateDaysHeld(bike);
    if (days !== null) {
      totalDays += days;
    }
  });
  
  return Math.round(totalDays / soldBikes.length);
}

/**
 * Calculate total unsold investment
 */
export function calculateUnsoldInvestment(bikes) {
  const unsoldBikes = bikes.filter(b => b.status === 'unsold');
  let total = 0;
  unsoldBikes.forEach(bike => {
    total += calculateTotalInvestment(bike);
  });
  return total;
}

/**
 * Get price range category
 */
export function getPriceRangeCategory(price) {
  const numPrice = parseFloat(price) || 0;
  if (numPrice < 25000) return '<25k';
  if (numPrice < 50000) return '25-50k';
  if (numPrice < 100000) return '50k-1L';
  return '>1L';
}

/**
 * Calculate monthly profit
 */
export function calculateMonthlyProfit(bikes, year, month) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  
  const monthBikes = bikes.filter(bike => {
    if (bike.status !== 'sold' || !bike.sellingDate) return false;
    const sellDate = new Date(bike.sellingDate);
    return sellDate >= monthStart && sellDate <= monthEnd;
  });
  
  let totalProfit = 0;
  monthBikes.forEach(bike => {
    const profit = calculateProfit(bike);
    if (profit !== null) {
      totalProfit += profit;
    }
  });
  
  return totalProfit;
}

/**
 * Calculate turnover rate
 */
export function calculateTurnoverRate(bikes) {
  if (!bikes || bikes.length === 0) return 0;
  const soldCount = bikes.filter(b => b.status === 'sold').length;
  return (soldCount / bikes.length) * 100;
}

/**
 * Calculate success rate (profitable sales / total sales)
 */
export function calculateSuccessRate(bikes) {
  const soldBikes = bikes.filter(b => b.status === 'sold');
  if (soldBikes.length === 0) return 0;
  
  let profitableCount = 0;
  soldBikes.forEach(bike => {
    const profit = calculateProfit(bike);
    if (profit !== null && profit > 0) {
      profitableCount++;
    }
  });
  
  return (profitableCount / soldBikes.length) * 100;
}

/**
 * Get best month (highest profit)
 */
export function getBestMonth(bikes) {
  if (!bikes || bikes.length === 0) return null;
  
  const monthlyProfits = {};
  
  bikes.forEach(bike => {
    if (bike.status !== 'sold' || !bike.sellingDate) return;
    
    const sellDate = new Date(bike.sellingDate);
    const monthKey = `${sellDate.getFullYear()}-${String(sellDate.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyProfits[monthKey]) {
      monthlyProfits[monthKey] = 0;
    }
    
    const profit = calculateProfit(bike);
    if (profit !== null) {
      monthlyProfits[monthKey] += profit;
    }
  });
  
  let bestMonth = null;
  let bestProfit = -Infinity;
  
  Object.entries(monthlyProfits).forEach(([month, profit]) => {
    if (profit > bestProfit) {
      bestProfit = profit;
      bestMonth = month;
    }
  });
  
  return bestMonth ? {
    month: bestMonth,
    profit: bestProfit
  } : null;
}

/**
 * Get sweet spot (best price range for profit)
 */
export function getSweetSpot(bikes) {
  const soldBikes = bikes.filter(b => b.status === 'sold');
  if (soldBikes.length === 0) return null;
  
  const rangeProfits = {
    '<25k': { count: 0, totalProfit: 0 },
    '25-50k': { count: 0, totalProfit: 0 },
    '50k-1L': { count: 0, totalProfit: 0 },
    '>1L': { count: 0, totalProfit: 0 }
  };
  
  soldBikes.forEach(bike => {
    const range = getPriceRangeCategory(calculateTotalInvestment(bike));
    const profit = calculateProfit(bike);
    if (profit !== null && rangeProfits[range]) {
      rangeProfits[range].count++;
      rangeProfits[range].totalProfit += profit;
    }
  });
  
  let bestRange = null;
  let bestAvgProfit = -Infinity;
  
  Object.entries(rangeProfits).forEach(([range, data]) => {
    if (data.count > 0) {
      const avgProfit = data.totalProfit / data.count;
      if (avgProfit > bestAvgProfit) {
        bestAvgProfit = avgProfit;
        bestRange = range;
      }
    }
  });
  
  return bestRange ? {
    range: bestRange,
    avgProfit: bestAvgProfit
  } : null;
}

/**
 * Get all derived fields for a bike
 */
export function getBikeDerivedFields(bike) {
  return {
    totalInvestment: calculateTotalInvestment(bike),
    profit: calculateProfit(bike),
    marginPercent: calculateMarginPercent(bike),
    daysHeld: calculateDaysHeld(bike),
    agingCategory: getAgingCategory(calculateDaysHeld(bike))
  };
}

