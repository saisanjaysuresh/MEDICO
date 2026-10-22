/* ==========================================================================
   MEDICO - SCREEN 6: ALERT MANAGEMENT & RESOLUTION UI CONTROLLER
   ========================================================================== */

const AlertsUI = {
  severityFilter: 'all',
  statusFilter: 'all',
  patientFilter: 'all',
  activeResolvingAlertId: null,

  init() {
    this.setupFilters();
    this.setupResolveModal();
    this.render();

    // Subscribe to new alerts in simulation
    if (typeof SimulationEngine !== 'undefined') {
      SimulationEngine.onAlert(() => this.render());
    }
  },

  setupFilters() {
    const sevSelect = document.getElementById('alert-filter-severity');
    if (sevSelect) {
      sevSelect.addEventListener('change', e => {
        this.severityFilter = e.target.value;
        this.render();
      });
    }

    const statSelect = document.getElementById('alert-filter-status');
    if (statSelect) {
      statSelect.addEventListener('change', e => {
        this.statusFilter = e.target.value;
        this.render();
      });
    }

    const triggerTestBtn = document.getElementById('trigger-test-alert-btn');
    if (triggerTestBtn && typeof SimulationEngine !== 'undefined') {
      triggerTestBtn.addEventListener('click', () => {
        const alt = SimulationEngine.triggerTestAlert('MED-101');
        App.toast('Test Alert Generated', alt.message, 'critical');
        this.render();
      });
    }
  },

  setupResolveModal() {
    const backdrop = document.getElementById('resolve-modal-backdrop');
    const closeBtn = document.getElementById('resolve-modal-close');
    const cancelBtn = document.getElementById('resolve-modal-cancel');
    const form = document.getElementById('resolve-alert-form');

    const closeModal = () => {
      if (backdrop) backdrop.classList.remove('open');
      this.activeResolvingAlertId = null;
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (backdrop) {
      backdrop.addEventListener('click', e => {
        if (e.target === backdrop) closeModal();
      });
    }

    if (form) {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const noteInput = document.getElementById('resolve-note-input');
        const note = noteInput ? noteInput.value.trim() : '';

        if (!note) {
          App.toast('Note Required', 'Please enter clinical resolution notes before resolving.', 'warning');
          return;
        }

        this.completeResolution(note);
        closeModal();
      });
    }
  },

  getFilteredAlerts() {
    if (typeof SimulationEngine === 'undefined') return [];
    let list = [...(SimulationEngine.alertsHistory || [])];

    if (this.severityFilter !== 'all') {
      list = list.filter(a => a.severity === this.severityFilter);
    }

    if (this.statusFilter !== 'all') {
      list = list.filter(a => a.status === this.statusFilter);
    }

    return list;
  },

  render() {
    const container = document.getElementById('alerts-feed-container');
    if (!container) return;

    const list = this.getFilteredAlerts();

    // Update count badge
    const countBadge = document.getElementById('alerts-total-count');
    if (countBadge) countBadge.textContent = `${list.length} Alerts`;

    if (list.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="shield-check"></i></div>
          <div class="empty-state-title">No alerts matching filter</div>
          <div class="empty-state-desc">Try resetting your filter parameters.</div>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    container.innerHTML = list
      .map(
        a => `
      <div class="card alert-item-card alert-sev-${a.severity}" style="padding: 18px; margin-bottom: 14px;">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap: 12px; margin-bottom: 8px;">
          <div>
            <div style="display:flex; align-items:center; gap: 8px; margin-bottom: 4px;">
              <span class="status-pill status-${a.severity}">${a.severity.toUpperCase()}</span>
              <strong style="font-size: var(--font-size-md);">${Utils.escapeHtml(a.patientName)}</strong>
              <span class="text-xs text-secondary">(${Utils.escapeHtml(a.room || a.patientId)})</span>
            </div>
            <div style="font-size: var(--font-size-sm); color: var(--color-text-primary); margin-bottom: 6px;">
              ${Utils.escapeHtml(a.message)}
            </div>
          </div>
          <div style="text-align: right;">
            <span class="text-xs text-tertiary">${Utils.timeAgo(a.timestamp)}</span>
            <div class="text-xs text-secondary">${Utils.formatDateTime(a.timestamp)}</div>
          </div>
        </div>

        <div style="background-color: rgba(0,0,0,0.03); padding: 10px 14px; border-radius: var(--radius-md); font-size: var(--font-size-xs); display:flex; gap: 18px; margin-bottom: 12px; flex-wrap: wrap;">
          <div><strong>Observed Value:</strong> <span class="font-bold">${Utils.escapeHtml(a.observedValue)}</span></div>
          <div><strong>Configured Threshold:</strong> ${Utils.escapeHtml(a.threshold)}</div>
          <div><strong>Source:</strong> ${Utils.escapeHtml(a.source)}</div>
          <div><strong>Status:</strong> <span class="status-pill ${a.status === 'resolved' ? 'status-normal' : a.status === 'acknowledged' ? 'status-warning' : 'status-critical'}">${a.status.toUpperCase()}</span></div>
        </div>

        <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-bottom: 12px;">
          <strong>Recommended Action:</strong> ${Utils.escapeHtml(a.actionRecommended || 'Verify bedside condition.')}
        </div>

        ${
          a.status === 'acknowledged'
            ? `<div class="text-xs text-secondary" style="margin-bottom: 10px;"><em>Acknowledged by ${Utils.escapeHtml(a.acknowledgedBy)} at ${Utils.formatTime(a.acknowledgedAt)}.</em></div>`
            : ''
        }

        ${
          a.status === 'resolved'
            ? `<div class="text-xs text-normal" style="margin-bottom: 10px; background-color: var(--color-normal-bg); padding: 6px 10px; border-radius: var(--radius-sm);">
                <strong>Resolved by ${Utils.escapeHtml(a.resolvedBy)}:</strong> ${Utils.escapeHtml(a.resolutionNote)}
               </div>`
            : ''
        }

        <div style="display:flex; align-items:center; justify-content:space-between; border-top: 1px solid var(--color-border-light); padding-top: 10px;">
          <a href="patient-monitoring.html?id=${a.patientId}" class="btn btn-outline btn-sm">
            <i data-lucide="activity" class="icon-sm"></i> Inspect Patient
          </a>

          <div style="display:flex; gap: 8px;">
            ${
              a.status === 'active'
                ? `
              <button class="btn btn-secondary btn-sm" onclick="AlertsUI.acknowledgeAlert('${a.id}')">
                <i data-lucide="check" class="icon-sm"></i> Acknowledge
              </button>
            `
                : ''
            }

            ${
              a.status !== 'resolved'
                ? `
              <button class="btn btn-success btn-sm" onclick="AlertsUI.openResolveModal('${a.id}')">
                <i data-lucide="check-check" class="icon-sm"></i> Resolve
              </button>
            `
                : ''
            }
          </div>
        </div>
      </div>
    `
      )
      .join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  acknowledgeAlert(alertId) {
    const alert = SimulationEngine.alertsHistory.find(a => a.id === alertId);
    if (!alert) return;

    const user = Auth.getCurrentUser();
    AlertEngine.acknowledgeAlert(alert, user);

    // Also update activeAlerts reference
    const active = SimulationEngine.activeAlerts.find(a => a.id === alertId);
    if (active) AlertEngine.acknowledgeAlert(active, user);

    App.toast('Alert Acknowledged', `Alert for ${alert.patientName} acknowledged.`, 'info');
    this.render();
  },

  openResolveModal(alertId) {
    this.activeResolvingAlertId = alertId;
    const alert = SimulationEngine.alertsHistory.find(a => a.id === alertId);
    if (!alert) return;

    const header = document.getElementById('resolve-modal-patient-info');
    if (header) {
      header.textContent = `Resolving: ${alert.patientName} (${alert.parameter} - ${alert.observedValue})`;
    }

    const noteInput = document.getElementById('resolve-note-input');
    if (noteInput) noteInput.value = '';

    const backdrop = document.getElementById('resolve-modal-backdrop');
    if (backdrop) backdrop.classList.add('open');
  },

  completeResolution(note) {
    const alert = SimulationEngine.alertsHistory.find(a => a.id === this.activeResolvingAlertId);
    if (!alert) return;

    const user = Auth.getCurrentUser();
    AlertEngine.resolveAlert(alert, user, note);

    // Remove from active alerts list
    SimulationEngine.activeAlerts = SimulationEngine.activeAlerts.filter(a => a.id !== this.activeResolvingAlertId);

    App.toast('Alert Resolved', `Alert marked as resolved with clinical verification notes.`, 'success');
    this.render();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('alerts-feed-container')) {
    AlertsUI.init();
  }
});
