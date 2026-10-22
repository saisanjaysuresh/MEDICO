/* ==========================================================================
   MEDICO - SCREEN 2: MAIN CLINICAL MONITORING DASHBOARD CONTROLLER
   ========================================================================== */

const Dashboard = {
  activeFilter: 'all',
  searchQuery: '',
  sortCol: 'id',
  sortAsc: true,

  init() {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);

    this.setupFiltersAndSearch();
    this.setupMiniCharts();
    this.render();

    // Subscribe to simulation engine ticks
    if (typeof SimulationEngine !== 'undefined') {
      SimulationEngine.onUpdate(updates => this.handleSimUpdate(updates));
      SimulationEngine.onAlert(() => {
        this.renderCriticalAttention();
        this.renderSummaryMetrics();
      });
    }
  },

  updateClock() {
    const clockEl = document.getElementById('dashboard-live-clock');
    if (clockEl) {
      const now = new Date();
      clockEl.textContent = now.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) + ' • ' + now.toLocaleTimeString();
    }
  },

  setupFiltersAndSearch() {
    const searchInput = document.getElementById('dashboard-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderTable();
      });
    }

    const filterBtns = document.querySelectorAll('.vitals-table-toolbar .filter-pill');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFilter = btn.dataset.filter || 'all';
        this.renderTable();
      });
    });

    // Table Header Sorting
    const sortHeaders = document.querySelectorAll('.med-table th.sortable');
    sortHeaders.forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (this.sortCol === col) {
          this.sortAsc = !this.sortAsc;
        } else {
          this.sortCol = col;
          this.sortAsc = true;
        }
        this.renderTable();
      });
    });
  },

  setupMiniCharts() {
    if (typeof ChartManager === 'undefined' || typeof SimulationEngine === 'undefined') return;

    // Use MED-101 observations as the aggregate reference stream
    const history = SimulationEngine.getPatientHistory('MED-101', 15);

    ChartManager.createMiniSparkline(
      'chart-spark-hr',
      'Heart Rate',
      '#EF4444',
      history.map(h => ({ timestamp: h.timestamp, value: h.heartRate }))
    );

    ChartManager.createMiniSparkline(
      'chart-spark-spo2',
      'Oxygen Saturation',
      '#0284C7',
      history.map(h => ({ timestamp: h.timestamp, value: h.spo2 }))
    );

    ChartManager.createMiniSparkline(
      'chart-spark-bp',
      'Systolic BP',
      '#8B5CF6',
      history.map(h => ({ timestamp: h.timestamp, value: h.bpSystolic }))
    );

    ChartManager.createMiniSparkline(
      'chart-spark-temp',
      'Body Temp',
      '#F59E0B',
      history.map(h => ({ timestamp: h.timestamp, value: h.temperature }))
    );
  },

  render() {
    this.renderSummaryMetrics();
    this.renderTable();
    this.renderCriticalAttention();
    this.renderRecentActivity();
  },

  renderSummaryMetrics() {
    if (typeof SimulationEngine === 'undefined') return;

    const patients = SimulationEngine.patients || [];
    const totalPatients = patients.length;
    const monitoredPatients = patients.filter(p => p.monitoringStatus === 'monitored').length;
    const activeAlerts = SimulationEngine.activeAlerts || [];
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical').length;

    // Count patients requiring attention (having at least one active warning or critical alert)
    const alertPatientIds = new Set(activeAlerts.map(a => a.patientId));
    const requiringAttention = alertPatientIds.size;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setVal('metric-total-patients', totalPatients);
    setVal('metric-monitored-patients', monitoredPatients);
    setVal('metric-attention-patients', requiringAttention);
    setVal('metric-active-alerts', activeAlerts.length);
    setVal('metric-critical-alerts', criticalAlerts);
  },

  renderTable() {
    if (typeof SimulationEngine === 'undefined') return;

    const tbody = document.getElementById('dashboard-vitals-tbody');
    if (!tbody) return;

    let list = [...SimulationEngine.patients];

    // Filter by Search Query
    if (this.searchQuery) {
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(this.searchQuery) ||
          p.id.toLowerCase().includes(this.searchQuery) ||
          p.room.toLowerCase().includes(this.searchQuery)
      );
    }

    // Filter by Status Tab
    const activeAlerts = SimulationEngine.activeAlerts || [];
    if (this.activeFilter === 'warning') {
      const warningIds = new Set(activeAlerts.filter(a => a.severity === 'warning').map(a => a.patientId));
      list = list.filter(p => warningIds.has(p.id));
    } else if (this.activeFilter === 'critical') {
      const criticalIds = new Set(activeAlerts.filter(a => a.severity === 'critical').map(a => a.patientId));
      list = list.filter(p => criticalIds.has(p.id));
    } else if (this.activeFilter === 'disconnected') {
      list = list.filter(p => p.monitoringStatus === 'disconnected' || p.current?.hr === null);
    } else if (this.activeFilter === 'normal') {
      const alertIds = new Set(activeAlerts.map(a => a.patientId));
      list = list.filter(p => !alertIds.has(p.id) && p.monitoringStatus === 'monitored' && p.current?.hr !== null);
    }

    // Sorting
    list.sort((a, b) => {
      let valA, valB;
      if (this.sortCol === 'name') {
        valA = a.name;
        valB = b.name;
      } else if (this.sortCol === 'hr') {
        valA = a.current?.hr || 0;
        valB = b.current?.hr || 0;
      } else if (this.sortCol === 'spo2') {
        valA = a.current?.spo2 || 0;
        valB = b.current?.spo2 || 0;
      } else {
        valA = a.id;
        valB = b.id;
      }

      if (valA < valB) return this.sortAsc ? -1 : 1;
      if (valA > valB) return this.sortAsc ? 1 : -1;
      return 0;
    });

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 36px 16px;">
            <div class="empty-state">
              <div class="empty-state-title">No patients match your filter</div>
              <div class="empty-state-desc">Try resetting your search query or selecting "All Patients".</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list
      .map(p => {
        const cur = p.current || {};
        const isDis = p.monitoringStatus === 'disconnected' || cur.hr === null;

        // Determine Vital Severity Classes
        const hrClass = cur.hr >= 120 || cur.hr <= 50 ? 'val-critical' : cur.hr > 100 || cur.hr < 60 ? 'val-warning' : '';
        const spo2Class = cur.spo2 < 90 ? 'val-critical' : cur.spo2 < 95 ? 'val-warning' : '';
        const bpClass = (cur.bpSys >= 140 || cur.bpSys < 90) ? 'val-critical' : (cur.bpSys > 130) ? 'val-warning' : '';
        const tempClass = cur.temp >= 38.4 ? 'val-critical' : cur.temp > 37.6 ? 'val-warning' : '';

        // Status badge
        const hasCritical = activeAlerts.some(a => a.patientId === p.id && a.severity === 'critical');
        const hasWarning = activeAlerts.some(a => a.patientId === p.id && a.severity === 'warning');
        const statusBadge = isDis
          ? `<span class="status-pill status-stale"><span class="pulse-dot" style="background:#64748B;"></span> Offline</span>`
          : hasCritical
          ? `<span class="status-pill status-critical"><i data-lucide="alert-octagon" class="icon-sm"></i> Critical</span>`
          : hasWarning
          ? `<span class="status-pill status-warning"><i data-lucide="alert-triangle" class="icon-sm"></i> Warning</span>`
          : `<span class="status-pill status-normal"><span class="pulse-green"></span> Stable</span>`;

        return `
        <tr id="row-patient-${p.id}">
          <td>
            <a href="patient-monitoring.html?id=${p.id}" class="patient-cell-name">
              ${Utils.escapeHtml(p.name)}
            </a>
            <div class="patient-cell-meta">${p.id} • ${p.age}y ${p.gender.charAt(0)}</div>
          </td>
          <td>
            <span class="font-medium">${Utils.escapeHtml(p.room)}</span>
            <div class="patient-cell-meta">${Utils.escapeHtml(p.clinician)}</div>
          </td>
          <td id="cell-hr-${p.id}">
            <div class="vital-cell">
              <span class="vital-cell-num ${hrClass}">${isDis ? '--' : cur.hr}</span>
              <span class="vital-cell-unit">bpm</span>
            </div>
          </td>
          <td id="cell-spo2-${p.id}">
            <div class="vital-cell">
              <span class="vital-cell-num ${spo2Class}">${isDis ? '--' : cur.spo2 + '%'}</span>
              <span class="vital-cell-unit">SpO₂</span>
            </div>
          </td>
          <td id="cell-bp-${p.id}">
            <div class="vital-cell">
              <span class="vital-cell-num ${bpClass}">${isDis ? '--' : `${cur.bpSys}/${cur.bpDia}`}</span>
              <span class="vital-cell-unit">mmHg</span>
            </div>
          </td>
          <td id="cell-resp-${p.id}">
            <div class="vital-cell">
              <span class="vital-cell-num">${isDis ? '--' : cur.resp}</span>
              <span class="vital-cell-unit">/min</span>
            </div>
          </td>
          <td id="cell-temp-${p.id}">
            <div class="vital-cell">
              <span class="vital-cell-num ${tempClass}">${isDis ? '--' : `${cur.temp}°C`}</span>
              <span class="vital-cell-unit">Celsius</span>
            </div>
          </td>
          <td id="cell-time-${p.id}">
            <span class="text-xs text-secondary">${Utils.timeAgo(cur.lastUpdated)}</span>
          </td>
          <td>${statusBadge}</td>
          <td>
            <a href="patient-monitoring.html?id=${p.id}" class="btn btn-outline btn-sm">
              <i data-lucide="activity" class="icon-sm"></i>
              Monitor
            </a>
          </td>
        </tr>
      `;
      })
      .join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  handleSimUpdate(updatedPayload) {
    if (!updatedPayload) return;

    // Update table rows in-place with micro-flash animation
    updatedPayload.forEach(({ patient, observation }) => {
      const isDis = patient.monitoringStatus === 'disconnected' || observation.heartRate === null;

      const updateCell = (cellId, text, addClass) => {
        const el = document.getElementById(cellId);
        if (el) {
          const numEl = el.querySelector('.vital-cell-num');
          if (numEl) {
            numEl.textContent = text;
            numEl.className = `vital-cell-num ${addClass || ''}`;
          }
          el.classList.add('vital-updated');
          setTimeout(() => el.classList.remove('vital-updated'), 700);
        }
      };

      const hrClass = observation.heartRate >= 120 || observation.heartRate <= 50 ? 'val-critical' : observation.heartRate > 100 || observation.heartRate < 60 ? 'val-warning' : '';
      const spo2Class = observation.spo2 < 90 ? 'val-critical' : observation.spo2 < 95 ? 'val-warning' : '';
      const bpClass = (observation.bpSystolic >= 140 || observation.bpSystolic < 90) ? 'val-critical' : (observation.bpSystolic > 130) ? 'val-warning' : '';
      const tempClass = observation.temperature >= 38.4 ? 'val-critical' : observation.temperature > 37.6 ? 'val-warning' : '';

      updateCell(`cell-hr-${patient.id}`, isDis ? '--' : observation.heartRate, hrClass);
      updateCell(`cell-spo2-${patient.id}`, isDis ? '--' : observation.spo2 + '%', spo2Class);
      updateCell(`cell-bp-${patient.id}`, isDis ? '--' : `${observation.bpSystolic}/${observation.bpDiastolic}`, bpClass);
      updateCell(`cell-resp-${patient.id}`, isDis ? '--' : observation.respiratoryRate, '');
      updateCell(`cell-temp-${patient.id}`, isDis ? '--' : `${observation.temperature}°C`, tempClass);

      const timeEl = document.getElementById(`cell-time-${patient.id}`);
      if (timeEl) timeEl.textContent = Utils.timeAgo(observation.timestamp);

      // If this is MED-101, push real-time point to dashboard mini charts
      if (patient.id === 'MED-101' && !isDis && typeof ChartManager !== 'undefined') {
        const t = Utils.formatTime(observation.timestamp);
        ChartManager.appendPoint('chart-spark-hr', t, observation.heartRate);
        ChartManager.appendPoint('chart-spark-spo2', t, observation.spo2);
        ChartManager.appendPoint('chart-spark-bp', t, observation.bpSystolic);
        ChartManager.appendPoint('chart-spark-temp', t, observation.temperature);

        // Update mini-chart header values
        const setVal = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.textContent = val;
        };
        setVal('spark-val-hr', `${observation.heartRate} bpm`);
        setVal('spark-val-spo2', `${observation.spo2}%`);
        setVal('spark-val-bp', `${observation.bpSystolic}/${observation.bpDiastolic}`);
        setVal('spark-val-temp', `${observation.temperature}°C`);
      }
    });

    this.renderSummaryMetrics();
  },

  renderCriticalAttention() {
    const container = document.getElementById('dashboard-critical-alerts-list');
    if (!container || typeof SimulationEngine === 'undefined') return;

    const active = SimulationEngine.activeAlerts || [];
    const highPriority = active.slice(0, 5);

    if (highPriority.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 24px 10px;">
          <div class="empty-state-icon">
            <i data-lucide="shield-check"></i>
          </div>
          <div class="empty-state-title" style="font-size: 0.95rem;">All Patients Stabilized</div>
          <div class="empty-state-desc" style="font-size: 0.8rem;">No critical physiological threshold violations currently detected.</div>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    container.innerHTML = highPriority
      .map(
        a => `
      <div class="alert-item-card alert-sev-${a.severity}">
        <div class="alert-item-header">
          <span class="alert-patient-name">
            <i data-lucide="${a.severity === 'critical' ? 'alert-octagon' : 'alert-triangle'}" class="icon-sm"></i>
            ${Utils.escapeHtml(a.patientName)}
          </span>
          <span class="alert-time">${Utils.timeAgo(a.timestamp)}</span>
        </div>
        <div class="alert-item-body">${Utils.escapeHtml(a.message)}</div>
        <div class="alert-item-actions">
          <span class="status-pill status-${a.severity}">Observed: ${Utils.escapeHtml(a.observedValue)}</span>
          <a href="patient-monitoring.html?id=${a.patientId}" class="btn btn-outline btn-sm">Inspect</a>
        </div>
      </div>
    `
      )
      .join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  renderRecentActivity() {
    const container = document.getElementById('dashboard-recent-activity');
    if (!container) return;

    const events = [
      {
        type: 'alert',
        msg: 'Critical Alert triggered for Eleanor Vance (Tachycardia 132 bpm)',
        time: '2 mins ago'
      },
      {
        type: 'ai',
        msg: 'AI Insights generated for Marcus Reed (Bacterial Pneumonia Watch)',
        time: '8 mins ago'
      },
      {
        type: 'patient',
        msg: 'Dr. Sarah Jenkins reviewed ICU-Bed 01 telemetry series',
        time: '14 mins ago'
      },
      {
        type: 'patient',
        msg: 'Simulated Device Lead Check completed across all telemetry units',
        time: '22 mins ago'
      }
    ];

    container.innerHTML = events
      .map(
        e => `
      <div class="activity-item type-${e.type}">
        <div class="activity-msg">${Utils.escapeHtml(e.msg)}</div>
        <div class="activity-time">${e.time}</div>
      </div>
    `
      )
      .join('');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('dashboard-vitals-tbody')) {
    Dashboard.init();
  }
});
