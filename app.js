/* ==========================================================================
   MEDICO - CORE APPLICATION COORDINATOR & GLOBAL CONTROLLER
   ========================================================================== */

const App = {
  currentUser: null,

  init() {
    // Determine current page
    const pathname = window.location.pathname;
    const page = pathname.substring(pathname.lastIndexOf('/') + 1) || 'index.html';

    // Route Protection: If not on login page, ensure user is signed in
    if (!page.includes('login.html')) {
      this.currentUser = Auth.requireAuth();
      this.setupGlobalUI();
      this.highlightActiveNav(page);
    }

    // Initialize Simulation Engine
    if (typeof SimulationEngine !== 'undefined') {
      SimulationEngine.init();
    }

    // Initialize Notifications
    if (typeof Notifications !== 'undefined') {
      Notifications.init();
    }

    // Connect Alert listener to notifications & toasts
    if (typeof SimulationEngine !== 'undefined' && typeof Notifications !== 'undefined') {
      SimulationEngine.onAlert(alert => {
        Notifications.add(
          'alert',
          `${alert.severity.toUpperCase()}: ${alert.patientName}`,
          alert.message,
          `patient-monitoring.html?id=${alert.patientId}`
        );
      });
    }

    // Initialize Lucide Icons
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    this.bindEngineStatus();
  },

  /**
   * Set up common topbar and header elements across pages
   */
  setupGlobalUI() {
    // Update User Profile Menu in Header
    if (this.currentUser) {
      const nameEl = document.getElementById('header-user-name');
      const roleEl = document.getElementById('header-user-role');
      const avatarEl = document.getElementById('header-user-avatar');

      if (nameEl) nameEl.textContent = this.currentUser.name;
      if (roleEl) roleEl.textContent = this.currentUser.roleTitle || this.currentUser.role;
      if (avatarEl) avatarEl.textContent = this.currentUser.avatarText || 'DR';
    }

    // Sign out button
    const logoutBtn = document.getElementById('header-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => Auth.logout());
    }

    // Mobile Sidebar Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.app-sidebar');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');

    if (mobileMenuBtn && sidebar) {
      mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
        if (sidebarBackdrop) sidebarBackdrop.classList.toggle('active');
      });
    }

    if (sidebarBackdrop) {
      sidebarBackdrop.addEventListener('click', () => {
        if (sidebar) sidebar.classList.remove('mobile-open');
        sidebarBackdrop.classList.remove('active');
      });
    }

    // Topbar Demo Scenario Selector
    const topScenarioSelect = document.getElementById('topbar-scenario-select');
    if (topScenarioSelect && typeof SimulationEngine !== 'undefined') {
      topScenarioSelect.value = SimulationEngine.activeScenario;
      topScenarioSelect.addEventListener('change', e => {
        SimulationEngine.setScenario(e.target.value, SimulationEngine.targetPatientId || 'MED-101');
        App.toast(
          'Simulation Preset Applied',
          `Scenario switched to "${e.target.options[e.target.selectedIndex].text}".`,
          'info'
        );
      });
    }

    // Quick Simulation Play/Pause button in header
    const topSimToggle = document.getElementById('topbar-sim-toggle');
    if (topSimToggle && typeof SimulationEngine !== 'undefined') {
      const updateIcon = () => {
        topSimToggle.innerHTML = SimulationEngine.isRunning
          ? '<i data-lucide="pause" class="icon-sm"></i>'
          : '<i data-lucide="play" class="icon-sm"></i>';
        topSimToggle.title = SimulationEngine.isRunning ? 'Pause Simulation' : 'Resume Simulation';
        if (typeof lucide !== 'undefined') lucide.createIcons();
      };
      updateIcon();

      topSimToggle.addEventListener('click', () => {
        if (SimulationEngine.isRunning) {
          SimulationEngine.stop();
          App.toast('Simulation Paused', 'Synthetic vitals update timer paused.', 'warning');
        } else {
          SimulationEngine.start();
          App.toast('Simulation Resumed', 'Continuous telemetry generation active.', 'success');
        }
        updateIcon();
      });
    }
  },

  /**
   * Highlight the active navigation item in the sidebar
   */
  highlightActiveNav(currentPage) {
    const navLinks = document.querySelectorAll('.app-sidebar .nav-item');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && (href === currentPage || (currentPage === '' && href === 'index.html'))) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  },

  /**
   * Display a clean toast message
   */
  toast(title, message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconName =
      type === 'success'
        ? 'check-circle'
        : type === 'warning'
        ? 'alert-triangle'
        : type === 'critical'
        ? 'alert-octagon'
        : 'info';

    toast.innerHTML = `
      <div class="toast-icon">
        <i data-lucide="${iconName}" class="icon-md"></i>
      </div>
      <div class="toast-content">
        <div class="toast-title">${Utils.escapeHtml(title)}</div>
        <div class="toast-msg">${Utils.escapeHtml(message)}</div>
      </div>
      <button class="toast-close" aria-label="Close Toast">
        <i data-lucide="x" class="icon-sm"></i>
      </button>
    `;

    container.appendChild(toast);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 200);
    });

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 200);
      }
    }, duration);
  },

  /**
   * Update sidebar engine status panel
   */
  bindEngineStatus() {
    window.addEventListener('medico:engine-status', e => {
      const statusText = document.getElementById('sidebar-engine-status-text');
      const pulseDot = document.getElementById('sidebar-engine-pulse');
      if (statusText && pulseDot) {
        if (e.detail.isRunning) {
          statusText.textContent = `Live (${e.detail.intervalMs / 1000}s)`;
          pulseDot.className = 'pulse-green';
        } else {
          statusText.textContent = 'Paused';
          pulseDot.className = 'pulse-dot';
        }
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

window.Medico = {
  App,
  Auth,
  SimulationEngine,
  AlertEngine,
  Utils,
  Validation,
  ChartManager,
  Notifications
};
