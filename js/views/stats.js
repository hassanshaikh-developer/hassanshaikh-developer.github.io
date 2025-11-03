/**
 * Stats View Module
 * Handles analytics dashboard and charts
 */

(function(window) {
  'use strict';

  if (!window.app) {
    console.error('Stats view: app not initialized');
    return;
  }

  const app = window.app;

  Object.assign(app, {
    /**
     * Render stats dashboard
     */
    async renderStatsDashboard() {
      let bikes = await this.db.bikes.filter(b => !b._deleted).toArray();
      
      // Apply date filter
      if (this.statsDateFilter.from || this.statsDateFilter.to) {
        bikes = bikes.filter(b => {
          if (!b.dateSelling) return false;
          const saleDate = new Date(b.dateSelling);
          const toDate = this.statsDateFilter.to ? new Date(this.statsDateFilter.to) : null;
          if (toDate) toDate.setDate(toDate.getDate() + 1);
          
          if (this.statsDateFilter.from && saleDate < new Date(this.statsDateFilter.from)) return false;
          if (toDate && saleDate >= toDate) return false;
          return true;
        });
      }
      
      const soldBikes = bikes.filter(b => b.dateSelling && b.dateSelling !== '');
      
      // Update insights
      this.updateInsights(bikes, soldBikes);
      
      // Render metrics
      this.renderPerformanceMetrics(soldBikes);
      
      // Render charts if on stats view
      if (this.currentView === 'view-stats') {
        this.renderProfitTrendChart(soldBikes);
        this.renderProfitPieChart(soldBikes);
        this.renderTopBikesChart(soldBikes);
      }
    },

    /**
     * Update insights text
     */
    updateInsights(allBikes, soldBikes) {
      const unsold = allBikes.filter(b => !b.dateSelling || b.dateSelling === '');
      const totalProfit = soldBikes.reduce((sum, b) => sum + parseFloat(b.netProfit || 0), 0);
      const unsoldValue = unsold.reduce((sum, b) => sum + parseFloat(b.purchasePrice || 0) + parseFloat(b.repairCost || 0), 0);
      const avgProfit = soldBikes.length > 0 ? totalProfit / soldBikes.length : 0;
      
      let text = `You have ${unsold.length} bikes in stock (total investment: ${this.settings.currency}${this.formatCurrency(unsoldValue)}).`;
      if (soldBikes.length > 0) {
        text += ` Your average profit per bike is ${this.settings.currency}${this.formatCurrency(avgProfit)}.`;
      }
      
      const insightEl = document.getElementById('auto-insight-text');
      if (insightEl) insightEl.textContent = text;
    },

    /**
     * Render performance metrics
     */
    renderPerformanceMetrics(soldBikes) {
      if (soldBikes.length === 0) {
        const els = ['stat-avg-roi', 'stat-best-bike', 'stat-worst-bike', 'stat-avg-days'];
        els.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.textContent = id === 'stat-avg-days' ? '0' : '-';
        });
        return;
      }
      
      // Calculate ROI
      let totalROI = 0;
      let roiCount = 0;
      soldBikes.forEach(b => {
        const investment = parseFloat(b.purchasePrice || 0) + parseFloat(b.repairCost || 0);
        if (investment > 0) {
          const roi = (parseFloat(b.netProfit || 0) / investment) * 100;
          totalROI += roi;
          roiCount++;
        }
      });
      const avgROI = roiCount > 0 ? totalROI / roiCount : 0;
      const roiEl = document.getElementById('stat-avg-roi');
      if (roiEl) roiEl.textContent = avgROI.toFixed(1) + '%';
      
      // Best/Worst
      const sorted = [...soldBikes].sort((a, b) => parseFloat(b.netProfit || 0) - parseFloat(a.netProfit || 0));
      const bestEl = document.getElementById('stat-best-bike');
      const worstEl = document.getElementById('stat-worst-bike');
      if (bestEl) bestEl.textContent = sorted[0]?.no || '-';
      if (worstEl) worstEl.textContent = sorted[sorted.length - 1]?.no || '-';
      
      // Avg days
      let totalDays = 0;
      let validCount = 0;
      soldBikes.forEach(b => {
        if (b.datePurchase && b.dateSelling) {
          try {
            const days = (new Date(b.dateSelling) - new Date(b.datePurchase)) / (1000 * 60 * 60 * 24);
            if (days >= 0) {
              totalDays += days;
              validCount++;
            }
          } catch(e) {}
        }
      });
      const avgDaysEl = document.getElementById('stat-avg-days');
      if (avgDaysEl) avgDaysEl.textContent = validCount > 0 ? Math.round(totalDays / validCount) : '0';
    },

    /**
     * Render profit trend chart
     */
    renderProfitTrendChart(soldBikes) {
      const canvas = document.getElementById('chart-profit-trend');
      if (!canvas) return;
      
      // Destroy existing chart
      if (this.charts.profitTrend) {
        this.charts.profitTrend.destroy();
      }
      
      // Group by month
      const monthly = {};
      soldBikes.forEach(b => {
        if (!b.dateSelling) return;
        try {
          const date = new Date(b.dateSelling);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!monthly[monthKey]) monthly[monthKey] = 0;
          monthly[monthKey] += parseFloat(b.netProfit || 0);
        } catch(e) {}
      });
      
      const labels = Object.keys(monthly).sort();
      const data = labels.map(k => monthly[k]);
      
      // Calculate moving average (3 month)
      const movingAvg = [];
      for (let i = 0; i < data.length; i++) {
        const window = data.slice(Math.max(0, i - 2), i + 1);
        movingAvg.push(window.reduce((a, b) => a + b, 0) / window.length);
      }
      
      this.charts.profitTrend = new Chart(canvas, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Monthly Profit',
              data: data,
              borderColor: '#0097a7',
              backgroundColor: 'rgba(0, 151, 167, 0.1)',
              tension: 0.4
            },
            {
              label: '3-Month Avg',
              data: movingAvg,
              borderColor: '#4caf50',
              borderDash: [5, 5],
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: true, position: 'top' }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    },

    /**
     * Render profit pie chart
     */
    renderProfitPieChart(soldBikes) {
      const canvas = document.getElementById('chart-profit-pie');
      if (!canvas) return;
      
      if (this.charts.profitPie) {
        this.charts.profitPie.destroy();
      }
      
      const positive = soldBikes.filter(b => parseFloat(b.netProfit || 0) > 0).length;
      const negative = soldBikes.filter(b => parseFloat(b.netProfit || 0) < 0).length;
      const zero = soldBikes.filter(b => parseFloat(b.netProfit || 0) === 0).length;
      
      this.charts.profitPie = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: ['Profit', 'Loss', 'Break Even'],
          datasets: [{
            data: [positive, negative, zero],
            backgroundColor: ['#4caf50', '#f44336', '#999999']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    },

    /**
     * Render top bikes chart
     */
    renderTopBikesChart(soldBikes) {
      const canvas = document.getElementById('chart-top-bikes');
      if (!canvas) return;
      
      if (this.charts.topBikes) {
        this.charts.topBikes.destroy();
      }
      
      const sorted = [...soldBikes]
        .sort((a, b) => parseFloat(b.netProfit || 0) - parseFloat(a.netProfit || 0))
        .slice(0, 5);
      
      const labels = sorted.map(b => b.no || 'Unknown');
      const data = sorted.map(b => parseFloat(b.netProfit || 0));
      
      this.charts.topBikes = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Profit',
            data: data,
            backgroundColor: '#0097a7'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    },

    /**
     * Apply date filter
     */
    applyStatsDateFilter() {
      const from = document.getElementById('stats-date-from');
      const to = document.getElementById('stats-date-to');
      this.statsDateFilter.from = from?.value || null;
      this.statsDateFilter.to = to?.value || null;
      this.renderStatsDashboard();
    },

    /**
     * Reset date filter
     */
    resetStatsDateFilter() {
      this.statsDateFilter = { from: null, to: null };
      const from = document.getElementById('stats-date-from');
      const to = document.getElementById('stats-date-to');
      if (from) from.value = '';
      if (to) to.value = '';
      this.renderStatsDashboard();
    },

    /**
     * Initialize stats view listeners
     */
    initStatsViewListeners() {
      const applyFilter = document.getElementById('apply-date-filter');
      const resetFilter = document.getElementById('reset-date-filter');
      if (applyFilter) applyFilter.addEventListener('click', () => this.applyStatsDateFilter());
      if (resetFilter) resetFilter.addEventListener('click', () => this.resetStatsDateFilter());
    }
  });

  // Initialize listeners
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.app) window.app.initStatsViewListeners();
    });
  } else {
    if (window.app) window.app.initStatsViewListeners();
  }

})(window);

