/**
 * utils.js
 * Shared utility helpers used across all tab modules.
 */

'use strict';

/* ── HTML escaping ──────────────────────────────────────────── */
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Date formatting ────────────────────────────────────────── */
function fmtDate(str) {
  if (!str) return '—';
  try {
    return new Date(str).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return str;
  }
}

/* ── File-type label from filename ─────────────────────────── */
function getFileType(filename) {
  if (!filename) return 'FILE';
  const ext = filename.split('.').pop().toUpperCase();
  const map  = { PDF:'PDF', PPT:'PPT', PPTX:'PPTX', PNG:'IMAGE', JPG:'IMAGE', JPEG:'IMAGE', GIF:'IMAGE' };
  return map[ext] || ext;
}

/* ── Toast notifications ────────────────────────────────────── */
function toast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const el    = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

/* ── Loading placeholder ────────────────────────────────────── */
function loadingHTML(label = 'Loading…') {
  return `<div class="loading"><div class="spinner"></div> ${label}</div>`;
}

/* ── Empty-state block ──────────────────────────────────────── */
function emptyState(icon, title, desc = '') {
  return `<div class="empty-state">
    <div class="es-icon">${icon}</div>
    <h3>${esc(title)}</h3>
    ${desc ? `<p>${esc(desc)}</p>` : ''}
  </div>`;
}
