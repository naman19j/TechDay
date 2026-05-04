/**
 * agenda.js — Tab 2: Agenda
 *
 * Matches Figma UX exactly:
 *  - View mode : read-only table + "Edit Agenda" button (TC only)
 *  - Edit mode : inline input cells + "Add Row" / "Publish" / "Cancel" buttons
 */

'use strict';

let agHeaders    = [];
let agRows       = [];
let agPublished  = false;
let agEditing    = false;
// Deep-copy saved before editing (used for Cancel)
let agSnapshot   = { headers: [], rows: [] };

/* ── Entry point ────────────────────────────────────────────── */
async function loadAgenda() {
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

  agEditing = false;
  _renderAgenda();
}

/* ── Render ─────────────────────────────────────────────────── */
function _renderAgenda() {
  const con        = document.getElementById('agenda-container');
  const viewBtns   = document.getElementById('agenda-view-actions');
  const editBtns   = document.getElementById('agenda-edit-actions');
  const hasData    = agHeaders.length > 0 && agRows.length > 0;

  // Button bar visibility
  if (viewBtns) viewBtns.style.display = (!agEditing && App.isTC()) ? 'flex' : 'none';
  if (editBtns) editBtns.style.display = (agEditing  && App.isTC()) ? 'flex' : 'none';

  // ── Empty / not published ──────────────────────────────────
  if (!hasData || (!agPublished && !App.isTC())) {
    con.innerHTML = '';
    con.appendChild(_emptyAgendaEl());
    return;
  }

  // ── Build table ────────────────────────────────────────────
  con.innerHTML = '';
  const tbl = DynamicTable.build({
    headers:     agHeaders,
    rows:        agRows,
    editable:    agEditing && App.isTC(),
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

  // Draft notice for TC in view mode
  if (App.isTC() && !agPublished && !agEditing) {
    const strip = document.createElement('div');
    strip.className = 'status-strip';
    strip.innerHTML = '<span class="badge badge-pending">DRAFT — not published yet</span>';
    con.appendChild(strip);
  }
}

function _emptyAgendaEl() {
  const div = document.createElement('div');
  if (App.isTC()) {
    div.innerHTML = emptyState('📅', 'No agenda yet',
      'Click "Edit Agenda" to start building the schedule.');
  } else {
    div.innerHTML = emptyState('⏳', 'Agenda will be out soon',
      'Check back later for the full event schedule.');
  }
  return div;
}

/* ── Edit / Cancel ──────────────────────────────────────────── */
function agendaStartEdit() {
  // Save snapshot for cancel
  agSnapshot = {
    headers: JSON.parse(JSON.stringify(agHeaders)),
    rows:    JSON.parse(JSON.stringify(agRows)),
  };
  // If no columns yet, seed with Figma defaults
  if (agHeaders.length === 0) {
    agHeaders = ['Time', 'Activity', 'Speaker', 'Location'];
    agRows    = [];
  }
  agEditing = true;
  _renderAgenda();
}

function agendaCancelEdit() {
  agHeaders = agSnapshot.headers;
  agRows    = agSnapshot.rows;
  agEditing = false;
  _renderAgenda();
}

/* ── Add row / column ───────────────────────────────────────── */
function agendaAddRow() {
  agRows.push(agHeaders.map(() => ''));
  _renderAgenda();
}
function agendaAddCol() {
  agHeaders.push('New Column');
  agRows.forEach(r => r.push(''));
  _renderAgenda();
}

/* ── Publish ────────────────────────────────────────────────── */
async function saveAgenda(publish) {
  try {
    await Api.saveAgenda(agHeaders, agRows, publish);
    agPublished = publish;
    agEditing   = false;
    _renderAgenda();
    toast(publish ? 'Agenda published! ✅' : '💾 Draft saved.', publish ? 'success' : 'info');
  } catch (e) {
    toast('Error saving agenda: ' + e.message, 'error');
  }
}
