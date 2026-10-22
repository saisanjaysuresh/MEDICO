/* ==========================================================================
   MEDICO - SCREEN 9: SETTINGS & ADMINISTRATION CONTROLLER
   ========================================================================== */

const Settings = {
  auditLogs: [],

  init() {
    this.loadAuditLogs();
    this.setupProfileSwitcher();
    this.setupSimulationControls();
    this.setupThresholdsForm();
    this.checkServerHealth();
    this.render();
  },

  loadAuditLogs() {
    const saved = localStorage.getItem('medico_audit_logs');
    if (saved) {
      try {
        this.auditLogs = JSON.parse(saved);
      } catch (e) {
        this.auditLogs = [];
      }
    } else {
      this.auditLogs = [
        {
          id: 'AUD-01',
          action: 'DEMO_DATA_INITIALIZED',
          actor: 'System Administrator (Alex Rivera)',
          details: 'Initialized 12 synthetic inpatient telemetry profiles.',
          timestamp: new Date(Date.now() - 3600 * 1000).toISOString()
        },
        {
          id: 'AUD-02',
          action: 'CLINICAL_SESSION_START',
          actor: 'Dr. Sarah Jenkins',
          details: 'Doctor session authenticated into Cardiovascular ICU ward.',
          timestamp: new Date(Date.now() - 1800 * 1000).toISOString()
        }
      ];
      this.saveAuditLogs();
    }
  },

  saveAuditLogs() {
    localStorage.setItem('medico_audit_logs', JSON.stringify(this.auditLogs));
  },

  addAuditLog(action, details) {
    const user = Auth.getCurrentUser();
    const entry = {
      id: `AUD-${Date.now()}`,
      action,
      actor: user ? `${user.name} (${user.roleTitle})` : 'System',
      details,
      timestamp: new Date().toISOString()
    };
    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 50) this.auditLogs.pop();
    this.saveAuditLogs();
    this.renderAuditLogs();
  },

  setupProfileSwitcher() {
    const switchBtns = document.querySelectorAll('[data-switch-role]');
    switchBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const role = btn.dataset.switchRole;
        const newAcc = Auth.loginAsPreset(role);
        this.addAuditLog('ROLE_SWITCH', `Switched active clinical session to ${newAcc.name} (${newAcc.roleTitle}).`);
        App.toast('Role Switched', `Active user is now ${newAcc.name} (${newAcc.roleTitle}).`, 'success');
        setTimeout(() => window.location.reload(), 400);
      });
    });
  },

  setupSimulationControls() {
    // Interval Speed
    const intervalSelect = document.getElementById('settings-sim-interval');
    if (intervalSelect && typeof SimulationEngine !== 'undefined') {
      intervalSelect.value = SimulationEngine.intervalMs;
      intervalSelect.addEventListener('change', e => {
        const ms = parseInt(e.target.value, 10);
        SimulationEngine.setIntervalSpeed(ms);
        this.addAuditLog('SIMULATION_CONFIG', `Telemetry generation interval set to ${ms / 1000}s.`);
        App.toast('Interval Updated', `Simulation interval updated to ${ms / 1000} seconds.`, 'info');
      });
    }

    // Scenario preset
    const scenarioSelect = document.getElementById('settings-sim-scenario');
    const targetPatientSelect = document.getElementById('settings-target-patient');

    if (targetPatientSelect && typeof SimulationEngine !== 'undefined') {
      targetPatientSelect.innerHTML = SimulationEngine.patients
        .map(p => `<option value="${p.id}" ${p.id === SimulationEngine.targetPatientId ? 'selected' : ''}>${p.id} — ${p.name}</option>`)
        .join('');

      targetPatientSelect.addEventListener('change', e => {
        SimulationEngine.targetPatientId = e.target.value;
      });
    }

    if (scenarioSelect && typeof SimulationEngine !== 'undefined') {
      scenarioSelect.value = SimulationEngine.activeScenario;
      scenarioSelect.addEventListener('change', e => {
        const scn = e.target.value;
        const pId = targetPatientSelect ? targetPatientSelect.value : 'MED-101';
        SimulationEngine.setScenario(scn, pId);
        this.addAuditLog('SCENARIO_TRIGGER', `Applied scenario "${scn}" to patient ${pId}.`);
        App.toast('Scenario Preset Applied', `Simulation scenario updated to "${scn}".`, 'success');
      });
    }

    // Reset synthetic dataset button
    const resetBtn = document.getElementById('settings-reset-data-btn');
    if (resetBtn && typeof SimulationEngine !== 'undefined') {
      resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all synthetic patients, telemetry history, and alerts back to clean baseline defaults?')) {
          SimulationEngine.resetDemoData();
          this.addAuditLog('DATASET_RESET', 'Demonstration synthetic vitals dataset reset to clean baseline.');
          App.toast('Demo Reset', 'Synthetic patients and telemetry history reset successfully.', 'success');
          setTimeout(() => window.location.reload(), 500);
        }
      });
    }
  },

  setupThresholdsForm() {
    const form = document.getElementById('settings-thresholds-form');
    if (!form || typeof AlertEngine === 'undefined') return;

    const t = AlertEngine.thresholds;
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };

    setVal('thresh-hr-crit-high', t.heartRate.criticalHigh);
    setVal('thresh-hr-crit-low', t.heartRate.criticalLow);
    setVal('thresh-spo2-crit-low', t.spo2.criticalLow);
    setVal('thresh-sys-crit-high', t.bpSystolic.criticalHigh);
    setVal('thresh-temp-crit-high', t.temperature.criticalHigh);

    form.addEventListener('submit', e => {
      e.preventDefault();
      const getNum = id => parseFloat(document.getElementById(id)?.value);

      t.heartRate.criticalHigh = getNum('thresh-hr-crit-high') || 120;
      t.heartRate.criticalLow = getNum('thresh-hr-crit-low') || 50;
      t.spo2.criticalLow = getNum('thresh-spo2-crit-low') || 90;
      t.bpSystolic.criticalHigh = getNum('thresh-sys-crit-high') || 160;
      t.temperature.criticalHigh = getNum('thresh-temp-crit-high') || 38.5;

      this.addAuditLog('THRESHOLDS_UPDATED', 'Clinical alert reference boundaries reconfigured.');
      App.toast('Thresholds Saved', 'Clinical alert trigger parameters updated.', 'success');
    });
  },

  async checkServerHealth() {
    const healthBadge = document.getElementById('settings-ai-status-badge');
    const healthDesc = document.getElementById('settings-ai-status-desc');

    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('API response error');
      const data = await res.json();

      if (healthBadge) {
        if (data.hasGeminiKey) {
          healthBadge.className = 'status-pill status-normal';
          healthBadge.textContent = 'Google Gemini 1.5 Live';
        } else {
          healthBadge.className = 'status-pill status-info';
          healthBadge.textContent = 'Rules Engine Fallback (Verified)';
        }
      }

      if (healthDesc) {
        healthDesc.textContent = data.hasGeminiKey
          ? 'Secure server-side Gemini endpoint configured with active API key.'
          : 'Server active in deterministic clinical decision rules mode (No external API key required).';
      }
    } catch (err) {
      if (healthBadge) {
        healthBadge.className = 'status-pill status-warning';
        healthBadge.textContent = 'Client Local Mode';
      }
      if (healthDesc) {
        healthDesc.textContent = 'Operating via in-browser JavaScript clinical rules engine.';
      }
    }
  },

  render() {
    const user = Auth.getCurrentUser();
    if (user) {
      const nameEl = document.getElementById('settings-user-name');
      const emailEl = document.getElementById('settings-user-email');
      const roleEl = document.getElementById('settings-user-role');
      const deptEl = document.getElementById('settings-user-dept');
      const permsEl = document.getElementById('settings-user-perms');

      if (nameEl) nameEl.textContent = user.name;
      if (emailEl) emailEl.textContent = user.email;
      if (roleEl) roleEl.textContent = user.roleTitle;
      if (deptEl) deptEl.textContent = user.department;
      if (permsEl) {
        permsEl.innerHTML = (user.permissions || ['Standard Inpatient Access'])
          .map(p => `<span class="status-pill status-info" style="font-size:0.7rem;">${p}</span>`)
          .join(' ');
      }
    }

    this.renderAuditLogs();
  },

  renderAuditLogs() {
    const container = document.getElementById('settings-audit-log-list');
    if (!container) return;

    if (this.auditLogs.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-desc">No audit log entries recorded.</div></div>`;
      return;
    }

    container.innerHTML = this.auditLogs
      .slice(0, 15)
      .map(
        l => `
      <div style="padding: 10px 14px; border-bottom: 1px solid var(--color-border-light); font-size: var(--font-size-xs); display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <div style="font-weight: 600; color: var(--color-text-primary); margin-bottom: 2px;">
            <span class="status-pill status-info" style="font-size:0.65rem; margin-right:6px;">${Utils.escapeHtml(l.action)}</span>
            ${Utils.escapeHtml(l.details)}
          </div>
          <div style="color: var(--color-text-secondary); font-size: 0.72rem;">Actor: ${Utils.escapeHtml(l.actor)}</div>
        </div>
        <div style="color: var(--color-text-tertiary); font-size: 0.7rem; white-space: nowrap;">
          ${Utils.timeAgo(l.timestamp)}
        </div>
      </div>
    `
      )
      .join('');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('settings-workspace')) {
    Settings.init();
  }
});
