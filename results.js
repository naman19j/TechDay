/**
 * results.js
 * Handles all logic for Tab 5 — Results.
 *
 * TC users  : build a dynamic table, save drafts, and publish.
 * All users : see published results, or "Results coming soon".
 */

'use strict';

/* ── Module state ───────────────────────────────────────────── */
let resHeaders   = [];
let resRows      = [];
let resPublished = false;

/* ── Entry point ────────────────────────────────────────────── */
async function loadResults() {
  document.getElementById('results-tc-toolbar').style.display =
    App.isTC() ? 'flex' : 'none';

  const con = document.getElementById('results-container');
  con.innerHTML = loadingHTML('Loading results…');

  try {
    const data   = await Api.getResults();
    resHeaders   = data.headers  || [];
    resRows      = data.rows     || [];
    resPublished = data.published || false;
  } catch {
    resHeaders = []; resRows = []; resPublished = false;
  }

  _renderResults();
}

/* ── Render the results container ───────────────────────────── */
function _renderResults() {
  const con     = document.getElementById('results-container');
  const hasData = resHeaders.length > 0 && resRows.length > 0;

  if (!hasData) {
    if (App.isTC()) {
      con.innerHTML = emptyState('🏆', 'No results yet',
        'Add columns and rows above, then publish when ready.');
    } else {
      con.innerHTML = emptyState('⏳', 'Results coming soon',
        'Event results will be posted here after the event.');
    }
    return;
  }

  if (!resPublished && !App.isTC()) {
    con.innerHTML = emptyState('⏳', 'Results coming soon',
      'Event results will be posted here after the event.');
    return;
  }

  con.innerHTML = '';
  const tbl = DynamicTable.build({
    headers:     resHeaders,
    rows:        resRows,
    editable:    App.isTC(),
    onAddRow:    resultsAddRow,
    onAddCol:    resultsAddCol,
    onDeleteRow: (ri) => { resRows.splice(ri, 1);        _renderResults(); },
    onDeleteCol: (ci) => {
      resHeaders.splice(ci, 1);
      resRows.forEach(r => r.splice(ci, 1));
      _renderResults();
    },
  });
  con.appendChild(tbl);

  // Status strip (TC only)
  if (App.isTC()) {
    const strip = document.createElement('div');
    strip.className = 'status-strip';
    strip.innerHTML = resPublished
      ? '<span class="badge badge-accepted">✅ Published — visible to all users</span>'
      : '<span class="badge badge-pending">DRAFT — not visible to users yet</span>';
    con.appendChild(strip);
  }
}

/* ── Toolbar: add row / column ──────────────────────────────── */
function resultsAddRow() {
  resRows.push(resHeaders.map(() => ''));
  _renderResults();
}

function resultsAddCol() {
  resHeaders.push('New Column');
  resRows.forEach(r => r.push(''));
  _renderResults();
}

/* ── Save draft or publish ──────────────────────────────────── */
async function saveResults(publish) {
  try {
    await Api.saveResults(resHeaders, resRows, publish);
    resPublished = publish;
    _renderResults();
    toast(
      publish ? '🏆 Results published!' : '💾 Draft saved.',
      publish ? 'success' : 'info'
    );
  } catch (e) {
    toast('Error saving results: ' + e.message, 'error');
  }
}
