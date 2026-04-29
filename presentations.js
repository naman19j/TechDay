/**
 * presentations.js
 * Handles all logic for Tab 3 — Presentations & Posters.
 *
 * Everyone  : submit a file for review; view accepted entries.
 * TC users  : also see a pending-approval panel with Accept / Reject actions.
 */

'use strict';

/* ── Entry point ────────────────────────────────────────────── */
async function loadPresentations() {
  // Show TC approval section only for Tech Council
  document.getElementById('pres-approval-section').style.display =
    App.isTC() ? 'block' : 'none';

  // Fetch & render accepted entries (visible to all)
  const accCon = document.getElementById('pres-accepted-container');
  accCon.innerHTML = loadingHTML();
  try {
    const accepted = await Api.getPresentations('user');
    _renderAccepted(accepted);
  } catch {
    accCon.innerHTML = emptyState('😕', 'Could not load presentations');
  }

  // Fetch & render pending submissions (TC only)
  if (App.isTC()) {
    const penCon = document.getElementById('pres-pending-container');
    penCon.innerHTML = loadingHTML();
    try {
      const all     = await Api.getPresentations('tech_council');
      const pending = all.filter(p => p.status === 'pending');
      _renderPending(pending);
    } catch {
      document.getElementById('pres-pending-container').innerHTML =
        '<p style="color:var(--text2);padding:16px">Could not load submissions.</p>';
    }
  }
}

/* ── Render accepted entries grid ───────────────────────────── */
function _renderAccepted(items) {
  const con = document.getElementById('pres-accepted-container');

  if (!items.length) {
    con.innerHTML = emptyState('📭', 'No accepted entries yet',
      'Submissions are under review. Check back soon.');
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
}

/* ── Render TC pending-approval table ───────────────────────── */
function _renderPending(items) {
  const con = document.getElementById('pres-pending-container');

  if (!items.length) {
    con.innerHTML = emptyState('🎉', 'No pending submissions', 'All caught up!');
    return;
  }

  let html = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Presenter</th>
            <th>File</th>
            <th>Submitted</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>`;

  items.forEach(p => {
    html += `
      <tr>
        <td>${esc(p.title)}</td>
        <td>${esc(p.presenter)}</td>
        <td>
          <a href="${Api.fileUrl(p.file_path)}" target="_blank" rel="noopener"
             class="btn btn-secondary btn-sm">📂 View</a>
        </td>
        <td style="color:var(--text2);font-size:12.5px">${fmtDate(p.submitted_at)}</td>
        <td>
          <div class="status-actions">
            <button class="btn btn-success btn-sm"
              onclick="reviewPresentation(${p.id}, 'accepted')">✅ Accept</button>
            <button class="btn btn-danger btn-sm"
              onclick="reviewPresentation(${p.id}, 'rejected')">✗ Reject</button>
          </div>
        </td>
      </tr>`;
  });

  html += '</tbody></table></div>';
  con.innerHTML = html;
}

/* ── TC: accept or reject a submission ──────────────────────── */
async function reviewPresentation(id, status) {
  try {
    await Api.updatePresentationStatus(id, status);
    toast(
      status === 'accepted' ? '✅ Submission accepted!' : 'Submission rejected.',
      status === 'accepted' ? 'success' : 'info'
    );
    await loadPresentations();
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

/* ── File input: show selected filename ─────────────────────── */
function onFileChange(input) {
  document.getElementById('fd-name').textContent =
    input.files[0] ? '📎 ' + input.files[0].name : '';
}

/* ── Drag-and-drop support for file drop zone ───────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const drop = document.getElementById('file-drop');
  if (!drop) return;

  drop.addEventListener('dragover', e => {
    e.preventDefault();
    drop.classList.add('dragover');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
  drop.addEventListener('drop', e => {
    e.preventDefault();
    drop.classList.remove('dragover');
    const fi = document.getElementById('pres-file');
    if (e.dataTransfer.files.length) {
      // Transfer files to the hidden input via DataTransfer
      const dt = new DataTransfer();
      dt.items.add(e.dataTransfer.files[0]);
      fi.files = dt.files;
      onFileChange(fi);
    }
  });
});

/* ── Submit form handler ────────────────────────────────────── */
async function submitPresentation(e) {
  e.preventDefault();

  const btn  = document.getElementById('pres-submit-btn');
  const file = document.getElementById('pres-file').files[0];

  if (!file) {
    toast('Please select a file.', 'warning');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Submitting…';

  const fd = new FormData();
  fd.append('title',     document.getElementById('pres-title').value.trim());
  fd.append('presenter', document.getElementById('pres-presenter').value.trim());
  fd.append('file',      file);

  try {
    await Api.submitPresentation(fd);
    toast('✅ Submission received! Under review by Tech Council.', 'success');
    document.getElementById('pres-form').reset();
    document.getElementById('fd-name').textContent = '';
    await loadPresentations();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  }

  btn.disabled    = false;
  btn.textContent = 'Submit for Review';
}
