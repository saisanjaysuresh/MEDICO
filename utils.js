/* ==========================================================================
   MEDICO - UTILITY FUNCTIONS
   ========================================================================== */

const Utils = {
  /**
   * Format timestamp into 12-hour time: "10:45:12 AM"
   */
  formatTime(timestamp) {
    if (!timestamp) return '--:--';
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  },

  /**
   * Format timestamp into date & time: "Oct 22, 2026, 10:45 AM"
   */
  formatDateTime(timestamp) {
    if (!timestamp) return '--';
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Short relative time: "2s ago", "5m ago", "1h ago"
   */
  timeAgo(timestamp) {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const elapsed = Math.max(0, Math.floor((now - new Date(timestamp).getTime()) / 1000));
    
    if (elapsed < 5) return 'Just now';
    if (elapsed < 60) return `${elapsed}s ago`;
    const mins = Math.floor(elapsed / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  },

  /**
   * Generate UUID-style unique identifier
   */
  generateId(prefix = 'id') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
  },

  /**
   * Math helpers for clinical statistics
   */
  calcMean(numbers) {
    const valid = numbers.filter(n => typeof n === 'number' && !isNaN(n));
    if (valid.length === 0) return 0;
    const sum = valid.reduce((acc, curr) => acc + curr, 0);
    return Number((sum / valid.length).toFixed(1));
  },

  calcMedian(numbers) {
    const valid = numbers.filter(n => typeof n === 'number' && !isNaN(n)).sort((a, b) => a - b);
    if (valid.length === 0) return 0;
    const mid = Math.floor(valid.length / 2);
    if (valid.length % 2 !== 0) {
      return valid[mid];
    }
    return Number(((valid[mid - 1] + valid[mid]) / 2).toFixed(1));
  },

  calcMin(numbers) {
    const valid = numbers.filter(n => typeof n === 'number' && !isNaN(n));
    if (valid.length === 0) return 0;
    return Math.min(...valid);
  },

  calcMax(numbers) {
    const valid = numbers.filter(n => typeof n === 'number' && !isNaN(n));
    if (valid.length === 0) return 0;
    return Math.max(...valid);
  },

  /**
   * Debounce execution
   */
  debounce(func, wait = 250) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  },

  /**
   * Generate CSV and trigger browser download
   */
  exportToCsv(filename, rows) {
    if (!rows || !rows.length) return;
    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent = [
      keys.join(separator),
      ...rows.map(row =>
        keys
          .map(k => {
            let cell = row[k] === null || row[k] === undefined ? '' : String(row[k]);
            cell = cell.replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) {
              cell = `"${cell}"`;
            }
            return cell;
          })
          .join(separator)
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },

  /**
   * Safe HTML Escaping for prevention of injection
   */
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
