/* ==========================================================================
   MEDICO - SCREEN 4: INDIVIDUAL PATIENT MONITORING WORKSPACE CONTROLLER
   ========================================================================== */

const PatientMonitoring = {
  patientId: 'MED-101',
  activeParam: 'heartRate',
  activeRange: '24h',
  notes: {}, // patientId -> array of notes

  init() {
    // Parse URL parameter: patient-monitoring.html?id=MED-XXX
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    if (idParam && typeof SimulationEngine !== 'undefined' && SimulationEngine.getPatient(idParam)) {
      this.patientId = idParam;
    }

    this.loadNotes();
    this.setupTabs();
    this.setupChartControls();
    this.setupNotesForm();
    this.render();

    // Subscribe to live simulation ticks
    if (typeof SimulationEngine !== 'undefined') {
      SimulationEngine.onUpdate(updates => {
        const myUpdate = updates.find(u => u.patient.id === this.patientId);
        if (myUpdate) {
          this.handleLiveUpdate(myUpdate.patient, myUpdate.observation);
        }
      });
    }
  },

  loadNotes() {
    const saved = localStorage.getItem('medico_patient_notes');
    if (saved) {
      try {
        this.notes = JSON.parse(saved);
      } catch (e) {
        this.notes = {};
      }
    }
    // Seed sample clinical notes if not present
    if (!this.notes[this.patientId]) {
      this.notes[this.patientId] = [
        {
          id: 'NOTE-1',
          author: 'Dr. Sarah Jenkins',
          role: 'Attending Physician',
          timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
          text: 'Patient resting comfortably. Post-operative telemetry indicates stable sinus rhythm without acute ectopic runs. Continue beta-blocker titration as tolerated.'
        },
        {
          id: 'NOTE-2',
          author: 'Nurse Marcus O\'Connor',
          role: 'Critical Care Staff Nurse',
          timestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
          text: 'Vitals stable on 2L NC. Wound dressing dry and intact. Patient ambulated 50 feet with physical therapy assistance.'
        }
      ];
      this.saveNotes();
    }
  },

  saveNotes() {
    localStorage.setItem('medico_patient_notes', JSON.stringify(this.notes));
  },

  setupTabs() {
    const tabBtns = document.querySelectorAll('.nav-tabs .tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const targetTab = btn.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
        });

        const activeContent = document.getElementById(`tab-content-${targetTab}`);
        if (activeContent) activeContent.classList.add('active');
      });
    });
  },

  setupChartControls() {
    // Parameter buttons
    const paramBtns = document.querySelectorAll('[data-chart-param]');
    paramBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        paramBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeParam = btn.dataset.chartParam;
        this.renderChart();
      });
    });

    // Time range buttons
    const rangeBtns = document.querySelectorAll('[data-chart-range]');
    rangeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        rangeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeRange = btn.dataset.chartRange;
        this.renderChart();
      });
    });
  },

  setupNotesForm() {
    const form = document.getElementById('add-clinical-note-form');
    if (!form) return;

    form.addEventListener('submit', e => {
      e.preventDefault();
      const textarea = document.getElementById('clinical-note-input');
      const text = textarea ? textarea.value.trim() : '';

      if (!text) {
        App.toast('Empty Note', 'Please enter text before saving a clinical note.', 'warning');
        return;
      }

      const currentUser = Auth.getCurrentUser();
      const newNote = {
        id: `NOTE-${Date.now()}`,
        author: currentUser ? currentUser.name : 'Attending Staff',
        role: currentUser ? currentUser.roleTitle : 'Medical Staff',
        timestamp: new Date().toISOString(),
        text
      };

      if (!this.notes[this.patientId]) this.notes[this.patientId] = [];
      this.notes[this.patientId].unshift(newNote);
      this.saveNotes();

      textarea.value = '';
      App.toast('Clinical Note Saved', 'Note recorded into patient electronic health record.', 'success');
      this.renderNotesTab();
    });
  },

  getPatient() {
    if (typeof SimulationEngine === 'undefined') return null;
    return SimulationEngine.getPatient(this.patientId) || SimulationEngine.patients[0];
  },

  getObservations() {
    if (typeof SimulationEngine === 'undefined') return [];
    let obs = SimulationEngine.observations[this.patientId] || [];

    // Filter by time range
    const now = Date.now();
    let durationMs = 24 * 60 * 60 * 1000; // default 24h
    if (this.activeRange === '15m') durationMs = 15 * 60 * 1000;
    else if (this.activeRange === '1h') durationMs = 60 * 60 * 1000;
    else if (this.activeRange === '6h') durationMs = 6 * 60 * 60 * 1000;

    const filtered = obs.filter(o => now - new Date(o.timestamp).getTime() <= durationMs);
    return filtered.length >= 2 ? filtered : obs.slice(-25);
  },

  render() {
    const patient = this.getPatient();
    if (!patient) return;

    this.renderHeader(patient);
    this.renderVitalGauges(patient);
    this.renderChart();
    this.renderOverviewTab(patient);
    this.renderVitalsHistoryTab();
    this.renderMedicalHistoryTab(patient);
    this.renderMedicationsTab(patient);
    this.renderAlertsTab(patient);
    this.renderNotesTab();
  },

  renderHeader(patient) {
    const setHtml = (id, html) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    };

    setHtml('pm-patient-name', Utils.escapeHtml(patient.name));
    setHtml('pm-patient-id', `${patient.id} • ${patient.age} yrs (${patient.gender})`);
    setHtml('pm-patient-room', `<i data-lucide="map-pin" class="icon-sm"></i> ${Utils.escapeHtml(patient.room)}`);
    setHtml('pm-patient-clinician', `<i data-lucide="user-check" class="icon-sm"></i> ${Utils.escapeHtml(patient.clinician)}`);
    setHtml('pm-patient-diagnosis', `<i data-lucide="stethoscope" class="icon-sm"></i> ${Utils.escapeHtml(patient.diagnosis)}`);
    setHtml('pm-patient-avatar', patient.name.split(' ').map(n => n[0]).join('').substring(0, 2));

    const statusBadge = document.getElementById('pm-patient-status-badge');
    if (statusBadge) {
      statusBadge.className = `status-pill ${patient.monitoringStatus === 'monitored' ? 'status-normal' : 'status-stale'}`;
      statusBadge.innerHTML = patient.monitoringStatus === 'monitored'
        ? `<span class="pulse-green"></span> Live Monitored`
        : `<span class="pulse-dot"></span> Disconnected`;
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  renderVitalGauges(patient) {
    const cur = patient.current || {};
    const isDis = patient.monitoringStatus === 'disconnected' || cur.hr === null;

    const setGauge = (prefix, val, unit, isWarning, isCritical) => {
      const numEl = document.getElementById(`pm-val-${prefix}`);
      if (numEl) {
        numEl.textContent = isDis ? '--' : val;
        numEl.className = `vital-card-big-num ${isCritical ? 'val-critical' : isWarning ? 'val-warning' : ''}`;
      }
    };

    setGauge('hr', cur.hr, 'bpm', cur.hr > 100 || cur.hr < 60, cur.hr >= 120 || cur.hr <= 50);
    setGauge('spo2', cur.spo2 ? `${cur.spo2}%` : '--', '%', cur.spo2 < 95, cur.spo2 < 90);
    setGauge('bp', cur.bpSys ? `${cur.bpSys}/${cur.bpDia}` : '--', 'mmHg', cur.bpSys > 130, cur.bpSys >= 140 || cur.bpSys < 90);
    setGauge('resp', cur.resp, '/min', cur.resp > 20 || cur.resp < 12, cur.resp >= 25 || cur.resp <= 9);
    setGauge('temp', cur.temp ? `${cur.temp}°C` : '--', '°C', cur.temp > 37.6, cur.temp >= 38.4);
  },

  renderChart() {
    if (typeof ChartManager === 'undefined') return;
    const observations = this.getObservations();
    ChartManager.createPatientMonitoringChart('patient-timeseries-chart', observations, this.activeParam);
  },

  handleLiveUpdate(patient, observation) {
    this.renderVitalGauges(patient);

    // Append point to Chart.js without re-creating
    if (typeof ChartManager !== 'undefined' && !observation.isDisconnected) {
      const t = Utils.formatTime(observation.timestamp);
      if (this.activeParam === 'bp') {
        ChartManager.appendPoint('patient-timeseries-chart', t, [observation.bpSystolic, observation.bpDiastolic]);
      } else {
        const valMap = {
          heartRate: observation.heartRate,
          spo2: observation.spo2,
          respiratoryRate: observation.respiratoryRate,
          temperature: observation.temperature
        };
        ChartManager.appendPoint('patient-timeseries-chart', t, valMap[this.activeParam]);
      }
    }
  },

  renderOverviewTab(patient) {
    const overviewEl = document.getElementById('pm-overview-content');
    if (!overviewEl) return;

    overviewEl.innerHTML = `
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
        <div class="card" style="padding: 20px;">
          <h4 class="card-title" style="margin-bottom: 14px;">
            <i data-lucide="user" class="icon-md"></i> Patient Clinical Demographics
          </h4>
          <div style="display:flex; flex-direction:column; gap: 8px; font-size: var(--font-size-sm);">
            <div><strong>Full Name:</strong> ${Utils.escapeHtml(patient.name)}</div>
            <div><strong>Patient Identifier:</strong> ${patient.id}</div>
            <div><strong>Age & Gender:</strong> ${patient.age} years old • ${patient.gender}</div>
            <div><strong>Inpatient Location:</strong> ${Utils.escapeHtml(patient.room)}</div>
            <div><strong>Primary Attending:</strong> ${Utils.escapeHtml(patient.clinician)}</div>
            <div><strong>Admission Diagnosis:</strong> ${Utils.escapeHtml(patient.diagnosis)}</div>
          </div>
        </div>

        <div class="card" style="padding: 20px;">
          <h4 class="card-title" style="margin-bottom: 14px;">
            <i data-lucide="sliders" class="icon-md"></i> Established Baselines
          </h4>
          <div style="display:flex; flex-direction:column; gap: 8px; font-size: var(--font-size-sm);">
            <div><strong>Baseline Heart Rate:</strong> ${patient.baseline.hr} bpm</div>
            <div><strong>Baseline SpO₂:</strong> ${patient.baseline.spo2}%</div>
            <div><strong>Baseline Blood Pressure:</strong> ${patient.baseline.bpSys}/${patient.baseline.bpDia} mmHg</div>
            <div><strong>Baseline Respiratory Rate:</strong> ${patient.baseline.resp} breaths/min</div>
            <div><strong>Baseline Temperature:</strong> ${patient.baseline.temp}°C</div>
          </div>
        </div>
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  renderVitalsHistoryTab() {
    const tbody = document.getElementById('pm-vitals-history-tbody');
    if (!tbody || typeof SimulationEngine === 'undefined') return;

    const obs = (SimulationEngine.observations[this.patientId] || []).slice(-30).reverse();
    if (obs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">No historical telemetry recorded.</td></tr>`;
      return;
    }

    tbody.innerHTML = obs
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

  renderMedicalHistoryTab(patient) {
    const container = document.getElementById('pm-medical-history-content');
    if (!container) return;

    container.innerHTML = `
      <div class="card" style="padding: 20px;">
        <h4 class="card-title" style="margin-bottom: 14px;">Clinical Background & Comorbidities</h4>
        <ul style="list-style: disc; margin-left: 20px; font-size: var(--font-size-sm); color: var(--color-text-secondary); display:flex; flex-direction:column; gap:8px;">
          <li>Primary condition: ${Utils.escapeHtml(patient.diagnosis)}</li>
          <li>Cardiovascular history: Monitored with telemetry unit.</li>
          <li>Allergies recorded: ${patient.allergies ? patient.allergies.join(', ') : 'None documented'}</li>
          <li>Surgical history: Inpatient surgical review completed upon admission.</li>
        </ul>
      </div>
    `;
  },

  renderMedicationsTab(patient) {
    const container = document.getElementById('pm-medications-content');
    if (!container) return;

    container.innerHTML = `
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div class="card" style="padding: 20px;">
          <h4 class="card-title" style="margin-bottom: 14px; color: var(--color-critical);">
            <i data-lucide="alert-circle" class="icon-md"></i> Documented Allergies
          </h4>
          <div style="display:flex; flex-direction:column; gap: 6px;">
            ${(patient.allergies || ['None']).map(a => `<div class="status-pill status-critical" style="align-self: flex-start;">${Utils.escapeHtml(a)}</div>`).join('')}
          </div>
        </div>

        <div class="card" style="padding: 20px;">
          <h4 class="card-title" style="margin-bottom: 14px;">
            <i data-lucide="pill" class="icon-md"></i> Active Inpatient Medications
          </h4>
          <ul style="list-style: disc; margin-left: 20px; font-size: var(--font-size-sm); display:flex; flex-direction:column; gap:6px;">
            ${(patient.medications || ['No active orders']).map(m => `<li>${Utils.escapeHtml(m)}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  renderAlertsTab(patient) {
    const container = document.getElementById('pm-alerts-list');
    if (!container || typeof SimulationEngine === 'undefined') return;

    const patientAlerts = (SimulationEngine.alertsHistory || []).filter(a => a.patientId === patient.id);

    if (patientAlerts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="check-circle-2"></i></div>
          <div class="empty-state-title">No Alerts for ${Utils.escapeHtml(patient.name)}</div>
          <div class="empty-state-desc">All vitals within normal parameters.</div>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    container.innerHTML = patientAlerts
      .map(
        a => `
      <div class="alert-item-card alert-sev-${a.severity}" style="margin-bottom: 12px;">
        <div class="alert-item-header">
          <span style="font-weight: 600; font-size: var(--font-size-sm);">${Utils.escapeHtml(a.message)}</span>
          <span class="status-pill status-${a.status === 'resolved' ? 'normal' : a.severity}">${a.status.toUpperCase()}</span>
        </div>
        <div class="alert-item-body">
          <strong>Observed Value:</strong> ${a.observedValue} • <strong>Threshold:</strong> ${a.threshold} • <strong>Time:</strong> ${Utils.formatDateTime(a.timestamp)}
        </div>
        ${a.resolutionNote ? `<div style="font-size:0.75rem; color:var(--color-normal-text); margin-top:4px;"><strong>Resolution:</strong> ${Utils.escapeHtml(a.resolutionNote)}</div>` : ''}
      </div>
    `
      )
      .join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  renderNotesTab() {
    const container = document.getElementById('pm-notes-list');
    if (!container) return;

    const patientNotes = this.notes[this.patientId] || [];

    if (patientNotes.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-desc">No clinical notes recorded yet.</div></div>`;
      return;
    }

    container.innerHTML = patientNotes
      .map(
        n => `
      <div class="card" style="padding: 16px; margin-bottom: 12px; background-color: var(--color-surface);">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px;">
          <div style="display:flex; align-items:center; gap: 8px;">
            <strong>${Utils.escapeHtml(n.author)}</strong>
            <span class="text-xs text-secondary">(${Utils.escapeHtml(n.role)})</span>
          </div>
          <span class="text-xs text-tertiary">${Utils.timeAgo(n.timestamp)} • ${Utils.formatDateTime(n.timestamp)}</span>
        </div>
        <div style="font-size: var(--font-size-sm); color: var(--color-text-primary); line-height: 1.5;">
          ${Utils.escapeHtml(n.text)}
        </div>
      </div>
    `
      )
      .join('');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('patient-monitoring-workspace')) {
    PatientMonitoring.init();
  }
});
