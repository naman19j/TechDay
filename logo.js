/**
 * logo.js — Logo Competition tab
 *
 * Sections (load independently):
 *
 *  A. Winner banner  — shown to everyone when a logo is accepted
 *  B. My submission  — upload form OR own status card
 *  C. TC review grid — all submissions with Accept / Reject actions
 *
 * Rules:
 *  - Only one logo can be accepted (winner) at a time.
 *    Accepting a new one resets the previous winner to pending.
 *  - Users can replace their own logo at any time (resets to pending).
 *  - Users can only see their own submission.
 *  - TC sees all submissions.
 */

'use strict';

/* ── Entry point ────────────────────────────────────────────── */
function loadLogoTab() {
  document.getElementById('logo-all-section').style.display =
    App.isTC() ? 'block' : 'none';

  _loadWinner();
  _loadMySubmission();
  if (App.isTC()) _loadAllSubmissions();
}

/* ══════════════════════════════════════════════════════════════
   SECTION A — Winner Banner (visible to all)
══════════════════════════════════════════════════════════════ */
async function _loadWinner() {
  const wrap = document.getElementById('logo-winner-wrap');
  try {
    const winner = await Api.getLogoWinner();
    if (winner && winner.id) {
      wrap.style.display = 'block';
      wrap.innerHTML     = _winnerBannerHTML(winner);
    } else {
      wrap.style.display = 'none';
    }
  } catch {
    wrap.style.display = 'none';
  }
}

function _winnerBannerHTML(w) {
  return `
    <div class="logo-winner-banner">
      <div class="logo-winner-crown">🏆</div>
      <div class="logo-winner-content">
        <div class="logo-winner-label">Official Logo — Tech Day 2026</div>
        <div class="logo-winner-email">Submitted by ${esc(w.user_email)}</div>
      </div>
      <div class="logo-winner-img-wrap">
        <img src="${Api.logoUrl(w.file_path)}"
             alt="Winning logo"
             class="logo-winner-img"
             onerror="this.replaceWith(_logoFallback())">
      </div>
      <a href="${Api.logoUrl(w.file_path)}" target="_blank"
         rel="noopener" class="btn btn-secondary btn-sm">
        View Full Size ↗
      </a>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   SECTION B — My Submission
══════════════════════════════════════════════════════════════ */
async function _loadMySubmission() {
  const wrap = document.getElementById('logo-my-section');

  // Show upload form immediately — replace if submission found
  wrap.innerHTML = _uploadFormHTML();

  try {
    const sub = await Api.getMyLogo();
    if (sub && sub.id) {
      wrap.innerHTML = _myCardHTML(sub);
      document.getElementById('logo-form-label').textContent =
        sub.status === 'accepted'
          ? '🔄 Replace Your Logo (will reset to pending)'
          : '🔄 Replace Your Logo';
      document.getElementById('logo-submit-btn').textContent = 'Replace Logo';
    }
  } catch {
    // No submission — form already showing
  }
}

function _uploadFormHTML() {
  return `
    <div class="card">
      <div class="section-label" id="logo-form-label">⬆️ Submit Your Logo</div>
      <p style="font-size:13.5px;color:var(--text-3);margin-bottom:16px">
        Upload your logo design for Tech Day 2026. Accepted formats: PNG, JPG, SVG, WEBP.
        You can replace your submission at any time.
      </p>
      <form id="logo-form" onsubmit="submitLogo(event)">
        <div class="form-group">
          <label class="form-label">Logo File *</label>
          <div class="file-drop" id="logo-file-drop">
            <input type="file" id="logo-file"
                   accept=".png,.jpg,.jpeg,.svg,.gif,.webp"
                   required onchange="_onLogoFileChange(this)">
            <div class="fd-icon">🎨</div>
            <div class="fd-text">Drop your logo here or <strong>click to browse</strong></div>
            <div class="fd-name" id="logo-fd-name"></div>
          </div>
        </div>
        <button type="submit" class="btn btn-primary" id="logo-submit-btn">
          Submit Logo
        </button>
      </form>
    </div>`;
}

function _myCardHTML(sub) {
  const badge = {
    pending:  '<span class="badge badge-pending">⏳ Under Review</span>',
    accepted: '<span class="badge badge-accepted">🏆 Winner!</span>',
    rejected: '<span class="badge badge-rejected">✗ Not Selected</span>',
  }[sub.status] || '';

  const msg = {
    pending:  'Your logo is under review by the Tech Council.',
    accepted: 'Congratulations! Your logo has been selected as the official Tech Day 2026 logo! 🎉',
    rejected: 'Your logo was not selected. You can replace it with a new design.',
  }[sub.status] || '';

  // Show replace form only for pending or rejected
  const replaceForm = sub.status !== 'accepted' ? `
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
      <form id="logo-form" onsubmit="submitLogo(event)">
        <div class="form-group">
          <div class="section-label" id="logo-form-label">🔄 Replace Your Logo</div>
          <div class="file-drop" id="logo-file-drop">
            <input type="file" id="logo-file"
                   accept=".png,.jpg,.jpeg,.svg,.gif,.webp"
                   required onchange="_onLogoFileChange(this)">
            <div class="fd-icon">🎨</div>
            <div class="fd-text">Drop your new logo here or <strong>click to browse</strong></div>
            <div class="fd-name" id="logo-fd-name"></div>
          </div>
        </div>
        <button type="submit" class="btn btn-secondary" id="logo-submit-btn">
          Replace Logo
        </button>
      </form>
    </div>` : '';

  return `
    <div class="card">
      <div class="section-label">🖼️ My Submission</div>
      <div class="logo-my-card">
        <div class="logo-thumb-wrap">
          <img src="${Api.logoUrl(sub.file_path)}"
               alt="Your logo"
               class="logo-thumb"
               onerror="this.replaceWith(_logoFallback())">
        </div>
        <div class="logo-my-meta">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <span style="font-size:13.5px;font-weight:600;color:var(--text)">
              ${esc(sub.file_name)}
            </span>
            ${badge}
          </div>
          <p style="font-size:13.5px;color:var(--text-3);margin-top:6px">${msg}</p>
          <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
            <a href="${Api.logoUrl(sub.file_path)}" target="_blank" rel="noopener"
               class="btn btn-secondary btn-sm">View Full Size ↗</a>
          </div>
        </div>
      </div>
      ${replaceForm}
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   SECTION C — TC Review Grid
══════════════════════════════════════════════════════════════ */
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

    // Group by status
    const pending  = all.filter(s => s.status === 'pending');
    const accepted = all.filter(s => s.status === 'accepted');
    const rejected = all.filter(s => s.status === 'rejected');

    con.innerHTML = '';
    if (accepted.length) con.appendChild(_tcGroup('🏆 Winner',        accepted, false));
    if (pending.length)  con.appendChild(_tcGroup('⏳ Pending Review', pending,  true));
    if (rejected.length) con.appendChild(_tcGroup('✗ Not Selected',   rejected, true));

  } catch {
    con.innerHTML = emptyState('😕', 'Could not load submissions');
  }
}

function _tcGroup(heading, items, showActions) {
  const wrap = document.createElement('div');
  wrap.style.marginBottom = '28px';

  const header = document.createElement('div');
  header.className = 'tc-group-heading';
  header.innerHTML = `${heading} <span class="tc-group-count">${items.length}</span>`;
  wrap.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'logo-tc-grid';

  items.forEach(sub => {
    const card = document.createElement('div');
    card.className = 'logo-tc-card';

    const badgeMap = {
      pending:  '<span class="badge badge-pending">⏳ Pending</span>',
      accepted: '<span class="badge badge-accepted">🏆 Winner</span>',
      rejected: '<span class="badge badge-rejected">✗ Rejected</span>',
    };

    const actions = showActions ? `
      <div class="status-actions" style="margin-top:10px">
        <button class="btn btn-success btn-sm"
          onclick="reviewLogo(${sub.id}, 'accepted')">🏆 Select as Winner</button>
        <button class="btn btn-danger btn-sm"
          onclick="reviewLogo(${sub.id}, 'rejected')">✗ Reject</button>
      </div>` : `
      <div style="margin-top:10px">
        <button class="btn btn-secondary btn-sm"
          onclick="reviewLogo(${sub.id}, 'pending')">↩ Reset to Pending</button>
      </div>`;

    card.innerHTML = `
      <div class="logo-thumb-wrap" style="width:100%;height:160px">
        <img src="${Api.logoUrl(sub.file_path)}"
             alt="${esc(sub.file_name)}"
             class="logo-thumb"
             onerror="this.replaceWith(_logoFallback())">
      </div>
      <div class="logo-tc-meta">
        <div class="logo-tc-email">${esc(sub.user_email)}</div>
        <div class="logo-tc-file">📄 ${esc(sub.file_name)}</div>
        <div class="logo-tc-date">Updated: ${fmtDate(sub.updated_at)}</div>
        <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          ${badgeMap[sub.status] || ''}
          <a href="${Api.logoUrl(sub.file_path)}" target="_blank" rel="noopener"
             class="btn btn-secondary btn-sm">View ↗</a>
        </div>
        ${actions}
      </div>`;
    grid.appendChild(card);
  });

  wrap.appendChild(grid);
  return wrap;
}

/* ── TC: accept / reject a logo ─────────────────────────────── */
async function reviewLogo(id, status) {
  const labels = {
    accepted: '🏆 Select as Winner',
    rejected: 'Reject',
    pending:  'Reset to Pending',
  };
  const confirmMsg = {
    accepted: 'Select this as the winning logo? Any previously accepted logo will be reset.',
    rejected: 'Reject this logo submission?',
    pending:  'Reset this logo back to pending?',
  };

  if (!confirm(confirmMsg[status])) return;

  try {
    await Api.updateLogoStatus(id, status);
    toast(
      status === 'accepted' ? '🏆 Winner selected!' :
      status === 'rejected' ? 'Logo rejected.'      : 'Reset to pending.',
      status === 'accepted' ? 'success' : 'info'
    );
    // Reload all sections so winner banner updates too
    loadLogoTab();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  }
}

/* ── Helpers ────────────────────────────────────────────────── */
function _onLogoFileChange(input) {
  const nm = document.getElementById('logo-fd-name');
  if (nm) nm.textContent = input.files[0] ? '📎 ' + input.files[0].name : '';
}

function _logoFallback() {
  const el = document.createElement('div');
  el.className   = 'logo-thumb-fallback';
  el.textContent = '🖼️';
  return el;
}

/* ── Drag-and-drop ──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('dragover', e => {
    const drop = e.target.closest('#logo-file-drop');
    if (drop) { e.preventDefault(); drop.classList.add('dragover'); }
  });
  document.addEventListener('dragleave', e => {
    const drop = e.target.closest('#logo-file-drop');
    if (drop) drop.classList.remove('dragover');
  });
  document.addEventListener('drop', e => {
    const drop = e.target.closest('#logo-file-drop');
    if (!drop) return;
    e.preventDefault(); drop.classList.remove('dragover');
    const fi = document.getElementById('logo-file');
    if (fi && e.dataTransfer.files.length) {
      const dt = new DataTransfer();
      dt.items.add(e.dataTransfer.files[0]);
      fi.files = dt.files;
      _onLogoFileChange(fi);
    }
  });
});

/* ── Submit / Replace ───────────────────────────────────────── */
async function submitLogo(e) {
  e.preventDefault();
  const btn  = document.getElementById('logo-submit-btn');
  const file = document.getElementById('logo-file')?.files[0];
  if (!file) { toast('Please select a file.', 'warning'); return; }

  btn.disabled    = true;
  btn.textContent = 'Uploading…';

  const fd = new FormData();
  fd.append('file', file);

  try {
    await Api.submitLogo(fd);
    toast('✅ Logo submitted successfully!', 'success');
    loadLogoTab();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
    btn.disabled    = false;
    btn.textContent = 'Submit Logo';
  }
}
