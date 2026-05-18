/**
 * logo.js — Logo Competition tab
 *
 * Rules enforced client-side (mirrored in backend):
 *  - Every user sees ONLY their own submission.
 *  - Re-submitting replaces the existing logo.
 *  - Tech Council sees ALL submissions in a grid below.
 */

'use strict';

/* ── Entry point ────────────────────────────────────────────── */
async function loadLogoTab() {
  _loadMySubmission();
  if (App.isTC()) _loadAllSubmissions();
  // TC all-submissions section visibility
  document.getElementById('logo-all-section').style.display =
    App.isTC() ? 'block' : 'none';
}

/* ── Load current user's own submission ─────────────────────── */
async function _loadMySubmission() {
  try {
    const sub = await Api.getMyLogo();
    if (sub) {
      _showMyPreview(sub);
      // Update form label to "Replace"
      document.getElementById('logo-form-label').textContent = '🔄 Replace Your Logo';
      document.getElementById('logo-submit-btn').textContent = 'Replace Logo';
    } else {
      document.getElementById('logo-my-submission').style.display = 'none';
    }
  } catch {
    // No submission yet — form already visible, nothing to show
  }
}

/* ── Render the user's own preview card ─────────────────────── */
function _showMyPreview(sub) {
  const wrap = document.getElementById('logo-my-submission');
  const card = document.getElementById('logo-preview-card');

  card.innerHTML = `
    <div class="logo-thumb-wrap">
      <img src="${Api.logoUrl(sub.file_path)}"
           alt="Your logo"
           class="logo-thumb"
           onerror="this.replaceWith(_logoFallback())">
    </div>
    <div class="logo-meta">
      <div class="logo-meta-name">📄 ${esc(sub.file_name)}</div>
      <div class="logo-meta-date">Submitted: ${fmtDate(sub.submitted_at)}
        ${sub.updated_at !== sub.submitted_at
          ? ` &nbsp;·&nbsp; Replaced: ${fmtDate(sub.updated_at)}`
          : ''}
      </div>
      <span class="badge badge-pending" style="margin-top:6px">Under Review</span>
    </div>`;

  wrap.style.display = 'block';
}

/* ── Fallback element when image fails to render ────────────── */
function _logoFallback() {
  const el = document.createElement('div');
  el.className = 'logo-thumb-fallback';
  el.textContent = '🖼️';
  return el;
}

/* ── TC: load all submissions grid ─────────────────────────── */
async function _loadAllSubmissions() {
  const con = document.getElementById('logo-all-container');
  con.innerHTML = loadingHTML();

  try {
    const all = await Api.getAllLogos();

    if (!all.length) {
      con.innerHTML = emptyState('🎨', 'No submissions yet',
        'Submissions will appear here once users start uploading.');
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'logo-tc-grid';

    all.forEach(sub => {
      const card = document.createElement('div');
      card.className = 'logo-tc-card';
      card.innerHTML = `
        <div class="logo-thumb-wrap">
          <img src="${Api.logoUrl(sub.file_path)}"
               alt="${esc(sub.file_name)}"
               class="logo-thumb"
               onerror="this.replaceWith(_logoFallback())">
        </div>
        <div class="logo-tc-meta">
          <div class="logo-tc-email">${esc(sub.user_email)}</div>
          <div class="logo-tc-file">📄 ${esc(sub.file_name)}</div>
          <div class="logo-tc-date">${fmtDate(sub.updated_at)}</div>
          <a href="${Api.logoUrl(sub.file_path)}"
             target="_blank" rel="noopener"
             class="btn btn-secondary btn-sm" style="margin-top:8px">
            View Full Size ↗
          </a>
        </div>`;
      grid.appendChild(card);
    });

    con.innerHTML = '';
    con.appendChild(grid);

  } catch {
    con.innerHTML = emptyState('😕', 'Could not load submissions');
  }
}

/* ── File input change — show filename ──────────────────────── */
function onLogoFileChange(input) {
  document.getElementById('logo-fd-name').textContent =
    input.files[0] ? '📎 ' + input.files[0].name : '';
}

/* ── Drag and drop ──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const drop = document.getElementById('logo-file-drop');
  if (!drop) return;
  drop.addEventListener('dragover',  e => { e.preventDefault(); drop.classList.add('dragover'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('dragover');
    const fi = document.getElementById('logo-file');
    if (e.dataTransfer.files.length) {
      const dt = new DataTransfer();
      dt.items.add(e.dataTransfer.files[0]);
      fi.files = dt.files;
      onLogoFileChange(fi);
    }
  });
});

/* ── Submit / Replace ───────────────────────────────────────── */
async function submitLogo(e) {
  e.preventDefault();
  const btn  = document.getElementById('logo-submit-btn');
  const file = document.getElementById('logo-file').files[0];
  if (!file) { toast('Please select a file.', 'warning'); return; }

  btn.disabled    = true;
  btn.textContent = 'Uploading…';

  const fd = new FormData();
  fd.append('file', file);

  try {
    await Api.submitLogo(fd);
    toast('✅ Logo submitted successfully!', 'success');
    document.getElementById('logo-form').reset();
    document.getElementById('logo-fd-name').textContent = '';
    // Reload to show updated preview & TC grid
    await loadLogoTab();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  }

  btn.disabled    = false;
  btn.textContent = document.getElementById('logo-form-label').textContent.includes('Replace')
    ? 'Replace Logo' : 'Submit Logo';
}
