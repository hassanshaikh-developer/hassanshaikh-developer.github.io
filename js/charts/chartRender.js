/**
 * BIKE MANAGER - CHART RENDER.JS
 * Chart rendering functions
 */

import { getDefaultChartOptions, getChartTheme, destroyChart, registerChart, getGradient } from './chartHelpers.js';

/**
 * Render monthly profit line chart
 */
export function renderMonthlyProfitChart(data) {
  const canvas = document.getElementById('monthly-profit-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  
  // Destroy existing chart
  const existing = registerChart('monthly-profit', null);
  if (existing) destroyChart(existing);
  
  const ctx = canvas.getContext('2d');
  const theme = getChartTheme();
  const gradient = getGradient(ctx, theme.accent1, theme.accent2);
  
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.months,
      datasets: [{
        label: 'Monthly Profit',
        data: data.profits,
        borderColor: theme.accent1,
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      ...getDefaultChartOptions('line'),
      plugins: {
        ...getDefaultChartOptions('line').plugins,
        title: {
          display: false
        }
      }
    }
  });
  
  registerChart('monthly-profit', chart);
}

/**
 * Render top/bottom performers bar chart
 */
export function renderTopBottomPerformersChart(data) {
  const canvas = document.getElementById('performers-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  
  destroyChart(registerChart('performers', null));
  
  const ctx = canvas.getContext('2d');
  const theme = getChartTheme();
  
  // Combine top 5 and bottom 5
  const allPerformers = [
    ...data.top5.map((p, i) => ({ ...p, label: `Top ${i + 1}`, isTop: true })),
    ...data.bottom5.map((p, i) => ({ ...p, label: `Bottom ${i + 1}`, isTop: false }))
  ];
  
  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: allPerformers.map(p => p.label),
      datasets: [{
        label: 'Profit',
        data: allPerformers.map(p => p.profit),
        backgroundColor: allPerformers.map(p => p.isTop ? theme.success : theme.error),
        borderColor: allPerformers.map(p => p.isTop ? theme.success : theme.error),
        borderWidth: 1
      }]
    },
    options: {
      ...getDefaultChartOptions('bar'),
      plugins: {
        ...getDefaultChartOptions('bar').plugins,
        title: {
          display: false
        }
      }
    }
  });
  
  registerChart('performers', chart);
}

/**
 * Render aging donut chart
 */
export function renderAgingDonutChart(data) {
  const canvas = document.getElementById('aging-donut-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  
  destroyChart(registerChart('aging-donut', null));
  
  const ctx = canvas.getContext('2d');
  const theme = getChartTheme();
  
  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['0-30 days', '31-60 days', '61-90 days', '90+ days'],
      datasets: [{
        data: [
          data['0-30'] || 0,
          data['31-60'] || 0,
          data['61-90'] || 0,
          data['90+'] || 0
        ],
        backgroundColor: [
          theme.success,
          theme.warning,
          '#f97316',
          theme.error
        ],
        borderColor: theme.backgroundColor,
        borderWidth: 2
      }]
    },
    options: {
      ...getDefaultChartOptions('doughnut'),
      plugins: {
        ...getDefaultChartOptions('doughnut').plugins,
        legend: {
          position: 'bottom'
        }
      }
    }
  });
  
  registerChart('aging-donut', chart);
}

