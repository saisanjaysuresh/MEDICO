/* ==========================================================================
   MEDICO - SCREEN 3: PATIENT DIRECTORY & REGISTRATION CONTROLLER
   ========================================================================== */

const PatientDirectory = {
  viewMode: 'table', // 'table' or 'grid'
  searchQuery: '',
  statusFilter: 'all',
  editingPatientId: null,

  init() {
    this.setupListeners();
    this.render();

    // Re-render when simulation ticks so current vitals in patient directory remain live
    if (typeof SimulationEngine !== 'undefined') {
      SimulationEngine.onUpdate(() => this.render());
    }
  },

  setupListeners() {
    // Search input
    const searchInput = document.getElementById('patient-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.render();
      });
    }

    // Status filter
    const statusSelect = document.getElementById('patient-status-filter');
    if (statusSelect) {
      statusSelect.addEventListener('change', e => {
        this.statusFilter = e.target.value;
        this.render();
      });
    }

    // View mode toggle
    const viewTableBtn = document.getElementById('view-mode-table-btn');
    const viewGridBtn = document.getElementById('view-mode-grid-btn');
    if (viewTableBtn && viewGridBtn) {
      viewTableBtn.addEventListener('click', () => {
        this.viewMode = 'table';
        viewTableBtn.classList.add('active');
        viewGridBtn.classList.remove('active');
        this.render();
      });
      viewGridBtn.addEventListener('click', () => {
        this.viewMode = 'grid';
        viewGridBtn.classList.add('active');
        viewTableBtn.classList.remove('active');
        this.render();
      });
    }

    // Add Patient button
    const addPatientBtn = document.getElementById('add-patient-btn');
    if (addPatientBtn) {
      addPatientBtn.addEventListener('click', () => this.openPatientModal());
    }

    // Modal Close buttons
    const modalClose = document.getElementById('patient-modal-close');
    const modalCancel = document.getElementById('patient-modal-cancel');
    const modalBackdrop = document.getElementById('patient-modal-backdrop');

    const closeModal = () => {
      if (modalBackdrop) modalBackdrop.classList.remove('open');
      this.editingPatientId = null;
    };

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalCancel) modalCancel.addEventListener('click', closeModal);
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', e => {
        if (e.target === modalBackdrop) closeModal();
      });
    }

    // Patient Form Submit
    const patientForm = document.getElementById('patient-form');
    if (patientForm) {
      patientForm.addEventListener('submit', e => {
        e.preventDefault();
        this.handleFormSubmit();
      });
    }

    // Export Directory CSV
    const exportBtn = document.getElementById('export-directory-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportCsv());
    }
  },

  getFilteredPatients() {
    if (typeof SimulationEngine === 'undefined') return [];
    let list = [...SimulationEngine.patients];

    if (this.searchQuery) {
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(this.searchQuery) ||
          p.id.toLowerCase().includes(this.searchQuery) ||
          p.diagnosis.toLowerCase().includes(this.searchQuery) ||
          p.room.toLowerCase().includes(this.searchQuery)
      );
    }

    if (this.statusFilter !== 'all') {
      list = list.filter(p => p.monitoringStatus === this.statusFilter);
    }

    return list;
  },

  render() {
    const list = this.getFilteredPatients();
    const countEl = document.getElementById('patients-count-badge');
    if (countEl) countEl.textContent = `${list.length} Patients`;

    const tableContainer = document.getElementById('patients-table-view');
    const gridContainer = document.getElementById('patients-grid-view');

    if (this.viewMode === 'table') {
      if (tableContainer) tableContainer.style.display = 'block';
      if (gridContainer) gridContainer.style.display = 'none';
      this.renderTable(list);
    } else {
      if (tableContainer) tableContainer.style.display = 'none';
      if (gridContainer) gridContainer.style.display = 'grid';
      this.renderGrid(list);
    }
  },

  renderTable(list) {
    const tbody = document.getElementById('patients-directory-tbody');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 40px 16px;">
            <div class="empty-state">
              <div class="empty-state-title">No patients found</div>
              <div class="empty-state-desc">Try clearing your search query or registering a new patient.</div>
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

        return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap: 10px;">
              <div class="user-avatar" style="width:34px; height:34px; font-size:0.8rem;">
                ${p.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <div class="patient-link-cell">
                <a href="patient-monitoring.html?id=${p.id}" class="patient-cell-name">
                  ${Utils.escapeHtml(p.name)}
                </a>
                <div class="patient-cell-meta">${p.id}</div>
              </div>
            </div>
          </td>
          <td>${p.age} yrs • ${p.gender}</td>
          <td><span class="font-medium">${Utils.escapeHtml(p.room)}</span></td>
          <td><span class="text-sm">${Utils.escapeHtml(p.diagnosis)}</span></td>
          <td>${Utils.escapeHtml(p.clinician)}</td>
          <td>
            ${
              isDis
                ? `<span class="text-secondary text-xs">No active telemetry</span>`
                : `<span class="font-bold text-navy">${cur.hr} bpm</span> • <span class="text-teal">${cur.spo2}% SpO₂</span>`
            }
          </td>
          <td>
            <span class="status-pill ${p.monitoringStatus === 'monitored' ? 'status-normal' : 'status-stale'}">
              ${p.monitoringStatus === 'monitored' ? 'Monitored' : 'Offline'}
            </span>
          </td>
          <td>
            <div style="display: flex; gap: 6px;">
              <a href="patient-monitoring.html?id=${p.id}" class="btn btn-outline btn-sm" title="Open Monitor">
                <i data-lucide="activity" class="icon-sm"></i>
              </a>
              <button class="btn btn-secondary btn-sm" onclick="PatientDirectory.openEditModal('${p.id}')" title="Edit Patient">
                <i data-lucide="edit-2" class="icon-sm"></i>
              </button>
              <button class="btn btn-danger-outline btn-sm" onclick="PatientDirectory.confirmDeactivate('${p.id}')" title="Deactivate Patient">
                <i data-lucide="archive" class="icon-sm"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  renderGrid(list) {
    const gridContainer = document.getElementById('patients-grid-view');
    if (!gridContainer) return;

    if (list.length === 0) {
      gridContainer.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-title">No patients found</div>
          <div class="empty-state-desc">Try clearing your search query.</div>
        </div>
      `;
      return;
    }

    gridContainer.innerHTML = list
      .map(p => {
        const cur = p.current || {};
        const isDis = p.monitoringStatus === 'disconnected' || cur.hr === null;

        return `
        <div class="card" style="padding: 18px; display:flex; flex-direction:column; justify-content:space-between; gap: 14px;">
          <div>
            <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom: 12px;">
              <div style="display:flex; align-items:center; gap: 12px;">
                <div class="patient-big-avatar" style="width:44px; height:44px; font-size:1.1rem;">
                  ${p.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
                <div>
                  <a href="patient-monitoring.html?id=${p.id}" class="patient-cell-name" style="font-size: 1rem;">
                    ${Utils.escapeHtml(p.name)}
                  </a>
                  <div class="text-xs text-secondary">${p.id} • ${p.age} yrs (${p.gender})</div>
                </div>
              </div>
              <span class="status-pill ${p.monitoringStatus === 'monitored' ? 'status-normal' : 'status-stale'}">
                ${p.monitoringStatus === 'monitored' ? 'Active' : 'Offline'}
              </span>
            </div>

            <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-bottom: 12px; display:flex; flex-direction:column; gap:4px;">
              <div><strong>Room:</strong> ${Utils.escapeHtml(p.room)}</div>
              <div><strong>Clinician:</strong> ${Utils.escapeHtml(p.clinician)}</div>
              <div><strong>Diagnosis:</strong> ${Utils.escapeHtml(p.diagnosis)}</div>
            </div>

            <div style="background-color: var(--color-surface-muted); padding: 10px; border-radius: var(--radius-md); font-size: var(--font-size-xs); display:flex; justify-content:space-between;">
              <div><strong>HR:</strong> ${isDis ? '--' : cur.hr + ' bpm'}</div>
              <div><strong>SpO₂:</strong> ${isDis ? '--' : cur.spo2 + '%'}</div>
              <div><strong>BP:</strong> ${isDis ? '--' : cur.bpSys + '/' + cur.bpDia}</div>
              <div><strong>Temp:</strong> ${isDis ? '--' : cur.temp + '°C'}</div>
            </div>
          </div>

          <div style="display:flex; align-items:center; justify-content:space-between; padding-top: 10px; border-top: 1px solid var(--color-border-light);">
            <div style="display:flex; gap: 6px;">
              <button class="btn btn-secondary btn-sm" onclick="PatientDirectory.openEditModal('${p.id}')">
                <i data-lucide="edit-2" class="icon-sm"></i> Edit
              </button>
              <button class="btn btn-danger-outline btn-sm" onclick="PatientDirectory.confirmDeactivate('${p.id}')">
                <i data-lucide="archive" class="icon-sm"></i>
              </button>
            </div>
            <a href="patient-monitoring.html?id=${p.id}" class="btn btn-primary btn-sm">
              <i data-lucide="activity" class="icon-sm"></i> Monitor
            </a>
          </div>
        </div>
      `;
      })
      .join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  openPatientModal() {
    this.editingPatientId = null;
    const title = document.getElementById('patient-modal-title');
    if (title) title.textContent = 'Register New Patient';

    const form = document.getElementById('patient-form');
    if (form) form.reset();

    // Generate next sequential MED-XXX ID
    const nextNum = 100 + SimulationEngine.patients.length + 1;
    const idInput = document.getElementById('form-patient-id');
    if (idInput) idInput.value = `MED-${nextNum}`;

    const backdrop = document.getElementById('patient-modal-backdrop');
    if (backdrop) backdrop.classList.add('open');
  },

  openEditModal(patientId) {
    const patient = SimulationEngine.getPatient(patientId);
    if (!patient) return;

    this.editingPatientId = patientId;
    const title = document.getElementById('patient-modal-title');
    if (title) title.textContent = `Edit Patient: ${patient.name}`;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setVal('form-patient-id', patient.id);
    setVal('form-patient-name', patient.name);
    setVal('form-patient-age', patient.age);
    setVal('form-patient-gender', patient.gender);
    setVal('form-patient-room', patient.room);
    setVal('form-patient-clinician', patient.clinician);
    setVal('form-patient-diagnosis', patient.diagnosis);
    setVal('form-patient-allergies', patient.allergies ? patient.allergies.join(', ') : '');
    setVal('form-patient-meds', patient.medications ? patient.medications.join(', ') : '');

    const backdrop = document.getElementById('patient-modal-backdrop');
    if (backdrop) backdrop.classList.add('open');
  },

  handleFormSubmit() {
    const getVal = id => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };

    const patientPayload = {
      id: getVal('form-patient-id'),
      originalId: this.editingPatientId,
      name: getVal('form-patient-name'),
      age: parseInt(getVal('form-patient-age'), 10) || 45,
      gender: getVal('form-patient-gender') || 'Other',
      room: getVal('form-patient-room'),
      clinician: getVal('form-patient-clinician'),
      diagnosis: getVal('form-patient-diagnosis') || 'Under Observation',
      allergies: getVal('form-patient-allergies') ? getVal('form-patient-allergies').split(',').map(s => s.trim()) : ['None recorded'],
      medications: getVal('form-patient-meds') ? getVal('form-patient-meds').split(',').map(s => s.trim()) : ['None'],
      dob: '1980-01-01' // default for validation
    };

    // Form validation
    const validation = Validation.validatePatient(patientPayload, SimulationEngine.patients);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      App.toast('Validation Error', firstError, 'warning');
      return;
    }

    if (this.editingPatientId) {
      // Edit existing
      const p = SimulationEngine.getPatient(this.editingPatientId);
      if (p) {
        Object.assign(p, patientPayload);
        SimulationEngine.savePatients();
        App.toast('Patient Record Updated', `Successfully updated record for ${p.name}.`, 'success');
      }
    } else {
      // Create new
      const newPatient = {
        ...patientPayload,
        monitoringStatus: 'monitored',
        baseline: { hr: 75, spo2: 98, bpSys: 120, bpDia: 80, resp: 16, temp: 36.8 },
        current: { hr: 75, spo2: 98, bpSys: 120, bpDia: 80, resp: 16, temp: 36.8, lastUpdated: new Date().toISOString() }
      };

      SimulationEngine.patients.push(newPatient);
      SimulationEngine.savePatients();

      // Seed observations
      SimulationEngine.observations[newPatient.id] = [{
        id: `OBS-${newPatient.id}-0`,
        patientId: newPatient.id,
        timestamp: new Date().toISOString(),
        heartRate: 75,
        spo2: 98,
        bpSystolic: 120,
        bpDiastolic: 80,
        respiratoryRate: 16,
        temperature: 36.8,
        isDisconnected: false,
        dataQuality: 'GOOD',
        dataSource: 'DEMO_SIMULATION',
        isSimulated: true
      }];

      App.toast('Patient Registered', `${newPatient.name} admitted to ${newPatient.room}.`, 'success');
      Notifications.add('patient', 'New Patient Registered', `${newPatient.name} (${newPatient.id}) assigned to ${newPatient.room}.`);
    }

    const backdrop = document.getElementById('patient-modal-backdrop');
    if (backdrop) backdrop.classList.remove('open');
    this.render();
  },

  confirmDeactivate(patientId) {
    const p = SimulationEngine.getPatient(patientId);
    if (!p) return;

    if (confirm(`Are you sure you want to discharge / deactivate patient ${p.name} (${p.id})?`)) {
      SimulationEngine.patients = SimulationEngine.patients.filter(item => item.id !== patientId);
      SimulationEngine.savePatients();
      App.toast('Patient Deactivated', `${p.name} discharged from active telemetry.`, 'info');
      this.render();
    }
  },

  exportCsv() {
    const list = this.getFilteredPatients();
    const rows = list.map(p => ({
      'Patient ID': p.id,
      'Full Name': p.name,
      'Age': p.age,
      'Gender': p.gender,
      'Ward / Location': p.room,
      'Primary Clinician': p.clinician,
      'Clinical Diagnosis': p.diagnosis,
      'Monitoring Status': p.monitoringStatus,
      'Current HR (bpm)': p.current?.hr ?? 'N/A',
      'Current SpO2 (%)': p.current?.spo2 ?? 'N/A',
      'Current BP (mmHg)': p.current ? `${p.current.bpSys}/${p.current.bpDia}` : 'N/A',
      'Current Temp (C)': p.current?.temp ?? 'N/A'
    }));

    Utils.exportToCsv(`medico_patient_directory_${Date.now()}.csv`, rows);
    App.toast('Export Completed', 'Patient directory exported to CSV successfully.', 'success');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('patients-directory-tbody')) {
    PatientDirectory.init();
  }
});
