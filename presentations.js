/**
 * presentations.js — Tab 3: Presentations & Posters
 *
 * Phase 1 → Everyone submits an abstract (PDF or PPT/PPTX only)
 * Phase 2 → Tech Council accepts or rejects the abstract
 * Phase 3 → Accepted submitters upload their full file (PDF/PPT/PPTX)
 *
 * Each section loads independently — one failure never blocks another.
 */

'use strict';

const ALLOWED_LABEL = 'PDF, PPT, PPTX';
const ALLOWED_ACCEPT = '.pdf,.ppt,.pptx';

/* ── Entry point ────────────────────────────────────────────── */
function loadPresentations() {
  // TC panel visibility set immediately — no waiting on API
  document.getElementById('pres-tc-panel').style.display =
    App.isTC() ? 'block' : 'none';

  // Each section loads on its own — failures are isolated
  _loadMySubmission();
  _loadAccepted();
  if (App.isTC()) _loadTCPanel();
}

/* ══════════════════════════════════════════════════════════════
   SECTION A — My Submission
══════════════════════════════════════════════════════════════ */
async function _loadMySubmission() {
  const wrap = document.getElementById('pres-my-wrap');

  // Show abstract form immediately as default — no spinner needed here
  // We'll replace it only if the user already has a submission
  wrap.innerHTML = _abstractFormHTML();

  try {
    const sub = await Api.getMyPresentation();
    if (sub && sub.id) {
      wrap.innerHTML = _myStatusCardHTML(sub);
      if (sub.abstract_status === 'accepted' && !sub.file_path) {
        _wireFileDrop('pres-file-drop');
      }
    }
    // If null → abstract form already shown, nothing more to do
  } catch {
    // Backend error — abstract form already showing, that's fine
  }
}

/* ── Abstract submission form ───────────────────────────────── */
function _abstractFormHTML() {
  return `
    <div class="card">
      <div class="section-label">📝 Submit Your Abstract</div>
      <p style="font-size:13.5px;color:var(--text-3);margin-bottom:18px">
        Start by submitting your abstract as a <strong>PDF or PPT/PPTX</strong> file.
        The Tech Council will review it — if accepted, you can then upload your
        full presentation or poster.
      </p>
      <form id="abstract-form" onsubmit="submitAbstract(event)">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Title *</label>
            <input type="text" id="abs-title" class="form-input"
                   placeholder="e.g. ML at Scale: Our Journey" required>
          </div>
          <div class="form-group">
            <label class="form-label">Presenter Name *</label>
            <input type="text" id="abs-presenter" class="form-input"
                   placeholder="Your full name" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Abstract File (${ALLOWED_LABEL}) *</label>
          <div class="file-drop" id="abs-file-drop">
            <input type="file" id="abs-file" accept="${ALLOWED_ACCEPT}" required
                   onchange="_onFileChange('abs-file','abs-fd-name')">
            <div class="fd-icon">📄</div>
            <div class="fd-text">Drop your abstract here or <strong>click to browse</strong></div>
            <div class="fd-name" id="abs-fd-name"></div>
          </div>
        </div>
        <button type="submit" class="btn btn-primary" id="abs-submit-btn">
          Submit Abstract
        </button>
      </form>
    </div>`;
}

/* ── My status card ─────────────────────────────────────────── */
function _myStatusCardHTML(sub) {
  const badge = {
    pending:  '<span class="badge badge-pending">⏳ Pending Review</span>',
    accepted: '<span class="badge badge-accepted">✅ Abstract Accepted</span>',
    rejected: '<span class="badge badge-rejected">✗ Abstract Rejected</span>',
  }[sub.abstract_status] || '';

  const msg = {
    pending:  'Your abstract is under review by the Tech Council.',
    accepted: sub.file_path
      ? 'Your file has been uploaded. Your submission is complete!'
      : 'Your abstract was accepted! Upload your full presentation or poster below.',
    rejected: 'Your abstract was not selected for this event. Thank you for participating!',
  }[sub.abstract_status] || '';

  // Abstract file link
  const absFile = sub.file_path && sub.abstract_status === 'pending'
    ? '' // file_path is only for the final upload; abstract file stored separately
    : '';

  // File upload section — only for accepted + no file yet
  let uploadSection = '';
  if (sub.abstract_status === 'accepted' && !sub.file_path) {
    uploadSection = `
      <div style="margin-top:16px">
        <div class="section-label" style="color:var(--green)">📤 Upload Your Presentation / Poster</div>
        <p style="font-size:13px;color:var(--text-3);margin-bottom:12px">
          Accepted formats: <strong>${ALLOWED_LABEL}</strong>
        </p>
        <div class="file-drop" id="pres-file-drop">
          <input type="file" id="pres-file" accept="${ALLOWED_ACCEPT}"
                 onchange="_onFileChange('pres-file','pres-fd-name')">
          <div class="fd-icon">📁</div>
          <div class="fd-text">Drop your file here or <strong>click to browse</strong></div>
          <div class="fd-name" id="pres-fd-name"></div>
        </div>
        <button class="btn btn-success" style="margin-top:12px"
                id="pres-upload-btn" onclick="uploadPresentationFile(${sub.id})">
          Upload File
        </button>
      </div>`;
  }

  // Uploaded file row
  let fileRow = '';
  if (sub.file_path) {
    fileRow = `
      <div class="pres-file-uploaded">
        <span class="badge badge-accepted">📂 File Uploaded</span>
        <span style="font-size:13px;color:var(--text-2);margin-left:8px">${esc(sub.file_name)}</span>
        <a href="${Api.fileUrl(sub.file_path)}" target="_blank" rel="noopener"
           class="btn btn-secondary btn-sm" style="margin-left:12px">View File ↗</a>
      </div>`;
  }

  // Abstract file view (stored as abstract_file_path)
  let absRow = '';
  if (sub.abstract_file_path) {
    absRow = `
      <div style="margin-top:8px">
        <a href="${Api.fileUrl(sub.abstract_file_path)}" target="_blank" rel="noopener"
           class="btn btn-secondary btn-sm">📄 View Abstract File ↗</a>
      </div>`;
  }

  return `
    <div class="card">
      <div class="section-label">📋 My Submission</div>
      <div class="my-submission-card">
        <div class="my-sub-header">
          <div>
            <div class="my-sub-title">${esc(sub.title)}</div>
            <div class="my-sub-presenter">👤 ${esc(sub.presenter)}</div>
          </div>
          <div>${badge}</div>
        </div>
        <p class="my-sub-msg">${msg}</p>
        ${absRow}
        ${fileRow}
        ${uploadSection}
      </div>
    </div>`;
}

/* ── Drag-and-drop wiring ────────────────────────────────────── */
function _wireFileDrop(dropId) {
  setTimeout(() => {
    const drop = document.getElementById(dropId);
    if (!drop) return;
    drop.addEventListener('dragover',  e => { e.preventDefault(); drop.classList.add('dragover'); });
    drop.addEventListener('dragleave', ()  => drop.classList.remove('dragover'));
    drop.addEventListener('drop', e => {
      e.preventDefault(); drop.classList.remove('dragover');
      const inputId = drop.querySelector('input[type=file]').id;
      const nameId  = drop.querySelector('.fd-name').id;
      const fi = document.getElementById(inputId);
      if (e.dataTransfer.files.length) {
        const dt = new DataTransfer();
        dt.items.add(e.dataTransfer.files[0]);
        fi.files = dt.files;
        _onFileChange(inputId, nameId);
      }
    });
  }, 80);
}

/* ── File input change helper ───────────────────────────────── */
function _onFileChange(inputId, nameId) {
  const fi = document.getElementById(inputId);
  const nm = document.getElementById(nameId);
  if (nm) nm.textContent = fi && fi.files[0] ? '📎 ' + fi.files[0].name : '';
}

// Legacy alias used by old onerror handlers
function onFileChange(input) {
  const nm = document.getElementById('fd-name') || document.getElementById('pres-fd-name');
  if (nm) nm.textContent = input.files[0] ? '📎 ' + input.files[0].name : '';
}

/* ══════════════════════════════════════════════════════════════
   FORM HANDLERS
══════════════════════════════════════════════════════════════ */

/* Phase 1 — submit abstract ────────────────────────────────── */
async function submitAbstract(e) {
  e.preventDefault();
  const btn  = document.getElementById('abs-submit-btn');
  const file = document.getElementById('abs-file')?.files[0];

  if (!file) { toast('Please attach your abstract file.', 'warning'); return; }

  btn.disabled = true; btn.textContent = 'Submitting…';

  const fd = new FormData();
  fd.append('title',     document.getElementById('abs-title').value.trim());
  fd.append('presenter', document.getElementById('abs-presenter').value.trim());
  fd.append('file',      file);

  try {
    await Api.submitAbstract(fd);
    toast('✅ Abstract submitted! The Tech Council will review it shortly.', 'success');
    _loadMySubmission();
    if (App.isTC()) _loadTCPanel();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
    btn.disabled = false; btn.textContent = 'Submit Abstract';
  }
}

/* Phase 3 — upload full file ───────────────────────────────── */
async function uploadPresentationFile(pid) {
  const file = document.getElementById('pres-file')?.files[0];
  if (!file) { toast('Please select a file first.', 'warning'); return; }

  const btn = document.getElementById('pres-upload-btn');
  btn.disabled = true; btn.textContent = 'Uploading…';

  const fd = new FormData();
  fd.append('file', file);

  try {
    await Api.uploadPresentationFile(pid, fd);
    toast('🎉 File uploaded successfully!', 'success');
    _loadMySubmission();
    _loadAccepted();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
    btn.disabled = false; btn.textContent = 'Upload File';
  }
}

/* ══════════════════════════════════════════════════════════════
   SECTION B — Accepted presentations (everyone)
══════════════════════════════════════════════════════════════ */
async function _loadAccepted() {
  const con = document.getElementById('pres-accepted-container');
  con.innerHTML = loadingHTML();

  try {
    const items = await Api.getAcceptedPresentations();

    if (!items.length) {
      con.innerHTML = emptyState('📭', 'No presentations yet',
        'Accepted submissions will appear here once files are uploaded.');
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'pres-grid';
    items.forEach(p => {
      const card = document.createElement('div');
      card.className = 'pres-card';
      card.innerHTML = `
        <span class="pres-type-badge">${getFileType(p.file_name)}</span>
        <div class="pres-title">${esc(p.title)}</div>
        <div class="pres-presenter">👤 ${esc(p.presenter)}</div>
        <div class="pres-actions">
          <a href="${Api.fileUrl(p.file_path)}" target="_blank" rel="noopener"
             class="btn btn-secondary btn-sm">📂 View File</a>
        </div>`;
      grid.appendChild(card);
    });

    con.innerHTML = '';
    con.appendChild(grid);
  } catch {
    con.innerHTML = emptyState('😕', 'Could not load presentations');
  }
}

/* ══════════════════════════════════════════════════════════════
   SECTION C — TC review panel (all abstracts)
══════════════════════════════════════════════════════════════ */
async function _loadTCPanel() {
  const con = document.getElementById('pres-tc-container');
  con.innerHTML = loadingHTML();

  try {
    const all = await Api.getAllPresentations();

    if (!all.length) {
      con.innerHTML = emptyState('📭', 'No abstracts submitted yet');
      return;
    }

    const pending  = all.filter(p => p.abstract_status === 'pending');
    const accepted = all.filter(p => p.abstract_status === 'accepted');
    const rejected = all.filter(p => p.abstract_status === 'rejected');

    con.innerHTML = '';
    if (pending.length)  con.appendChild(_tcGroup('⏳ Pending Review', pending,  true));
    if (accepted.length) con.appendChild(_tcGroup('✅ Accepted',       accepted, false));
    if (rejected.length) con.appendChild(_tcGroup('✗ Rejected',        rejected, false));

  } catch {
    con.innerHTML = emptyState('😕', 'Could not load submissions');
  }
}

function _tcGroup(heading, items, showActions) {
  const wrap = document.createElement('div');
  wrap.style.marginBottom = '24px';

  let html = `
    <div class="tc-group-heading">
      ${heading}
      <span class="tc-group-count">${items.length}</span>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>Title</th>
          <th>Presenter</th>
          <th>Email</th>
          <th>Submitted</th>
          <th>Abstract</th>
          <th>Final File</th>
          ${showActions ? '<th>Actions</th>' : ''}
        </tr></thead>
        <tbody>`;

  items.forEach(p => {
    const absFile = p.abstract_file_path
      ? `<a href="${Api.fileUrl(p.abstract_file_path)}" target="_blank"
            class="btn btn-secondary btn-sm">📄 View</a>`
      : '—';

    const finalFile = p.file_path
      ? `<a href="${Api.fileUrl(p.file_path)}" target="_blank"
            class="btn btn-secondary btn-sm">📂 View</a>`
      : `<span style="color:var(--text-4);font-size:12px">Not uploaded</span>`;

    const actions = showActions ? `
      <td>
        <div class="status-actions">
          <button class="btn btn-success btn-sm"
            onclick="reviewAbstract(${p.id},'accepted')">✅ Accept</button>
          <button class="btn btn-danger  btn-sm"
            onclick="reviewAbstract(${p.id},'rejected')">✗ Reject</button>
        </div>
      </td>` : '';

    html += `
      <tr>
        <td><strong>${esc(p.title)}</strong></td>
        <td>${esc(p.presenter)}</td>
        <td style="font-size:12.5px;color:var(--text-3)">${esc(p.user_email)}</td>
        <td style="font-size:12.5px;color:var(--text-3)">${fmtDate(p.submitted_at)}</td>
        <td>${absFile}</td>
        <td>${finalFile}</td>
        ${actions}
      </tr>`;
  });

  html += '</tbody></table></div>';
  wrap.innerHTML = html;
  return wrap;
}

async function reviewAbstract(id, status) {
  try {
    await Api.updateAbstractStatus(id, status);
    toast(
      status === 'accepted' ? '✅ Abstract accepted!' : 'Abstract rejected.',
      status === 'accepted' ? 'success' : 'info'
    );
    _loadTCPanel();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  }
}
