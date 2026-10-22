/* ==========================================================================
   MEDICO - CHART.JS INTERACTIVE VISUALIZATION MANAGER
   ========================================================================== */

const ChartManager = {
  charts: {},

  // Color Tokens for Clinical Charts
  colors: {
    heartRate: {
      border: '#EF4444',
      bg: 'rgba(239, 68, 68, 0.08)'
    },
    spo2: {
      border: '#0284C7',
      bg: 'rgba(2, 132, 199, 0.08)'
    },
    bpSystolic: {
      border: '#8B5CF6',
      bg: 'rgba(139, 92, 246, 0.06)'
    },
    bpDiastolic: {
      border: '#A78BFA',
      bg: 'rgba(167, 139, 250, 0.04)'
    },
    respiratoryRate: {
      border: '#10B981',
      bg: 'rgba(16, 185, 129, 0.08)'
    },
    temperature: {
      border: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.08)'
    }
  },

  /**
   * Initialize a mini sparkline chart for the main dashboard
   */
  createMiniSparkline(canvasId, label, colorHex, initialData = []) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return null;

    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    const labels = initialData.map(d => Utils.formatTime(d.timestamp));
    const values = initialData.map(d => d.value);

    const ctx = canvas.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label,
          data: values,
          borderColor: colorHex,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: true,
          backgroundColor: colorHex + '18',
          tension: 0.35
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}`
            }
          }
        },
        scales: {
          x: { display: false },
          y: {
            display: true,
            ticks: {
              maxTicksLimit: 3,
              font: { size: 10 },
              color: '#94A3B8'
            },
            grid: { color: '#F1F5F9' }
          }
        },
        animation: { duration: 0 }
      }
    });

    this.charts[canvasId] = chart;
    return chart;
  },

  /**
   * Initialize full interactive multi-series chart on Patient Monitoring workspace
   */
  createPatientMonitoringChart(canvasId, initialObservations = [], activeParam = 'heartRate') {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return null;

    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    const labels = initialObservations.map(o => Utils.formatTime(o.timestamp));
    const config = this.getParamDatasetConfig(activeParam, initialObservations);

    const ctx = canvas.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: config.datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: config.datasets.length > 1,
            position: 'top',
            labels: { font: { family: 'Inter', size: 12 }, boxWidth: 14 }
          },
          tooltip: {
            backgroundColor: '#1E293B',
            titleFont: { size: 12 },
            bodyFont: { size: 13 },
            padding: 10,
            cornerRadius: 6,
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} ${config.unit}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: '#F1F5F9' },
            ticks: {
              font: { size: 11, family: 'Inter' },
              color: '#64748B',
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 8
            }
          },
          y: {
            grid: { color: '#F1F5F9' },
            ticks: {
              font: { size: 11, family: 'Inter' },
              color: '#64748B'
            },
            suggestedMin: config.suggestedMin,
            suggestedMax: config.suggestedMax
          }
        },
        animation: { duration: 300 }
      }
    });

    this.charts[canvasId] = chart;
    return chart;
  },

  /**
   * Helper to format dataset definition based on selected measurement parameter
   */
  getParamDatasetConfig(param, observations) {
    if (param === 'bp') {
      return {
        unit: 'mmHg',
        suggestedMin: 50,
        suggestedMax: 170,
        datasets: [
          {
            label: 'Systolic BP',
            data: observations.map(o => o.bpSystolic),
            borderColor: this.colors.bpSystolic.border,
            backgroundColor: this.colors.bpSystolic.bg,
            borderWidth: 2,
            tension: 0.3,
            fill: false,
            pointRadius: 2
          },
          {
            label: 'Diastolic BP',
            data: observations.map(o => o.bpDiastolic),
            borderColor: this.colors.bpDiastolic.border,
            backgroundColor: this.colors.bpDiastolic.bg,
            borderWidth: 2,
            tension: 0.3,
            fill: false,
            pointRadius: 2
          }
        ]
      };
    }

    const mapping = {
      heartRate: {
        prop: 'heartRate',
        label: 'Heart Rate',
        unit: 'bpm',
        color: this.colors.heartRate,
        suggestedMin: 50,
        suggestedMax: 130
      },
      spo2: {
        prop: 'spo2',
        label: 'SpO₂ Oxygen Saturation',
        unit: '%',
        color: this.colors.spo2,
        suggestedMin: 85,
        suggestedMax: 100
      },
      respiratoryRate: {
        prop: 'respiratoryRate',
        label: 'Respiratory Rate',
        unit: 'breaths/min',
        color: this.colors.respiratoryRate,
        suggestedMin: 10,
        suggestedMax: 30
      },
      temperature: {
        prop: 'temperature',
        label: 'Body Temperature',
        unit: '°C',
        color: this.colors.temperature,
        suggestedMin: 35.5,
        suggestedMax: 39.5
      }
    };

    const item = mapping[param] || mapping.heartRate;

    return {
      unit: item.unit,
      suggestedMin: item.suggestedMin,
      suggestedMax: item.suggestedMax,
      datasets: [{
        label: item.label,
        data: observations.map(o => o[item.prop]),
        borderColor: item.color.border,
        backgroundColor: item.color.bg,
        borderWidth: 2.5,
        tension: 0.35,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 5
      }]
    };
  },

  /**
   * Append a real-time observation point to an existing chart smoothly
   */
  appendPoint(canvasId, timeLabel, values, maxPoints = 50) {
    const chart = this.charts[canvasId];
    if (!chart) return;

    chart.data.labels.push(timeLabel);

    if (Array.isArray(values)) {
      values.forEach((val, idx) => {
        if (chart.data.datasets[idx]) {
          chart.data.datasets[idx].data.push(val);
        }
      });
    } else {
      if (chart.data.datasets[0]) {
        chart.data.datasets[0].data.push(values);
      }
    }

    if (chart.data.labels.length > maxPoints) {
      chart.data.labels.shift();
      chart.data.datasets.forEach(ds => ds.data.shift());
    }

    chart.update('none'); // Update without full slow animation for high framerate
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChartManager;
}
