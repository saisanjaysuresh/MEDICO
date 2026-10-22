/* ==========================================================================
   MEDICO - DETERMINISTIC ALERT RULES ENGINE
   ========================================================================== */

const AlertEngine = {
  // Default Clinical Reference Thresholds (Can be modified via Settings)
  thresholds: {
    heartRate: {
      criticalLow: 50,
      warningLow: 60,
      warningHigh: 100,
      criticalHigh: 120,
      unit: 'bpm'
    },
    spo2: {
      criticalLow: 90,
      warningLow: 95,
      criticalHigh: 100,
      unit: '%'
    },
    bpSystolic: {
      criticalLow: 90,
      warningLow: 100,
      warningHigh: 139,
      criticalHigh: 160,
      unit: 'mmHg'
    },
    bpDiastolic: {
      criticalLow: 60,
      warningLow: 65,
      warningHigh: 89,
      criticalHigh: 100,
      unit: 'mmHg'
    },
    respiratoryRate: {
      criticalLow: 9,
      warningLow: 12,
      warningHigh: 20,
      criticalHigh: 25,
      unit: 'breaths/min'
    },
    temperature: {
      criticalLow: 35.5,
      warningLow: 36.2,
      warningHigh: 37.8,
      criticalHigh: 38.5,
      unit: '°C'
    }
  },

  /**
   * Evaluate a single observation and return any newly generated alerts.
   * activeAlerts: array of current active unresolved alerts to handle deduplication.
   */
  evaluateObservation(obs, patient, activeAlerts = []) {
    const newAlerts = [];
    const now = new Date().toISOString();

    if (!obs || !patient) return newAlerts;

    // Check device / sensor disconnection
    if (obs.isDisconnected || obs.dataQuality === 'DISCONNECTED') {
      const existing = activeAlerts.find(
        a => a.patientId === patient.id && a.category === 'device' && a.status === 'active'
      );
      if (!existing) {
        newAlerts.push({
          id: `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          patientId: patient.id,
          patientName: patient.name,
          category: 'device',
          parameter: 'telemetry',
          observedValue: 'DISCONNECTED',
          threshold: 'Active Connection',
          severity: 'warning',
          status: 'active',
          timestamp: now,
          source: obs.dataSource || 'DEMO_SIMULATION',
          message: `Monitoring telemetry source disconnected for ${patient.name} (${patient.room}). Check lead placement and sensor battery.`,
          actionRecommended: 'Verify physical device connection and telemetry battery status.'
        });
      }
      return newAlerts;
    }

    // Helper to evaluate a parameter
    const checkParam = (paramKey, value, paramLabel, rules) => {
      if (value === null || value === undefined) return;

      let severity = null;
      let thresholdDesc = '';
      let msg = '';

      if (rules.criticalHigh !== undefined && value >= rules.criticalHigh) {
        severity = 'critical';
        thresholdDesc = `≥ ${rules.criticalHigh} ${rules.unit}`;
        msg = `${paramLabel} (${value} ${rules.unit}) is CRITICALLY HIGH (threshold ${thresholdDesc}).`;
      } else if (rules.criticalLow !== undefined && value <= rules.criticalLow) {
        severity = 'critical';
        thresholdDesc = `≤ ${rules.criticalLow} ${rules.unit}`;
        msg = `${paramLabel} (${value} ${rules.unit}) is CRITICALLY LOW (threshold ${thresholdDesc}).`;
      } else if (rules.warningHigh !== undefined && value > rules.warningHigh) {
        severity = 'warning';
        thresholdDesc = `> ${rules.warningHigh} ${rules.unit}`;
        msg = `${paramLabel} (${value} ${rules.unit}) exceeds warning threshold (${thresholdDesc}).`;
      } else if (rules.warningLow !== undefined && value < rules.warningLow) {
        severity = 'warning';
        thresholdDesc = `< ${rules.warningLow} ${rules.unit}`;
        msg = `${paramLabel} (${value} ${rules.unit}) is below warning threshold (${thresholdDesc}).`;
      }

      if (severity) {
        // Deduplication check: Do we already have an active alert for this patient and parameter?
        const existing = activeAlerts.find(
          a => a.patientId === patient.id && a.parameter === paramKey && a.status === 'active'
        );

        if (!existing) {
          newAlerts.push({
            id: `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            patientId: patient.id,
            patientName: patient.name,
            room: patient.room,
            category: 'physiological',
            parameter: paramKey,
            observedValue: `${value} ${rules.unit}`,
            threshold: thresholdDesc,
            severity,
            status: 'active',
            timestamp: now,
            source: obs.dataSource || 'DEMO_SIMULATION',
            message: msg,
            actionRecommended:
              severity === 'critical'
                ? 'Immediately verify patient condition at bedside and notify primary care team.'
                : 'Review trend and repeat measurement in 15 minutes.'
          });
        }
      }
    };

    // Evaluate each physiological vital
    checkParam('heartRate', obs.heartRate, 'Heart Rate', this.thresholds.heartRate);
    checkParam('spo2', obs.spo2, 'Oxygen Saturation (SpO₂)', this.thresholds.spo2);
    checkParam('bpSystolic', obs.bpSystolic, 'Systolic Blood Pressure', this.thresholds.bpSystolic);
    checkParam('bpDiastolic', obs.bpDiastolic, 'Diastolic Blood Pressure', this.thresholds.bpDiastolic);
    checkParam('respiratoryRate', obs.respiratoryRate, 'Respiratory Rate', this.thresholds.respiratoryRate);
    checkParam('temperature', obs.temperature, 'Body Temperature', this.thresholds.temperature);

    return newAlerts;
  },

  /**
   * Check for stale observation data (> 45s without update in demo mode)
   */
  checkStaleData(patient, lastObsTime, staleTimeoutMs = 45000) {
    if (!lastObsTime) return null;
    const elapsed = Date.now() - new Date(lastObsTime).getTime();
    if (elapsed > staleTimeoutMs) {
      return {
        id: `ALT-STALE-${patient.id}-${Math.floor(Date.now() / 60000)}`,
        patientId: patient.id,
        patientName: patient.name,
        room: patient.room,
        category: 'operational',
        parameter: 'stale_data',
        observedValue: `${Math.round(elapsed / 1000)}s without update`,
        threshold: `< ${Math.round(staleTimeoutMs / 1000)}s`,
        severity: 'warning',
        status: 'active',
        timestamp: new Date().toISOString(),
        source: 'SYSTEM_WATCHDOG',
        message: `Stale telemetry detected: No observation received for ${patient.name} in ${Math.round(elapsed / 1000)} seconds.`,
        actionRecommended: 'Verify telemetry unit connection and network status.'
      };
    }
    return null;
  },

  /**
   * Transition alert state to Acknowledged
   */
  acknowledgeAlert(alert, user) {
    if (!alert) return null;
    return {
      ...alert,
      status: 'acknowledged',
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy: user ? user.name || user.email : 'Attending Staff'
    };
  },

  /**
   * Transition alert state to Resolved
   */
  resolveAlert(alert, user, resolutionNote = '') {
    if (!alert) return null;
    return {
      ...alert,
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
      resolvedBy: user ? user.name || user.email : 'Attending Staff',
      resolutionNote: resolutionNote.trim() || 'Observed patient, verified vitals stabilized.'
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AlertEngine;
}
