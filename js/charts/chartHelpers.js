/**
 * BIKE MANAGER - CHART HELPERS.JS
 * Chart.js setup and theme configuration
 */

/**
 * Get chart theme colors based on current theme
 */
export function getChartTheme() {
  const isDark = document.documentElement.classList.contains('theme-dark') || 
                 (!document.documentElement.classList.contains('theme-light') && 
                  window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  return {
    backgroundColor: isDark ? 'rgba(7, 27, 43, 0.8)' : 'rgba(255, 255, 255, 0.8)',
    textColor: isDark ? '#e6f6ff' : '#071026',
    gridColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
    accent1: '#00D0FF',
    accent2: '#6EE7B7',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6'
  };
}

/**
 * Get default chart options
 */
export function getDefaultChartOptions(type = 'line') {
  const theme = getChartTheme();
  
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: theme.textColor,
          font: {
            family: "'Inter', sans-serif"
          }
        }
      },
      tooltip: {
        backgroundColor: theme.backgroundColor,
        titleColor: theme.textColor,
        bodyColor: theme.textColor,
        borderColor: theme.borderColor,
        borderWidth: 1
      }
    },
    scales: type === 'line' || type === 'bar' ? {
      x: {
        ticks: {
          color: theme.textColor
        },
        grid: {
          color: theme.gridColor
        }
      },
      y: {
        ticks: {
          color: theme.textColor
        },
        grid: {
          color: theme.gridColor
        }
      }
    } : undefined
  };
  
  return baseOptions;
}

/**
 * Destroy chart instance if it exists
 */
export function destroyChart(chartInstance) {
  if (chartInstance && typeof chartInstance.destroy === 'function') {
    chartInstance.destroy();
  }
}

/**
 * Get gradient for chart
 */
export function getGradient(ctx, color1, color2, direction = 'vertical') {
  const gradient = direction === 'vertical' 
    ? ctx.createLinearGradient(0, 0, 0, 400)
    : ctx.createLinearGradient(0, 0, 400, 0);
  
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2 || color1);
  return gradient;
}

// Store chart instances globally to avoid memory leaks
export const chartInstances = new Map();

/**
 * Register chart instance
 */
export function registerChart(id, instance) {
  // Destroy existing chart if any
  const existing = chartInstances.get(id);
  if (existing) {
    destroyChart(existing);
  }
  
  chartInstances.set(id, instance);
}

/**
 * Cleanup all charts
 */
export function cleanupCharts() {
  chartInstances.forEach((instance, id) => {
    destroyChart(instance);
  });
  chartInstances.clear();
}

