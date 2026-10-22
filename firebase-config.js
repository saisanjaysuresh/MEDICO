/* ==========================================================================
   MEDICO - FIREBASE CONFIGURATION & FALLBACK BRIDGE
   ========================================================================== */

const FirebaseBridge = {
  isConfigured: false,
  isDemoMode: true,
  auth: null,
  firestore: null,

  // Firebase client configuration parameters (Fill in when connecting live Firebase)
  firebaseConfig: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },

  /**
   * Initialize Firebase SDK if credentials are present
   */
  init() {
    if (this.firebaseConfig.apiKey && typeof firebase !== 'undefined' && firebase.initializeApp) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(this.firebaseConfig);
        }
        this.auth = firebase.auth();
        this.firestore = firebase.firestore();
        this.isConfigured = true;
        this.isDemoMode = false;
        console.log('[Medico] Firebase initialized in live cloud mode.');
        return;
      } catch (err) {
        console.warn('[Medico] Firebase initialization error, falling back to local demo mode:', err);
      }
    }

    // Default to verified local demonstration mode
    this.isConfigured = false;
    this.isDemoMode = true;
    console.log('[Medico] Operating in verified Demo Mode with synthetic patient simulation.');
  },

  /**
   * Status label helper
   */
  getStatus() {
    return {
      mode: this.isDemoMode ? 'DEMO_SIMULATION' : 'FIREBASE_LIVE',
      isDemoMode: this.isDemoMode,
      description: this.isDemoMode
        ? 'Active Demo Mode (Synthetic Telemetry & Browser Storage)'
        : 'Live Cloud Firestore & Firebase Auth Connected'
    };
  }
};

// Auto-run initialization check
FirebaseBridge.init();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FirebaseBridge;
}
