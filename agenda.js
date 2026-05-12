/**
 * agenda.js — Tab 2: Agenda
 *
 * View mode : read-only table  +  "Edit Agenda" button (TC only)
 * Edit mode : inline inputs    +  "Add Row" / "Publish" / "Cancel"
 *             + Import panel   →  Upload CSV  OR  Paste table
 */

'use strict';

let agHeaders   = [];
let agRows      = [];
let agPublished = false;
let agEditing   = false;
let agSnapshot  = { headers: [], rows: [] };

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

/* ── Main render ────────────────────────────────────────────── */
function _renderAgenda() {
  const con      = document.getElementById('agenda-container');
  const viewBtns = document.getElementById('agenda-view-actions');
  const editBtns = document.getElementById('agenda-edit-actions');
  const hasData  = agHeaders.length > 0 && agRows.length > 0;

  // Toolbar visibility
  if (viewBtns) viewBtns.style.display = (!agEditing && App.isTC()) ? 'flex' : 'none';
  if (editBtns) editBtns.style.display = ( agEditing && App.isTC()) ? 'flex' : 'none';

  // Nothing to show yet
  if (!hasData || (!agPublished && !App.isTC())) {
    con.innerHTML = '';
    con.appendChild(_emptyEl());
    if (agEditing && App.isTC()) con.prepend(_importPanel('agenda'));
    return;
  }

  con.innerHTML = '';

  // Import panel shown above the table in edit mode
  if (agEditing && App.isTC()) {
    con.appendChild(_importPanel('agenda'));
  }

  // Table
  const tbl = DynamicTable.build({
    headers:     agHeaders,
    rows:        agRows,
    editable:    agEditing && App.isTC(),
    onAddRow:    agendaAddRow,
    onAddCol:    agendaAddCol,
    onDeleteRow: (ri) => { agRows.splice(ri, 1);       _renderAgenda(); },
    onDeleteCol: (ci) => {
      agHeaders.splice(ci, 1);
      agRows.forEach(r => r.splice(ci, 1));
      _renderAgenda();
    },
  });
  con.appendChild(tbl);

  // Draft notice (TC view mode only)
  if (App.isTC() && !agPublished && !agEditing) {
    const strip = document.createElement('div');
    strip.className = 'status-strip';
    strip.innerHTML = '<span class="badge badge-pending">DRAFT — not published yet</span>';
    con.appendChild(strip);
  }
}

/* ── Empty state ────────────────────────────────────────────── */
function _emptyEl() {
  const div = document.createElement('div');
  div.innerHTML = App.isTC()
    ? emptyState('📅', 'No agenda yet', 'Upload a CSV, paste a table, or add rows manually.')
    : emptyState('⏳', 'Agenda will be out soon', 'Check back later for the full event schedule.');
  return div;
}

/* ══════════════════════════════════════════════════════════════
   IMPORT PANEL
   Shared UI rendered above the table in edit mode.
   Accepts a `scope` string ('agenda' | 'results') so the
   callback buttons can call the right apply function.
══════════════════════════════════════════════════════════════ */
function _importPanel(scope) {
  const panel = document.createElement('div');
  panel.className = 'import-panel';
  panel.id = `${scope}-import-panel`;
  panel.innerHTML = `
    <div class="import-panel-inner">

      <!-- ── Option 1: Upload CSV ── -->
      <div class="import-option">
        <div class="import-option-label">📂 Upload CSV</div>
        <div class="import-option-desc">Select a <code>.csv</code> file — first row becomes the column headers.</div>
        <label class="csv-upload-btn">
          Choose CSV file
          <input type="file" accept=".csv" onchange="_handleCSVUpload(event, '${scope}')">
        </label>
        <span class="csv-filename" id="${scope}-csv-filename"></span>
      </div>

      <div class="import-divider">or</div>

      <!-- ── Option 2: Paste table ── -->
      <div class="import-option">
        <div class="import-option-label">📋 Paste Table</div>
        <div class="import-option-desc">
          Copy from <strong>Excel</strong> or <strong>Google Sheets</strong> and paste below.
          First row becomes column headers.
        </div>
        <textarea
          id="${scope}-paste-area"
          class="paste-area"
          placeholder="Paste your table here (Ctrl+V / Cmd+V)…"
          rows="5"
        ></textarea>
        <button class="btn btn-primary btn-sm" onclick="_handlePaste('${scope}')">
          Load Pasted Table
        </button>
      </div>

    </div>`;
  return panel;
}

/* ── CSV file upload handler ────────────────────────────────── */
function _handleCSVUpload(event, scope) {
  const file = event.target.files[0];
  if (!file) return;

  document.getElementById(`${scope}-csv-filename`).textContent = '📎 ' + file.name;

  const reader = new FileReader();
  reader.onload = (e) => {
    const result = parseCSVText(e.target.result);
    if (!result || !result.headers.length) {
      toast('Could not parse CSV — check the file format.', 'error');
      return;
    }
    _applyImport(scope, result.headers, result.rows);
    toast(`✅ CSV loaded — ${result.rows.length} rows, ${result.headers.length} columns.`, 'success');
  };
  reader.readAsText(file);
}

/* ── Paste handler ──────────────────────────────────────────── */
function _handlePaste(scope) {
  const text = document.getElementById(`${scope}-paste-area`).value;
  if (!text.trim()) {
    toast('Paste area is empty.', 'warning');
    return;
  }
  const result = parsePastedTable(text);
  if (!result || !result.headers.length) {
    toast('Could not parse pasted content — copy directly from Excel or Sheets.', 'error');
    return;
  }
  _applyImport(scope, result.headers, result.rows);
  toast(`✅ Table loaded — ${result.rows.length} rows, ${result.headers.length} columns.`, 'success');
}

/* ── Apply parsed data to the right module ──────────────────── */
function _applyImport(scope, headers, rows) {
  if (scope === 'agenda') {
    agHeaders = headers;
    agRows    = rows;
    _renderAgenda();
  } else if (scope === 'results') {
    resHeaders = headers;
    resRows    = rows;
    _renderResults();
  }
}

/* ── Edit / Cancel ──────────────────────────────────────────── */
function agendaStartEdit() {
  agSnapshot = {
    headers: JSON.parse(JSON.stringify(agHeaders)),
    rows:    JSON.parse(JSON.stringify(agRows)),
  };
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

/* ── Save / Publish ─────────────────────────────────────────── */
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
