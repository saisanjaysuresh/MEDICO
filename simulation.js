/* ==========================================================================
   MEDICO - CONTINUOUS MULTI-PATIENT SIMULATION ENGINE
   ========================================================================== */

const SimulationEngine = {
  isRunning: false,
  intervalMs: 3000,
  timerId: null,
  activeScenario: 'stable',
  targetPatientId: 'MED-101',
  listeners: [],
  alertListeners: [],

  // 12 Clinical Synthetic Patient Profiles
  defaultPatients: [
    {
      id: 'MED-101',
      name: 'Eleanor Vance',
      age: 68,
      gender: 'Female',
      room: 'ICU-Bed 01',
      clinician: 'Dr. Sarah Jenkins',
      diagnosis: 'Post-Op Coronary Artery Bypass',
      allergies: ['Penicillin', 'Sulfa'],
      medications: ['Metoprolol 25mg', 'Aspirin 81mg', 'Atorvastatin 40mg'],
      monitoringStatus: 'monitored',
      baseline: { hr: 76, spo2: 98, bpSys: 122, bpDia: 78, resp: 16, temp: 36.8 },
      current: { hr: 76, spo2: 98, bpSys: 122, bpDia: 78, resp: 16, temp: 36.8 }
    },
    {
      id: 'MED-102',
      name: 'Marcus Reed',
      age: 54,
      gender: 'Male',
      room: 'Step-Down 04',
      clinician: 'Dr. Michael Chen',
      diagnosis: 'Acute Bacterial Pneumonia',
      allergies: ['None known'],
      medications: ['Ceftriaxone 1g IV', 'Albuterol Nebulizer', 'Acetaminophen'],
      monitoringStatus: 'monitored',
      baseline: { hr: 88, spo2: 94, bpSys: 130, bpDia: 84, resp: 22, temp: 38.2 },
      current: { hr: 88, spo2: 94, bpSys: 130, bpDia: 84, resp: 22, temp: 38.2 }
    },
    {
      id: 'MED-103',
      name: 'Sophia Chen',
      age: 29,
      gender: 'Female',
      room: 'Maternity 202',
      clinician: 'Dr. Sarah Jenkins',
      diagnosis: 'Antepartum Preeclampsia Watch',
      allergies: ['Latex'],
      medications: ['Labetalol 100mg', 'Prenatal Multivitamin'],
      monitoringStatus: 'monitored',
      baseline: { hr: 74, spo2: 99, bpSys: 138, bpDia: 88, resp: 15, temp: 36.6 },
      current: { hr: 74, spo2: 99, bpSys: 138, bpDia: 88, resp: 15, temp: 36.6 }
    },
    {
      id: 'MED-104',
      name: 'James Wilson',
      age: 72,
      gender: 'Male',
      room: 'CCU-02',
      clinician: 'Dr. Robert Vance',
      diagnosis: 'Acute Decompensated Heart Failure',
      allergies: ['Codeine'],
      medications: ['Furosemide 40mg IV', 'Lisinopril 10mg', 'Carvedilol 6.25mg'],
      monitoringStatus: 'monitored',
      baseline: { hr: 104, spo2: 91, bpSys: 148, bpDia: 92, resp: 24, temp: 36.9 },
      current: { hr: 104, spo2: 91, bpSys: 148, bpDia: 92, resp: 24, temp: 36.9 }
    },
    {
      id: 'MED-105',
      name: 'Aisha Patel',
      age: 41,
      gender: 'Female',
      room: 'Ortho Ward 312',
      clinician: 'Dr. Michael Chen',
      diagnosis: 'Post-Op Total Knee Arthroplasty',
      allergies: ['Morphine'],
      medications: ['Enoxaparin 40mg SC', 'Oxycodone 5mg', 'Ondansetron 4mg'],
      monitoringStatus: 'monitored',
      baseline: { hr: 72, spo2: 98, bpSys: 118, bpDia: 76, resp: 14, temp: 36.7 },
      current: { hr: 72, spo2: 98, bpSys: 118, bpDia: 76, resp: 14, temp: 36.7 }
    },
    {
      id: 'MED-106',
      name: 'Robert Taylor',
      age: 63,
      gender: 'Male',
      room: 'Pulmonary 105',
      clinician: 'Dr. Sarah Jenkins',
      diagnosis: 'Chronic Obstructive Pulmonary Disease',
      allergies: ['None known'],
      medications: ['Tiotropium 18mcg', 'Prednisone 20mg', 'Supplemental O2 2L/min'],
      monitoringStatus: 'monitored',
      baseline: { hr: 82, spo2: 92, bpSys: 126, bpDia: 80, resp: 21, temp: 36.9 },
      current: { hr: 82, spo2: 92, bpSys: 126, bpDia: 80, resp: 21, temp: 36.9 }
    },
    {
      id: 'MED-107',
      name: 'Maria Garcia',
      age: 35,
      gender: 'Female',
      room: 'Endo Ward 210',
      clinician: 'Dr. Michael Chen',
      diagnosis: 'Diabetic Ketoacidosis Recovery',
      allergies: ['Ciprofloxacin'],
      medications: ['Insulin Glargine', 'IV Normal Saline', 'Potassium Chloride'],
      monitoringStatus: 'monitored',
      baseline: { hr: 86, spo2: 98, bpSys: 112, bpDia: 72, resp: 17, temp: 37.1 },
      current: { hr: 86, spo2: 98, bpSys: 112, bpDia: 72, resp: 17, temp: 37.1 }
    },
    {
      id: 'MED-108',
      name: 'David Kim',
      age: 48,
      gender: 'Male',
      room: 'ICU-Bed 05',
      clinician: 'Dr. Robert Vance',
      diagnosis: 'Severe Urosepsis / Systemic Infection',
      allergies: ['Vancomycin (Flushing)'],
      medications: ['Meropenem 1g IV', 'Norepinephrine Infusion', 'Dextrose 5%'],
      monitoringStatus: 'monitored',
      baseline: { hr: 115, spo2: 94, bpSys: 96, bpDia: 58, resp: 26, temp: 39.1 },
      current: { hr: 115, spo2: 94, bpSys: 96, bpDia: 58, resp: 26, temp: 39.1 }
    },
    {
      id: 'MED-109',
      name: 'Linda Johnson',
      age: 79,
      gender: 'Female',
      room: 'Neuro Rehab 14',
      clinician: 'Dr. Sarah Jenkins',
      diagnosis: 'Ischemic Stroke Rehabilitation',
      allergies: ['Aspirin'],
      medications: ['Clopidogrel 75mg', 'Amlodipine 5mg', 'Gabapentin 300mg'],
      monitoringStatus: 'monitored',
      baseline: { hr: 68, spo2: 97, bpSys: 134, bpDia: 82, resp: 15, temp: 36.6 },
      current: { hr: 68, spo2: 97, bpSys: 134, bpDia: 82, resp: 15, temp: 36.6 }
    },
    {
      id: 'MED-110',
      name: 'Thomas Brown',
      age: 52,
      gender: 'Male',
      room: 'ER Bay 03',
      clinician: 'Dr. Michael Chen',
      diagnosis: 'Acute Severe Asthma Flare',
      allergies: ['NSAIDS'],
      medications: ['Ipratropium Neb', 'Methylprednisolone IV', 'Montelukast'],
      monitoringStatus: 'monitored',
      baseline: { hr: 98, spo2: 93, bpSys: 128, bpDia: 82, resp: 23, temp: 37.0 },
      current: { hr: 98, spo2: 93, bpSys: 128, bpDia: 82, resp: 23, temp: 37.0 }
    },
    {
      id: 'MED-111',
      name: 'Olivia Martin',
      age: 22,
      gender: 'Female',
      room: 'Obs Unit 11',
      clinician: 'Dr. Sarah Jenkins',
      diagnosis: 'Vasovagal Syncope Evaluation',
      allergies: ['None known'],
      medications: ['Oral Rehydration Salts'],
      monitoringStatus: 'monitored',
      baseline: { hr: 64, spo2: 99, bpSys: 108, bpDia: 68, resp: 14, temp: 36.5 },
      current: { hr: 64, spo2: 99, bpSys: 108, bpDia: 68, resp: 14, temp: 36.5 }
    },
    {
      id: 'MED-112',
      name: 'William Davis',
      age: 61,
      gender: 'Male',
      room: 'Telemetry 409',
      clinician: 'Dr. Robert Vance',
      diagnosis: 'Cardiac Dysrhythmia Observation',
      allergies: ['Iodinated Radiocontrast'],
      medications: ['Amiodarone 200mg', 'Warfarin 5mg'],
      monitoringStatus: 'disconnected',
      baseline: { hr: 75, spo2: 96, bpSys: 125, bpDia: 80, resp: 16, temp: 36.7 },
      current: { hr: null, spo2: null, bpSys: null, bpDia: null, resp: null, temp: null }
    }
  ],

  // In-memory data store for observations
  observations: {}, // map of patientId -> array of observations
  alertsHistory: [], // array of all alerts
  activeAlerts: [],  // array of active alerts

  /**
   * Initialize simulation store with baseline patients and 24-hr historical points
   */
  init() {
    const savedPatients = localStorage.getItem('medico_patients');
    if (savedPatients) {
      try {
        this.patients = JSON.parse(savedPatients);
      } catch (e) {
        this.patients = JSON.parse(JSON.stringify(this.defaultPatients));
      }
    } else {
      this.patients = JSON.parse(JSON.stringify(this.defaultPatients));
      this.savePatients();
    }

    // Generate 24 hours of realistic initial historical observation data
    this.generateInitialHistory();
    this.start();
  },

  savePatients() {
    localStorage.setItem('medico_patients', JSON.stringify(this.patients));
  },

  /**
   * Generate 24-hr historical series (48 observations at 30-min intervals)
   */
  generateInitialHistory() {
    const now = Date.now();
    const halfHourMs = 30 * 60 * 1000;
    const count = 48;

    this.patients.forEach(patient => {
      this.observations[patient.id] = [];
      const base = patient.baseline;

      for (let i = count; i >= 1; i--) {
        const obsTime = new Date(now - i * halfHourMs).toISOString();
        // Subtle drift around patient baseline
        const hrDrift = Math.round((Math.random() - 0.5) * 6);
        const spo2Drift = Math.round((Math.random() - 0.5) * 2);
        const sysDrift = Math.round((Math.random() - 0.5) * 8);
        const diaDrift = Math.round((Math.random() - 0.5) * 6);
        const respDrift = Math.round((Math.random() - 0.5) * 3);
        const tempDrift = Number(((Math.random() - 0.5) * 0.4).toFixed(1));

        if (patient.id === 'MED-112') {
          // MED-112 is a disconnected telemetry sample
          this.observations[patient.id].push({
            id: `OBS-${patient.id}-${count - i}`,
            patientId: patient.id,
            timestamp: obsTime,
            heartRate: null,
            spo2: null,
            bpSystolic: null,
            bpDiastolic: null,
            respiratoryRate: null,
            temperature: null,
            isDisconnected: true,
            dataQuality: 'DISCONNECTED',
            dataSource: 'DEMO_SIMULATION',
            isSimulated: true
          });
          continue;
        }

        const obs = {
          id: `OBS-${patient.id}-${count - i}`,
          patientId: patient.id,
          timestamp: obsTime,
          heartRate: Math.max(45, Math.min(180, base.hr + hrDrift)),
          spo2: Math.max(80, Math.min(100, base.spo2 + spo2Drift)),
          bpSystolic: Math.max(70, Math.min(220, base.bpSys + sysDrift)),
          bpDiastolic: Math.max(40, Math.min(140, base.bpDia + diaDrift)),
          respiratoryRate: Math.max(8, Math.min(45, base.resp + respDrift)),
          temperature: Number((base.temp + tempDrift).toFixed(1)),
          isDisconnected: false,
          dataQuality: 'GOOD',
          dataSource: 'DEMO_SIMULATION',
          isSimulated: true
        };

        this.observations[patient.id].push(obs);
      }

      // Set current vitals to the most recent observation
      const lastObs = this.observations[patient.id][this.observations[patient.id].length - 1];
      if (lastObs) {
        patient.current = {
          hr: lastObs.heartRate,
          spo2: lastObs.spo2,
          bpSys: lastObs.bpSystolic,
          bpDia: lastObs.bpDiastolic,
          resp: lastObs.respiratoryRate,
          temp: lastObs.temperature,
          lastUpdated: lastObs.timestamp
        };
      }
    });

    // Run initial alert evaluation on latest observations to seed realistic alert state
    this.evaluateInitialAlerts();
  },

  evaluateInitialAlerts() {
    this.patients.forEach(p => {
      const lastObs = this.getLatestObservation(p.id);
      if (lastObs && typeof AlertEngine !== 'undefined') {
        const alerts = AlertEngine.evaluateObservation(lastObs, p, this.activeAlerts);
        alerts.forEach(a => {
          this.activeAlerts.push(a);
          this.alertsHistory.push(a);
        });
      }
    });
  },

  /**
   * Start live simulation timer
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timerId = setInterval(() => this.tick(), this.intervalMs);
    this.notifyEngineStatusChange();
  },

  /**
   * Pause live simulation timer
   */
  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.notifyEngineStatusChange();
  },

  /**
   * Change interval (e.g., 2000ms, 3000ms, 5000ms)
   */
  setIntervalSpeed(ms) {
    this.intervalMs = ms;
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  },

  /**
   * Set active scenario preset
   */
  setScenario(scenarioName, targetPatientId = 'MED-101') {
    this.activeScenario = scenarioName;
    this.targetPatientId = targetPatientId;
  },

  /**
   * Single step of continuous simulation
   */
  tick() {
    const now = new Date().toISOString();
    const updatedPatients = [];

    this.patients.forEach(patient => {
      if (patient.monitoringStatus === 'disconnected' && patient.id === 'MED-112') {
        // Disconnected patient remains null
        return;
      }

      // Check if this patient is affected by the active scenario
      const isTarget = patient.id === this.targetPatientId;
      const cur = patient.current || { ...patient.baseline };
      const base = patient.baseline;

      let newHr = cur.hr ?? base.hr;
      let newSpo2 = cur.spo2 ?? base.spo2;
      let newSys = cur.bpSys ?? base.bpSys;
      let newDia = cur.bpDia ?? base.bpDia;
      let newResp = cur.resp ?? base.resp;
      let newTemp = cur.temp ?? base.temp;
      let isDisconnected = false;

      if (isTarget && this.activeScenario === 'tachycardia') {
        // Tachycardia: HR drifts upward towards 136 bpm
        newHr = Math.min(138, newHr + Math.round(Math.random() * 3));
        newResp = Math.min(26, newResp + 1);
      } else if (isTarget && this.activeScenario === 'hypoxemia') {
        // Hypoxemia: SpO2 drifts downward towards 87%
        newSpo2 = Math.max(86, newSpo2 - 1);
        newResp = Math.min(28, newResp + 1);
        newHr = Math.min(115, newHr + 1);
      } else if (isTarget && this.activeScenario === 'fever') {
        // Elevated Temperature: Temp climbs toward 39.4°C
        newTemp = Number(Math.min(39.5, newTemp + 0.1).toFixed(1));
        newHr = Math.min(122, newHr + 2);
      } else if (isTarget && this.activeScenario === 'disconnection') {
        // Simulate Device Disconnection
        newHr = null;
        newSpo2 = null;
        newSys = null;
        newDia = null;
        newResp = null;
        newTemp = null;
        isDisconnected = true;
      } else if (isTarget && this.activeScenario === 'recovery') {
        // Gradual recovery towards baseline
        newHr = newHr > base.hr ? newHr - 1 : newHr < base.hr ? newHr + 1 : base.hr;
        newSpo2 = newSpo2 < base.spo2 ? newSpo2 + 1 : base.spo2;
        newSys = newSys > base.bpSys ? newSys - 1 : newSys < base.bpSys ? newSys + 1 : base.bpSys;
        newDia = newDia > base.bpDia ? newDia - 1 : newDia < base.bpDia ? newDia + 1 : base.bpDia;
        newResp = newResp > base.resp ? newResp - 1 : base.resp;
        newTemp = Number((newTemp > base.temp ? newTemp - 0.1 : base.temp).toFixed(1));
      } else {
        // Standard gentle physiological Markov drift
        const hrDelta = Math.round((Math.random() - 0.48) * 2);
        newHr = Math.max(base.hr - 10, Math.min(base.hr + 10, newHr + hrDelta));

        const spo2Delta = Math.round((Math.random() - 0.52) * 1);
        newSpo2 = Math.max(base.spo2 - 3, Math.min(100, newSpo2 + spo2Delta));

        const bpDelta = Math.round((Math.random() - 0.5) * 2);
        newSys = Math.max(base.bpSys - 8, Math.min(base.bpSys + 8, newSys + bpDelta));
        newDia = Math.max(base.bpDia - 5, Math.min(base.bpDia + 5, newDia + Math.round(bpDelta / 2)));

        const respDelta = Math.round((Math.random() - 0.5) * 1);
        newResp = Math.max(base.resp - 2, Math.min(base.resp + 2, newResp + respDelta));

        const tempDelta = Number(((Math.random() - 0.5) * 0.1).toFixed(1));
        newTemp = Number(Math.max(base.temp - 0.3, Math.min(base.temp + 0.3, newTemp + tempDelta)).toFixed(1));
      }

      // Create new observation record
      const obs = {
        id: `OBS-${patient.id}-${Date.now()}`,
        patientId: patient.id,
        timestamp: now,
        heartRate: newHr,
        spo2: newSpo2,
        bpSystolic: newSys,
        bpDiastolic: newDia,
        respiratoryRate: newResp,
        temperature: newTemp,
        isDisconnected,
        dataQuality: isDisconnected ? 'DISCONNECTED' : 'GOOD',
        dataSource: 'DEMO_SIMULATION',
        isSimulated: true
      };

      // Push to in-memory observations list (keep maximum 150 points per patient in demo buffer)
      if (!this.observations[patient.id]) this.observations[patient.id] = [];
      this.observations[patient.id].push(obs);
      if (this.observations[patient.id].length > 150) {
        this.observations[patient.id].shift();
      }

      // Update patient current state
      patient.current = {
        hr: newHr,
        spo2: newSpo2,
        bpSys: newSys,
        bpDia: newDia,
        resp: newResp,
        temp: newTemp,
        lastUpdated: now
      };

      updatedPatients.push({ patient, observation: obs });

      // Run deterministic alert engine evaluation
      if (typeof AlertEngine !== 'undefined') {
        const newAlerts = AlertEngine.evaluateObservation(obs, patient, this.activeAlerts);
        if (newAlerts && newAlerts.length > 0) {
          newAlerts.forEach(a => {
            this.activeAlerts.unshift(a);
            this.alertsHistory.unshift(a);
            this.broadcastAlert(a);
          });
        }
      }
    });

    // Broadcast updates to all subscribed views (dashboard, patient workspace, charts)
    this.broadcastUpdate(updatedPatients);
  },

  /**
   * Trigger an immediate test critical alert for project demonstration
   */
  triggerTestAlert(patientId = 'MED-101') {
    const patient = this.getPatient(patientId) || this.patients[0];
    const testAlert = {
      id: `ALT-TEST-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.name,
      room: patient.room,
      category: 'physiological',
      parameter: 'heartRate',
      observedValue: '142 bpm',
      threshold: '≥ 120 bpm',
      severity: 'critical',
      status: 'active',
      timestamp: new Date().toISOString(),
      source: 'DEMO_SIMULATION',
      message: `TEST ALERT: Acute Tachycardia detected for ${patient.name} (${patient.room}). Heart rate is 142 bpm.`,
      actionRecommended: 'Verify ECG tracing, check blood pressure, and alert primary care physician immediately.'
    };

    this.activeAlerts.unshift(testAlert);
    this.alertsHistory.unshift(testAlert);
    this.broadcastAlert(testAlert);
    return testAlert;
  },

  /**
   * Reset demonstration dataset with confirmation
   */
  resetDemoData() {
    this.patients = JSON.parse(JSON.stringify(this.defaultPatients));
    this.savePatients();
    this.observations = {};
    this.activeAlerts = [];
    this.alertsHistory = [];
    this.generateInitialHistory();
    this.broadcastUpdate(this.patients.map(p => ({ patient: p, observation: this.getLatestObservation(p.id) })));
  },

  // Subscriptions
  onUpdate(callback) {
    if (typeof callback === 'function') this.listeners.push(callback);
  },

  onAlert(callback) {
    if (typeof callback === 'function') this.alertListeners.push(callback);
  },

  broadcastUpdate(payload) {
    this.listeners.forEach(cb => {
      try { cb(payload); } catch (e) { console.error('Sim listener error:', e); }
    });
  },

  broadcastAlert(alert) {
    this.alertListeners.forEach(cb => {
      try { cb(alert); } catch (e) { console.error('Alert listener error:', e); }
    });
  },

  notifyEngineStatusChange() {
    window.dispatchEvent(new CustomEvent('medico:engine-status', {
      detail: { isRunning: this.isRunning, intervalMs: this.intervalMs }
    }));
  },

  // Accessors
  getPatient(patientId) {
    return this.patients.find(p => p.id === patientId);
  },

  getLatestObservation(patientId) {
    const list = this.observations[patientId];
    if (!list || list.length === 0) return null;
    return list[list.length - 1];
  },

  getPatientHistory(patientId, limit = 50) {
    const list = this.observations[patientId] || [];
    return list.slice(-limit);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SimulationEngine;
}
