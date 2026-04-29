/**
 * agenda.js
 * Handles all logic for Tab 2 — Agenda.
 *
 * TC users  : can build a dynamic table, save drafts, and publish.
 * All users : see the published agenda, or "Agenda will be out soon".
 */

'use strict';

/* ── Module state ───────────────────────────────────────────── */
let agHeaders   = [];
let agRows      = [];
let agPublished = false;

/* ── Entry point called by app.js when tab is activated ─────── */
async function loadAgenda() {
  // Show / hide TC toolbar
  document.getElementById('agenda-tc-toolbar').style.display =
    App.isTC() ? 'flex' : 'none';

  const con = document.getElementById('agenda-container');
  con.innerHTML = loadingHTML('Loading agenda…');

  try {
    const data  = await Api.getAgenda();
    agHeaders   = data.headers  || [];
    agRows      = data.rows     || [];
    agPublished = data.published || false;
  } catch {
    agHeaders = []; agRows = []; agPublished = false;
  }

  _renderAgenda();
}

/* ── Render the agenda container ────────────────────────────── */
function _renderAgenda() {
  const con     = document.getElementById('agenda-container');
  const hasData = agHeaders.length > 0 && agRows.length > 0;

  // Nothing in DB yet
  if (!hasData) {
    if (App.isTC()) {
      con.innerHTML = emptyState('📅', 'No agenda yet',
        'Use the toolbar above to add columns and rows, then publish.');
    } else {
      con.innerHTML = emptyState('⏳', 'Agenda will be out soon',
        'Check back later for the full event schedule.');
    }
    return;
  }

  // Data exists but not published → users see placeholder
  if (!agPublished && !App.isTC()) {
    con.innerHTML = emptyState('⏳', 'Agenda will be out soon',
      'Check back later for the full event schedule.');
    return;
  }

  // Build table
  con.innerHTML = '';
  const tbl = DynamicTable.build({
    headers:     agHeaders,
    rows:        agRows,
    editable:    App.isTC(),
    onAddRow:    agendaAddRow,
    onAddCol:    agendaAddCol,
    onDeleteRow: (ri) => { agRows.splice(ri, 1);        _renderAgenda(); },
    onDeleteCol: (ci) => {
      agHeaders.splice(ci, 1);
      agRows.forEach(r => r.splice(ci, 1));
      _renderAgenda();
    },
  });
  con.appendChild(tbl);

  // Status strip (TC only)
  if (App.isTC()) {
    const strip = document.createElement('div');
    strip.className = 'status-strip';
    strip.innerHTML = agPublished
      ? '<span class="badge badge-accepted">✅ Published — visible to all users</span>'
      : '<span class="badge badge-pending">DRAFT — not visible to users yet</span>';
    con.appendChild(strip);
  }
}

/* ── Toolbar: add row / column ──────────────────────────────── */
function agendaAddRow() {
  agRows.push(agHeaders.map(() => ''));
  _renderAgenda();
}

function agendaAddCol() {
  agHeaders.push('New Column');
  agRows.forEach(r => r.push(''));
  _renderAgenda();
}

/* ── Save draft or publish ──────────────────────────────────── */
async function saveAgenda(publish) {
  try {
    await Api.saveAgenda(agHeaders, agRows, publish);
    agPublished = publish;
    _renderAgenda();
    toast(
      publish ? '🚀 Agenda published! Visible to all users.' : '💾 Draft saved.',
      publish ? 'success' : 'info'
    );
  } catch (e) {
    toast('Error saving agenda: ' + e.message, 'error');
  }
}
