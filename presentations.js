/**
 * presentations.js — Tab 3: Presentations & Posters
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  PHASE 1  Everyone submits an abstract (title + presenter   │
 * │           + abstract text). No file yet.                    │
 * ├─────────────────────────────────────────────────────────────┤
 * │  PHASE 2  Tech Council reviews abstracts → Accept / Reject  │
 * ├─────────────────────────────────────────────────────────────┤
 * │  PHASE 3  Accepted submitters upload their full file.       │
 * │           Rejected ones have no upload option.             │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Visibility:
 *  - Everyone sees accepted + file-uploaded entries.
 *  - Each user sees their own submission status.
 *  - TC sees ALL abstracts for review.
 */

'use strict';

/* ── Entry point ────────────────────────────────────────────── */
async function loadPresentations() {
  await Promise.all([
    _loadMySubmission(),
    _loadAccepted(),
    App.isTC() ? _loadTCPanel() : Promise.resolve(),
  ]);

  document.getElementById('pres-tc-panel').style.display =
    App.isTC() ? 'block' : 'none';
}

/* ══════════════════════════════════════════════════════════════
   SECTION A — My Submission (status + file upload if accepted)
══════════════════════════════════════════════════════════════ */
async function _loadMySubmission() {
  const wrap = document.getElementById('pres-my-wrap');
  try {
    const sub = await Api.getMyPresentation();

    if (!sub) {
      // No submission yet — show the abstract form
      wrap.innerHTML = _abstractFormHTML();
      return;
    }

    // Show status card + conditional upload section
    wrap.innerHTML = _myStatusCardHTML(sub);

    // Wire file upload form if abstract is accepted and no file yet
    if (sub.abstract_status === 'accepted' && !sub.file_path) {
      _wireFileUpload(sub.id);
    }
  } catch {
    wrap.innerHTML = _abstractFormHTML();
  }
}

/* ── Abstract submission form HTML ──────────────────────────── */
function _abstractFormHTML() {
  return `
    <div class="card">
      <div class="section-label">📝 Submit Your Abstract</div>
      <p style="font-size:13.5px;color:var(--text-3);margin-bottom:18px">
        Start by submitting your abstract. The Tech Council will review it —
        if accepted, you'll be able to upload your full presentation or poster.
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
          <label class="form-label">Abstract *</label>
          <textarea id="abs-abstract" class="form-input" rows="5"
                    placeholder="Briefly describe your presentation or poster (100–300 words)…"
                    required style="resize:vertical"></textarea>
        </div>
        <button type="submit" class="btn btn-primary" id="abs-submit-btn">
          Submit Abstract
        </button>
      </form>
    </div>`;
}

/* ── My status card HTML ────────────────────────────────────── */
function _myStatusCardHTML(sub) {
  const statusBadge = {
    pending:  '<span class="badge badge-pending">⏳ Pending Review</span>',
    accepted: '<span class="badge badge-accepted">✅ Abstract Accepted</span>',
    rejected: '<span class="badge badge-rejected">✗ Abstract Rejected</span>',
  }[sub.abstract_status] || '';

  // Message under the status
  const statusMsg = {
    pending:  'Your abstract is under review by the Tech Council. You\'ll be able to upload your file once accepted.',
    accepted: sub.file_path
      ? 'Your file has been uploaded and your submission is complete!'
      : 'Your abstract was accepted! You can now upload your full presentation or poster below.',
    rejected: 'Unfortunately your abstract was not selected for this event. Thank you for participating!',
  }[sub.abstract_status] || '';

  let fileSection = '';
  if (sub.abstract_status === 'accepted') {
    if (sub.file_path) {
      // File already uploaded
      fileSection = `
        <div class="pres-file-uploaded">
          <span class="badge badge-accepted">📂 File Uploaded</span>
          <span style="font-size:13px;color:var(--text-3);margin-left:8px">${esc(sub.file_name)}</span>
          <a href="${Api.fileUrl(sub.file_path)}" target="_blank" rel="noopener"
             class="btn btn-secondary btn-sm" style="margin-left:12px">View File ↗</a>
        </div>`;
    } else {
      // Accepted but no file yet — upload form injected here
      fileSection = `
        <div id="pres-file-upload-section">
          <div class="section-label" style="margin-top:20px;color:var(--green)">
            📤 Upload Your Presentation / Poster
          </div>
          <div class="file-drop" id="pres-file-drop">
            <input type="file" id="pres-file" accept=".pdf,.ppt,.pptx,.png,.jpg,.jpeg,.gif"
                   onchange="onFileChange(this)">
            <div class="fd-icon">📁</div>
            <div class="fd-text">Drop your file here or <strong>click to browse</strong></div>
            <div class="fd-name" id="fd-name"></div>
          </div>
          <button class="btn btn-success" style="margin-top:12px"
                  id="pres-upload-btn" onclick="uploadPresentationFile(${sub.id})">
            Upload File
          </button>
        </div>`;
    }
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
          <div>${statusBadge}</div>
        </div>
        <div class="my-sub-abstract">${esc(sub.abstract)}</div>
        <p class="my-sub-msg">${statusMsg}</p>
        ${fileSection}
      </div>
    </div>`;
}

/* ── Wire drag-and-drop for the file upload section ─────────── */
function _wireFileUpload(pid) {
  // Drag events wired after DOM renders
  setTimeout(() => {
    const drop = document.getElementById('pres-file-drop');
    if (!drop) return;
    drop.addEventListener('dragover',  e => { e.preventDefault(); drop.classList.add('dragover'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
    drop.addEventListener('drop', e => {
      e.preventDefault(); drop.classList.remove('dragover');
      const fi = document.getElementById('pres-file');
      if (e.dataTransfer.files.length) {
        const dt = new DataTransfer();
        dt.items.add(e.dataTransfer.files[0]);
        fi.files = dt.files;
        onFileChange(fi);
      }
    });
  }, 100);
}

/* ── File input helper ──────────────────────────────────────── */
function onFileChange(input) {
  const el = document.getElementById('fd-name');
  if (el) el.textContent = input.files[0] ? '📎 ' + input.files[0].name : '';
}

/* ══════════════════════════════════════════════════════════════
   FORM SUBMIT HANDLERS
══════════════════════════════════════════════════════════════ */

/* Phase 1 — submit abstract ────────────────────────────────── */
async function submitAbstract(e) {
  e.preventDefault();
  const btn = document.getElementById('abs-submit-btn');
  btn.disabled = true; btn.textContent = 'Submitting…';

  try {
    await Api.submitAbstract({
      title:     document.getElementById('abs-title').value.trim(),
      presenter: document.getElementById('abs-presenter').value.trim(),
      abstract:  document.getElementById('abs-abstract').value.trim(),
    });
    toast('✅ Abstract submitted! The Tech Council will review it shortly.', 'success');
    await _loadMySubmission();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
    btn.disabled = false; btn.textContent = 'Submit Abstract';
  }
}

/* Phase 3 — upload file ────────────────────────────────────── */
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
    await _loadMySubmission();
    await _loadAccepted();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
    btn.disabled = false; btn.textContent = 'Upload File';
  }
}

/* ══════════════════════════════════════════════════════════════
   SECTION B — Accepted presentations (visible to all)
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
   SECTION C — TC Review panel (all abstracts)
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

    // Group by status for clarity
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

/* ── Build a grouped table for TC ───────────────────────────── */
function _tcGroup(heading, items, showActions) {
  const wrap = document.createElement('div');
  wrap.style.marginBottom = '24px';

  let html = `
    <div class="tc-group-heading">${heading} <span class="tc-group-count">${items.length}</span></div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>Title</th>
          <th>Presenter</th>
          <th>Submitted</th>
          <th>Abstract</th>
          <th>File</th>
          ${showActions ? '<th>Actions</th>' : ''}
        </tr></thead>
        <tbody>`;

  items.forEach(p => {
    const fileCell = p.file_path
      ? `<a href="${Api.fileUrl(p.file_path)}" target="_blank" class="btn btn-secondary btn-sm">📂 View</a>`
      : `<span style="color:var(--text-4);font-size:12.5px">Not uploaded yet</span>`;

    const actions = showActions ? `
      <td>
        <div class="status-actions">
          <button class="btn btn-success btn-sm"
            onclick="reviewAbstract(${p.id}, 'accepted')">✅ Accept</button>
          <button class="btn btn-danger btn-sm"
            onclick="reviewAbstract(${p.id}, 'rejected')">✗ Reject</button>
        </div>
      </td>` : '';

    html += `
      <tr>
        <td><strong>${esc(p.title)}</strong></td>
        <td>${esc(p.presenter)}</td>
        <td style="color:var(--text-3);font-size:12.5px">${fmtDate(p.submitted_at)}</td>
        <td>
          <div class="abstract-preview">${esc(p.abstract)}</div>
        </td>
        <td>${fileCell}</td>
        ${actions}
      </tr>`;
  });

  html += '</tbody></table></div>';
  wrap.innerHTML = html;
  return wrap;
}

/* ── TC: accept or reject abstract ─────────────────────────── */
async function reviewAbstract(id, status) {
  try {
    await Api.updateAbstractStatus(id, status);
    toast(
      status === 'accepted' ? '✅ Abstract accepted!' : 'Abstract rejected.',
      status === 'accepted' ? 'success' : 'info'
    );
    await _loadTCPanel();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  }
}
