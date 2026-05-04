/**
 * results.js — Tab 5: Results
 *
 * Same UX pattern as agenda.js:
 *  - View mode : read-only table + "Edit Results" button (TC only)
 *  - Edit mode : inline inputs + "Add Row" / "Publish" / "Cancel"
 */

'use strict';

let resHeaders   = [];
let resRows      = [];
let resPublished = false;
let resEditing   = false;
let resSnapshot  = { headers: [], rows: [] };

/* ── Entry point ────────────────────────────────────────────── */
async function loadResults() {
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

  resEditing = false;
  _renderResults();
}

/* ── Render ─────────────────────────────────────────────────── */
function _renderResults() {
  const con      = document.getElementById('results-container');
  const viewBtns = document.getElementById('results-view-actions');
  const editBtns = document.getElementById('results-edit-actions');
  const hasData  = resHeaders.length > 0 && resRows.length > 0;

  if (viewBtns) viewBtns.style.display = (!resEditing && App.isTC()) ? 'flex' : 'none';
  if (editBtns) editBtns.style.display = (resEditing  && App.isTC()) ? 'flex' : 'none';

  if (!hasData || (!resPublished && !App.isTC())) {
    con.innerHTML = '';
    const div = document.createElement('div');
    if (App.isTC()) {
      div.innerHTML = emptyState('🏆', 'No results yet',
        'Click "Edit Results" to enter the event results.');
    } else {
      div.innerHTML = emptyState('⏳', 'Results coming soon',
        'Event results will be posted here after the event.');
    }
    con.appendChild(div);
    return;
  }

  con.innerHTML = '';
  const tbl = DynamicTable.build({
    headers:     resHeaders,
    rows:        resRows,
    editable:    resEditing && App.isTC(),
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

  if (App.isTC() && !resPublished && !resEditing) {
    const strip = document.createElement('div');
    strip.className = 'status-strip';
    strip.innerHTML = '<span class="badge badge-pending">DRAFT — not published yet</span>';
    con.appendChild(strip);
  }
}

/* ── Edit / Cancel ──────────────────────────────────────────── */
function resultsStartEdit() {
  resSnapshot = {
    headers: JSON.parse(JSON.stringify(resHeaders)),
    rows:    JSON.parse(JSON.stringify(resRows)),
  };
  if (resHeaders.length === 0) {
    resHeaders = ['Category', 'Winner', 'Project', 'Score'];
    resRows    = [];
  }
  resEditing = true;
  _renderResults();
}

function resultsCancelEdit() {
  resHeaders = resSnapshot.headers;
  resRows    = resSnapshot.rows;
  resEditing = false;
  _renderResults();
}

/* ── Add row / column ───────────────────────────────────────── */
function resultsAddRow() {
  resRows.push(resHeaders.map(() => ''));
  _renderResults();
}
function resultsAddCol() {
  resHeaders.push('New Column');
  resRows.forEach(r => r.push(''));
  _renderResults();
}

/* ── Publish ────────────────────────────────────────────────── */
async function saveResults(publish) {
  try {
    await Api.saveResults(resHeaders, resRows, publish);
    resPublished = publish;
    resEditing   = false;
    _renderResults();
    toast(publish ? 'Results published! 🏆' : '💾 Draft saved.', publish ? 'success' : 'info');
  } catch (e) {
    toast('Error saving results: ' + e.message, 'error');
  }
}
