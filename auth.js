/* ==========================================================================
   MEDICO - AUTHENTICATION & ACCESS CONTROL SERVICE
   ========================================================================== */

const Auth = {
  // Preset Demo Accounts for Quick Demonstration
  demoAccounts: {
    doctor: {
      id: 'USR-DOC-01',
      name: 'Dr. Sarah Jenkins',
      email: 's.jenkins@medico.hospital',
      role: 'doctor',
      roleTitle: 'Chief of Cardiology',
      department: 'Cardiovascular ICU',
      avatarText: 'SJ',
      permissions: ['view_all_patients', 'prescribe_notes', 'resolve_alerts', 'access_ai', 'export_reports']
    },
    nurse: {
      id: 'USR-NUR-02',
      name: 'Nurse Marcus O\'Connor',
      email: 'm.oconnor@medico.hospital',
      role: 'nurse',
      roleTitle: 'Senior Critical Care Nurse',
      department: 'Step-Down & ICU',
      avatarText: 'MO',
      permissions: ['view_assigned_patients', 'record_vitals', 'acknowledge_alerts', 'add_clinical_notes']
    },
    admin: {
      id: 'USR-ADM-03',
      name: 'Alex Rivera',
      email: 'a.rivera@medico.hospital',
      role: 'admin',
      roleTitle: 'Hospital System Administrator',
      department: 'Clinical Operations & IT',
      avatarText: 'AR',
      permissions: ['manage_users', 'system_settings', 'audit_logs', 'view_all_patients', 'configure_thresholds']
    },
    caregiver: {
      id: 'USR-CG-04',
      name: 'Maria Vance',
      email: 'm.vance@caregiver.demo',
      role: 'caregiver',
      roleTitle: 'Authorized Family Caregiver',
      department: 'Patient Family Portal',
      avatarText: 'MV',
      permissions: ['view_assigned_patients']
    }
  },

  /**
   * Get currently signed-in user
   */
  getCurrentUser() {
    const session = localStorage.getItem('medico_current_user');
    if (session) {
      try {
        return JSON.parse(session);
      } catch (e) {
        return null;
      }
    }
    // Default to Dr. Sarah Jenkins if not logged in during demo
    return this.demoAccounts.doctor;
  },

  /**
   * Sign in with demo preset
   */
  loginAsPreset(roleKey) {
    const account = this.demoAccounts[roleKey] || this.demoAccounts.doctor;
    localStorage.setItem('medico_current_user', JSON.stringify(account));
    return account;
  },

  /**
   * Sign in with custom credentials
   */
  loginWithEmail(email, password) {
    if (!email || !password) {
      return { success: false, error: 'Please enter both email and password.' };
    }

    // Match against demo presets or create custom authenticated session
    let matched = Object.values(this.demoAccounts).find(a => a.email.toLowerCase() === email.trim().toLowerCase());

    if (!matched) {
      // In demo mode, permit any reasonable login with doctor privileges
      matched = {
        id: `USR-${Date.now()}`,
        name: email.split('@')[0].replace(/[._]/g, ' '),
        email: email.trim(),
        role: 'doctor',
        roleTitle: 'Staff Physician',
        department: 'General Inpatient',
        avatarText: email.substring(0, 2).toUpperCase(),
        permissions: ['view_all_patients', 'prescribe_notes', 'resolve_alerts', 'access_ai', 'export_reports']
      };
    }

    localStorage.setItem('medico_current_user', JSON.stringify(matched));
    return { success: true, user: matched };
  },

  /**
   * Sign out
   */
  logout() {
    localStorage.removeItem('medico_current_user');
    window.location.href = 'login.html';
  },

  /**
   * Check if current user has permission
   */
  hasPermission(permissionName) {
    const user = this.getCurrentUser();
    if (!user || !user.permissions) return false;
    if (user.role === 'admin') return true;
    return user.permissions.includes(permissionName);
  },

  /**
   * Route protection check for protected pages
   */
  requireAuth() {
    const user = this.getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
    }
    return user;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Auth;
}
