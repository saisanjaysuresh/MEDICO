/* ==========================================================================
   MEDICO - SCREEN 7: VITALS HISTORY & REPORTS CONTROLLER
   ========================================================================== */

const Reports = {
  selectedPatientId: 'MED-101',
  selectedParam: 'heartRate',
  selectedRange: '24h',

  init() {
    this.setupSelectors();
    this.setupExportButtons();
    this.render();
  },

  setupSelectors() {
    const patientSelect = document.getElementById('report-patient-select');
    if (patientSelect && typeof SimulationEngine !== 'undefined') {
      patientSelect.innerHTML = SimulationEngine.patients
        .map(
          p => `
        <option value="${p.id}" ${p.id === this.selectedPatientId ? 'selected' : ''}>
          ${p.id} — ${p.name} (${p.room})
        </option>
      `
        )
        .join('');

      patientSelect.addEventListener('change', e => {
        this.selectedPatientId = e.target.value;
        this.render();
      });
    }

    const paramSelect = document.getElementById('report-param-select');
    if (paramSelect) {
      paramSelect.addEventListener('change', e => {
        this.selectedParam = e.target.value;
        this.render();
      });
    }

    const rangeSelect = document.getElementById('report-range-select');
    if (rangeSelect) {
      rangeSelect.addEventListener('change', e => {
        this.selectedRange = e.target.value;
        this.render();
      });
    }
  },

  setupExportButtons() {
    const csvBtn = document.getElementById('report-export-csv-btn');
    if (csvBtn) {
      csvBtn.addEventListener('click', () => this.exportCsv());
    }

    const printBtn = document.getElementById('report-print-btn');
    if (printBtn) {
      printBtn.addEventListener('click', () => window.print());
    }
  },

  getPatient() {
    if (typeof SimulationEngine === 'undefined') return null;
    return SimulationEngine.getPatient(this.selectedPatientId) || SimulationEngine.patients[0];
  },

  getObservations() {
    if (typeof SimulationEngine === 'undefined') return [];
    let list = SimulationEngine.observations[this.selectedPatientId] || [];

    const now = Date.now();
    let durationMs = 24 * 60 * 60 * 1000;
    if (this.selectedRange === '1h') durationMs = 60 * 60 * 1000;
    else if (this.selectedRange === '6h') durationMs = 6 * 60 * 60 * 1000;

    return list.filter(o => now - new Date(o.timestamp).getTime() <= durationMs);
  },

  render() {
    const patient = this.getPatient();
    if (!patient) return;

    const observations = this.getObservations();

    this.renderHeader(patient, observations);
    this.renderStatistics(observations);
    this.renderChart(observations);
    this.renderTable(observations);
  },

  renderHeader(patient, observations) {
    const nameEl = document.getElementById('report-patient-name-display');
    const detailsEl = document.getElementById('report-patient-details-display');

    if (nameEl) nameEl.textContent = `${patient.name} (${patient.id})`;
    if (detailsEl) {
      detailsEl.textContent = `Room: ${patient.room} • Clinician: ${patient.clinician} • Diagnosis: ${patient.diagnosis} • Reporting Window: Last ${this.selectedRange.toUpperCase()} (${observations.length} Observations)`;
    }
  },

  renderStatistics(observations) {
    const param = this.selectedParam;
    const values = observations
      .map(o => o[param])
      .filter(v => typeof v === 'number' && !isNaN(v));

    const min = Utils.calcMin(values);
    const max = Utils.calcMax(values);
    const mean = Utils.calcMean(values);
    const median = Utils.calcMedian(values);
    const count = values.length;
    const latest = observations.length ? Utils.formatTime(observations[observations.length - 1].timestamp) : '--';

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setVal('stat-min', min || '--');
    setVal('stat-max', max || '--');
    setVal('stat-mean', mean || '--');
    setVal('stat-median', median || '--');
    setVal('stat-count', count);
    setVal('stat-latest-time', latest);
  },

  renderChart(observations) {
    if (typeof ChartManager === 'undefined') return;
    ChartManager.createPatientMonitoringChart('report-timeseries-chart', observations, this.selectedParam);
  },

  renderTable(observations) {
    const tbody = document.getElementById('report-observations-tbody');
    if (!tbody) return;

    if (observations.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px;">No telemetry observations recorded during this period.</td></tr>`;
      return;
    }

    tbody.innerHTML = observations
      .slice(-40)
      .reverse()
      .map(
        o => `
      <tr>
        <td>${Utils.formatDateTime(o.timestamp)}</td>
        <td><strong>${o.heartRate ?? '--'}</strong> bpm</td>
        <td><strong>${o.spo2 ?? '--'}%</strong></td>
        <td><strong>${o.bpSystolic ? `${o.bpSystolic}/${o.bpDiastolic}` : '--'}</strong> mmHg</td>
        <td><strong>${o.respiratoryRate ?? '--'}</strong> /min</td>
        <td><strong>${o.temperature ? `${o.temperature}°C` : '--'}</strong></td>
        <td><span class="status-pill status-normal">${o.dataSource}</span></td>
      </tr>
    `
      )
      .join('');
  },

  exportCsv() {
    const patient = this.getPatient();
    const observations = this.getObservations();

    if (!patient || observations.length === 0) {
      App.toast('Export Notice', 'No observations available to export for this patient.', 'warning');
      return;
    }

    const rows = observations.map(o => ({
      'Patient ID': patient.id,
      'Patient Name': patient.name,
      'Timestamp': o.timestamp,
      'Heart Rate (bpm)': o.heartRate ?? '',
      'SpO2 (%)': o.spo2 ?? '',
      'Systolic BP (mmHg)': o.bpSystolic ?? '',
      'Diastolic BP (mmHg)': o.bpDiastolic ?? '',
      'Respiratory Rate (/min)': o.respiratoryRate ?? '',
      'Temperature (C)': o.temperature ?? '',
      'Data Source': o.dataSource,
      'Is Simulated': o.isSimulated ? 'YES (DEMO)' : 'NO (PHYSICAL)'
    }));

    const filename = `medico_report_${patient.id}_${Date.now()}.csv`;
    Utils.exportToCsv(filename, rows);
    App.toast('CSV Downloaded', `Exported ${rows.length} telemetry records for ${patient.name}.`, 'success');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('reports-workspace')) {
    Reports.init();
  }
});
