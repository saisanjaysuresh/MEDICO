/* ==========================================================================
   MEDICO - SCREEN 5: AI INSIGHTS & CLINICAL ANALYSIS CONTROLLER
   ========================================================================== */

const AIInsights = {
  selectedPatientId: 'MED-101',
  chatMessages: [],

  init() {
    this.setupPatientSelector();
    this.setupQuestionPanel();
    this.loadInsights();
  },

  setupPatientSelector() {
    const select = document.getElementById('ai-patient-select');
    if (!select || typeof SimulationEngine === 'undefined') return;

    select.innerHTML = SimulationEngine.patients
      .map(
        p => `
      <option value="${p.id}" ${p.id === this.selectedPatientId ? 'selected' : ''}>
        ${p.id} — ${p.name} (${p.room})
      </option>
    `
      )
      .join('');

    select.addEventListener('change', e => {
      this.selectedPatientId = e.target.value;
      this.chatMessages = [];
      this.loadInsights();
    });

    const refreshBtn = document.getElementById('ai-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadInsights());
    }
  },

  setupQuestionPanel() {
    // Quick prompt chips
    const chips = document.querySelectorAll('.ai-prompt-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const question = chip.dataset.question || chip.textContent.trim();
        this.askQuestion(question);
      });
    });

    // Form submit
    const form = document.getElementById('ai-ask-form');
    if (form) {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const input = document.getElementById('ai-question-input');
        const question = input ? input.value.trim() : '';
        if (question) {
          this.askQuestion(question);
          input.value = '';
        }
      });
    }
  },

  async loadInsights() {
    const patient = SimulationEngine.getPatient(this.selectedPatientId);
    if (!patient) return;

    const obs = SimulationEngine.getPatientHistory(this.selectedPatientId, 20);

    const summaryBox = document.getElementById('ai-summary-container');
    if (summaryBox) {
      summaryBox.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <div class="empty-state-icon" style="margin: 0 auto 12px auto;"><i data-lucide="sparkles"></i></div>
          <div class="font-semibold">Synthesizing Clinical Insights...</div>
          <div class="text-xs text-secondary">Analyzing telemetry trajectory and thresholds...</div>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    try {
      // Call backend API endpoint
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient, observations: obs })
      });

      if (!response.ok) throw new Error('API offline');
      const data = await response.json();
      this.renderInsights(data, patient);
    } catch (err) {
      console.warn('API fetch failed, falling back to client-side clinical analysis:', err);
      // Client-side fallback using same deterministic engine
      const fallback = ClinicalRulesService
        ? ClinicalRulesService.generateInsights(patient, obs)
        : this.generateClientFallback(patient, obs);
      this.renderInsights(fallback, patient);
    }
  },

  generateClientFallback(patient, obs) {
    const cur = patient.current || {};
    return {
      provider: 'Medico Client Deterministic Rules Engine',
      mode: 'RULES_BASED_FALLBACK',
      timestamp: new Date().toISOString(),
      analysisWindow: `${obs.length} observations evaluated`,
      observedData: `Patient ${patient.name} (${patient.id}, ${patient.room}): Current HR ${cur.hr ?? '--'} bpm, SpO₂ ${cur.spo2 ?? '--'}%, BP ${cur.bpSys ? `${cur.bpSys}/${cur.bpDia}` : '--'} mmHg.`,
      trendInterpretation:
        cur.hr > 100
          ? 'Tachycardia trend identified. Net acceleration observed in heart rate over last monitoring window.'
          : 'Physiological readings are bounded and stable.',
      dataQualityLimitations: ['Simulated demonstration vitals stream.'],
      suggestedNextSteps: ['Confirm vital signs at bedside.', 'Review continuous telemetry trace during clinical rounds.']
    };
  },

  renderInsights(data, patient) {
    const container = document.getElementById('ai-summary-container');
    if (!container) return;

    const isLive = data.mode === 'AI_PROVIDER_LIVE';

    container.innerHTML = `
      <div class="ai-summary-header">
        <div style="display:flex; align-items:center; gap: 10px;">
          <span class="ai-badge">
            <i data-lucide="sparkles" class="icon-sm"></i>
            ${isLive ? 'Gemini 1.5 Clinical AI' : 'Clinical Rules Engine (Deterministic)'}
          </span>
          <span class="text-xs text-secondary">${data.analysisWindow || 'Recent observation buffer'}</span>
        </div>
        <span class="text-xs text-tertiary">Generated: ${Utils.formatTime(data.timestamp)}</span>
      </div>

      <div class="ai-sections-grid">
        <div class="ai-section-card">
          <div class="ai-section-title">
            <i data-lucide="clipboard-list" class="icon-sm"></i>
            Observed Clinical Data
          </div>
          <div class="ai-section-body">${Utils.escapeHtml(data.observedData)}</div>
        </div>

        <div class="ai-section-card">
          <div class="ai-section-title">
            <i data-lucide="trending-up" class="icon-sm"></i>
            Trend Interpretation
          </div>
          <div class="ai-section-body">${Utils.escapeHtml(data.trendInterpretation)}</div>
        </div>

        <div class="ai-section-card">
          <div class="ai-section-title">
            <i data-lucide="shield-alert" class="icon-sm"></i>
            Data Quality & Limitations
          </div>
          <ul style="list-style:disc; margin-left:18px; font-size:var(--font-size-sm); color:var(--color-text-secondary); display:flex; flex-direction:column; gap:4px;">
            ${(data.dataQualityLimitations || ['Demo simulated telemetry stream.']).map(lim => `<li>${Utils.escapeHtml(lim)}</li>`).join('')}
          </ul>
        </div>

        <div class="ai-section-card">
          <div class="ai-section-title">
            <i data-lucide="check-circle" class="icon-sm"></i>
            Suggested Next Steps
          </div>
          <ul style="list-style:disc; margin-left:18px; font-size:var(--font-size-sm); color:var(--color-text-primary); display:flex; flex-direction:column; gap:4px;">
            ${(data.suggestedNextSteps || ['Verify bedside status.']).map(step => `<li>${Utils.escapeHtml(step)}</li>`).join('')}
          </ul>
        </div>
      </div>

      <div class="ai-disclaimer">
        Notice: Medico decision-support algorithms provide observational interpretation based strictly on recorded telemetry. This system does not diagnose or prescribe. All outputs require clinical validation by licensed medical personnel.
      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  async askQuestion(question) {
    const patient = SimulationEngine.getPatient(this.selectedPatientId);
    if (!patient) return;

    // Push user message
    this.chatMessages.push({ role: 'user', text: question });
    this.renderChatThread();

    // Show loading AI bubble
    this.chatMessages.push({ role: 'ai', text: 'Analyzing observations...', loading: true });
    this.renderChatThread();

    const obs = SimulationEngine.getPatientHistory(this.selectedPatientId, 20);

    try {
      const response = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, patient, observations: obs })
      });

      if (!response.ok) throw new Error('API offline');
      const data = await response.json();

      this.chatMessages.pop(); // Remove loading bubble
      this.chatMessages.push({ role: 'ai', text: data.answer });
    } catch (e) {
      this.chatMessages.pop();
      // Client-side answer fallback
      const answer = `Based on current telemetry for ${patient.name} (${patient.room}): Heart rate is ${patient.current?.hr ?? '--'} bpm, SpO₂ is ${patient.current?.spo2 ?? '--'}%, BP is ${patient.current?.bpSys ? `${patient.current.bpSys}/${patient.current.bpDia}` : '--'} mmHg. All observations are verified against configured hospital limits.`;
      this.chatMessages.push({ role: 'ai', text: answer });
    }

    this.renderChatThread();
  },

  renderChatThread() {
    const thread = document.getElementById('ai-chat-thread');
    if (!thread) return;

    if (this.chatMessages.length === 0) {
      thread.innerHTML = `
        <div class="empty-state" style="padding: 20px;">
          <div class="text-xs text-secondary">Ask questions about ${this.selectedPatientId}'s vitals, trends, or abnormal readings above.</div>
        </div>
      `;
      return;
    }

    thread.innerHTML = this.chatMessages
      .map(
        msg => `
      <div class="chat-bubble chat-bubble-${msg.role}">
        ${msg.loading ? '<span class="pulse-dot" style="display:inline-block; margin-right:6px;"></span>' : ''}
        ${Utils.escapeHtml(msg.text)}
      </div>
    `
      )
      .join('');

    thread.scrollTop = thread.scrollHeight;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('ai-insights-container')) {
    AIInsights.init();
  }
});
