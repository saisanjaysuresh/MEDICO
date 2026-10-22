/* ==========================================================================
   MEDICO - NOTIFICATIONS & ACTIVITY HISTORY SERVICE
   ========================================================================== */

const Notifications = {
  items: [],
  unreadCount: 0,
  drawerOpen: false,

  init() {
    const saved = localStorage.getItem('medico_notifications');
    if (saved) {
      try {
        this.items = JSON.parse(saved);
      } catch (e) {
        this.items = [];
      }
    } else {
      // Seed realistic initial notifications
      this.items = [
        {
          id: 'NOTIF-01',
          type: 'alert',
          title: 'Critical Tachycardia Alert',
          message: 'Patient James Wilson (CCU-02) HR reached 108 bpm.',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          read: false,
          link: 'patient-monitoring.html?id=MED-104'
        },
        {
          id: 'NOTIF-02',
          type: 'system',
          title: 'Simulation Engine Initialized',
          message: 'Demo mode active with 12 synthetic inpatient telemetry feeds.',
          timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          read: false
        },
        {
          id: 'NOTIF-03',
          type: 'patient',
          title: 'Patient Admission Registered',
          message: 'Eleanor Vance admitted to ICU-Bed 01 under Dr. Sarah Jenkins.',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          read: true,
          link: 'patient-monitoring.html?id=MED-101'
        }
      ];
      this.save();
    }

    this.calculateUnread();
    this.renderBadge();
    this.setupDrawerListeners();
  },

  save() {
    localStorage.setItem('medico_notifications', JSON.stringify(this.items));
    this.calculateUnread();
    this.renderBadge();
  },

  calculateUnread() {
    this.unreadCount = this.items.filter(n => !n.read).length;
  },

  renderBadge() {
    const badge = document.getElementById('notif-badge-count');
    if (badge) {
      if (this.unreadCount > 0) {
        badge.textContent = this.unreadCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  },

  add(type, title, message, link = null) {
    const newNotif = {
      id: `NOTIF-${Date.now()}`,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      link
    };

    this.items.unshift(newNotif);
    if (this.items.length > 50) this.items.pop();
    this.save();
    this.renderDrawerList();

    // Trigger toast notification on screen
    if (typeof App !== 'undefined' && App.toast) {
      App.toast(title, message, type === 'alert' ? 'critical' : 'info');
    }
  },

  markAllAsRead() {
    this.items.forEach(n => (n.read = true));
    this.save();
    this.renderDrawerList();
  },

  toggleDrawer() {
    const drawer = document.getElementById('notification-drawer');
    const backdrop = document.getElementById('notification-backdrop');
    if (!drawer) return;

    this.drawerOpen = !this.drawerOpen;
    if (this.drawerOpen) {
      drawer.classList.add('open');
      if (backdrop) backdrop.classList.add('active');
      this.renderDrawerList();
    } else {
      drawer.classList.remove('open');
      if (backdrop) backdrop.classList.remove('active');
    }
  },

  setupDrawerListeners() {
    const trigger = document.getElementById('header-notif-btn');
    if (trigger) {
      trigger.addEventListener('click', () => this.toggleDrawer());
    }

    const closeBtn = document.getElementById('close-drawer-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.toggleDrawer());
    }

    const markReadBtn = document.getElementById('mark-all-read-btn');
    if (markReadBtn) {
      markReadBtn.addEventListener('click', () => this.markAllAsRead());
    }

    const backdrop = document.getElementById('notification-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        if (this.drawerOpen) this.toggleDrawer();
      });
    }
  },

  renderDrawerList() {
    const listContainer = document.getElementById('drawer-notifications-list');
    if (!listContainer) return;

    if (this.items.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i data-lucide="bell-off"></i>
          </div>
          <div class="empty-state-title">No notifications</div>
          <div class="empty-state-desc">You are completely caught up with patient vitals and clinical alerts.</div>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    listContainer.innerHTML = this.items
      .map(
        n => `
      <div class="alert-item-card ${n.read ? '' : 'alert-sev-info'}" style="margin-bottom: 8px; cursor: ${n.link ? 'pointer' : 'default'};" ${n.link ? `onclick="window.location.href='${n.link}'"` : ''}>
        <div class="alert-item-header">
          <span style="font-weight: 600; font-size: 0.85rem; color: var(--color-text-primary);">${Utils.escapeHtml(n.title)}</span>
          <span class="alert-time">${Utils.timeAgo(n.timestamp)}</span>
        </div>
        <div class="alert-item-body">${Utils.escapeHtml(n.message)}</div>
      </div>
    `
      )
      .join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Notifications;
}
