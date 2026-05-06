/**
 * archive.js — Tab: Tech Day 2025
 *
 * Reads from:
 *   data/2025/presentations/  → filenames are "Title_Presenter.ext"
 *   data/2025/results.csv     → headers + rows
 *
 * Renders:
 *   - Presentation cards (title + presenter only)
 *   - Results table
 */

'use strict';

/* ── Entry point ────────────────────────────────────────────── */
async function loadArchive2025() {
  _loadArchivePresentations();
  _loadArchiveResults();
}

/* ── Presentations grid ─────────────────────────────────────── */
async function _loadArchivePresentations() {
  const con = document.getElementById('archive-pres-container');
  con.innerHTML = loadingHTML();

  try {
    const items = await Api.getArchivePresentations();

    if (!items.length) {
      con.innerHTML = emptyState('📭', 'No presentations found');
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'pres-grid';

    items.forEach(p => {
      const card = document.createElement('div');
      card.className = 'pres-card';
      card.innerHTML = `
        <span class="pres-type-badge">${esc(_fileExt(p.filename))}</span>
        <div class="pres-title">${esc(p.title)}</div>
        <div class="pres-presenter">👤 ${esc(p.presenter)}</div>`;
      grid.appendChild(card);
    });

    con.innerHTML = '';
    con.appendChild(grid);

  } catch {
    con.innerHTML = emptyState('😕', 'Could not load presentations');
  }
}

/* ── Results table ──────────────────────────────────────────── */
async function _loadArchiveResults() {
  const con = document.getElementById('archive-results-container');
  con.innerHTML = loadingHTML();

  try {
    const data = await Api.getArchiveResults();

    if (!data.headers.length) {
      con.innerHTML = emptyState('⏳', 'Results not available');
      return;
    }

    let html = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            ${data.headers.map(h => `<th>${esc(h)}</th>`).join('')}
          </tr></thead>
          <tbody>
            ${data.rows.map(row =>
              `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`
            ).join('')}
          </tbody>
        </table>
      </div>`;

    con.innerHTML = html;

  } catch {
    con.innerHTML = emptyState('😕', 'Could not load results');
  }
}

/* ── Helpers ────────────────────────────────────────────────── */
function _fileExt(filename) {
  if (!filename) return 'FILE';
  return filename.split('.').pop().toUpperCase();
}
