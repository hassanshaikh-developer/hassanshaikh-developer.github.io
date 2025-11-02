/**
 * Charts Module
 * Handles all Chart.js rendering with proper cleanup to prevent memory leaks
 */

export class ChartManager {
  constructor() {
    this.charts = {};
  }

  /**
   * Destroy a chart if it exists
   */
  destroyChart(chartId) {
    if (this.charts[chartId]) {
      this.charts[chartId].destroy();
      this.charts[chartId] = null;
      delete this.charts[chartId];
    }
  }

  /**
   * Destroy all charts
   */
  destroyAll() {
    Object.keys(this.charts).forEach(id => this.destroyChart(id));
  }

  /**
   * Render monthly profit trend chart with moving average
   */
  renderProfitTrend(soldBikes, canvasId = 'chart-profit-trend') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    this.destroyChart(canvasId);

    const ctx = canvas.getContext('2d');

    const monthlyData = soldBikes.reduce((acc, bike) => {
      if (!bike.dateSelling) return acc;
      const month = bike.dateSelling.substring(0, 7);
      acc[month] = (acc[month] || 0) + parseFloat(bike.netProfit || 0);
      return acc;
    }, {});

    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(month => new Date(month + '-02'));
    const data = sortedMonths.map(month => monthlyData[month]);

    // Calculate 3-month moving average
    const movingAvg = data.map((val, idx, arr) => {
      if (idx < 2) return val;
      return (arr[idx] + arr[idx - 1] + arr[idx - 2]) / 3;
    });

    const chartConfig = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Monthly Profit',
            data: data,
            borderColor: 'rgba(0, 208, 255, 1)',
            backgroundColor: 'rgba(0, 208, 255, 0.2)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: '3-Month Moving Avg',
            data: movingAvg,
            borderColor: 'rgba(110, 231, 183, 1)',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            tension: 0.3,
            pointRadius: 0,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: {
          duration: 750,
          easing: 'easeInOutQuart'
        },
        plugins: {
          legend: { 
            display: true,
            position: 'top'
          },
          tooltip: { 
            mode: 'index', 
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 14 },
            bodyFont: { size: 13 }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: { unit: 'month' },
            grid: { 
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)'
            }
          },
          y: {
            beginAtZero: true,
            grid: { 
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)',
              callback: function(value) {
                return '₹' + value.toLocaleString();
              }
            }
          }
        },
        interaction: {
          mode: 'index',
          intersect: false
        }
      }
    };

    this.charts[canvasId] = new Chart(ctx, chartConfig);
    return this.charts[canvasId];
  }

  /**
   * Render profit distribution pie chart
   */
  renderProfitPie(soldBikes, canvasId = 'chart-profit-pie') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    this.destroyChart(canvasId);

    const ctx = canvas.getContext('2d');

    const profitBins = {
      'Loss (< 0)': 0,
      'Break Even (0)': 0,
      'Profit (0 - 1k)': 0,
      'Profit (1k - 5k)': 0,
      'Profit (5k+)': 0,
    };

    soldBikes.forEach(b => {
      const p = parseFloat(b.netProfit || 0);
      if (p < 0) profitBins['Loss (< 0)']++;
      else if (p === 0) profitBins['Break Even (0)']++;
      else if (p <= 1000) profitBins['Profit (0 - 1k)']++;
      else if (p <= 5000) profitBins['Profit (1k - 5k)']++;
      else profitBins['Profit (5k+)']++;
    });

    const labels = Object.keys(profitBins);
    const data = Object.values(profitBins);

    const chartConfig = {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          label: 'Profit Distribution',
          data: data,
          backgroundColor: [
            'rgba(239, 68, 68, 0.7)',
            'rgba(156, 163, 175, 0.7)',
            'rgba(5, 150, 105, 0.7)',
            'rgba(34, 197, 94, 0.7)',
            'rgba(107, 231, 183, 0.7)',
          ],
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 750
        },
        plugins: {
          legend: { 
            position: 'top',
            labels: {
              color: 'rgba(255, 255, 255, 0.9)',
              padding: 12,
              font: { size: 12 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    };

    this.charts[canvasId] = new Chart(ctx, chartConfig);
    return this.charts[canvasId];
  }

  /**
   * Render top 5 profitable bikes
   */
  renderTopBikes(soldBikes, canvasId = 'chart-top-bikes') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    this.destroyChart(canvasId);

    const ctx = canvas.getContext('2d');

    const topBikes = [...soldBikes]
      .sort((a, b) => parseFloat(b.netProfit || 0) - parseFloat(a.netProfit || 0))
      .slice(0, 5);

    const labels = topBikes.map(b => b.no);
    const data = topBikes.map(b => parseFloat(b.netProfit || 0));

    const chartConfig = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Net Profit',
          data: data,
          backgroundColor: 'rgba(107, 231, 183, 0.7)',
          borderColor: 'rgba(107, 231, 183, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        indexAxis: 'y',
        animation: {
          duration: 750,
          easing: 'easeInOutQuart'
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { 
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)',
              callback: function(value) {
                return '₹' + value.toLocaleString();
              }
            }
          },
          y: {
            grid: { 
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)'
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            callbacks: {
              label: function(context) {
                return 'Profit: ₹' + context.parsed.x.toLocaleString();
              }
            }
          }
        }
      }
    };

    this.charts[canvasId] = new Chart(ctx, chartConfig);
    return this.charts[canvasId];
  }

  /**
   * Download chart as PNG
   */
  downloadChart(canvasId, filename) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return false;

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}-${new Date().toISOString().split('T')[0]}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');

    return true;
  }

  /**
   * Resize all charts (call on window resize)
   */
  resizeAll() {
    Object.values(this.charts).forEach(chart => {
      if (chart) {
        chart.resize();
      }
    });
  }
}

// Export singleton instance
export const chartManager = new ChartManager();

