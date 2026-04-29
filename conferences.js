/**
 * conferences.js
 * Handles all logic for Tab 7 — External Conferences.
 *
 * Everyone  : view the conferences table.
 * TC users  : also see an "Add Conference" form and delete buttons.
 *
 * Conference names become clickable links when a URL is provided.
 */

'use strict';

/* ── Entry point ────────────────────────────────────────────── */
async function loadConferences() {
  // Show / hide TC add-form
  document.getElementById('conf-tc-form').style.display =
    App.isTC() ? 'block' : 'none';

  const con = document.getElementById('conf-container');
  con.innerHTML = loadingHTML();

  try {
    const confs = await Api.getConferences();
    _renderConferences(confs);
  } catch {
    con.innerHTML = emptyState('😕', 'Could not load conferences',
      'Please try again later.');
  }
}

/* ── Render conferences table ───────────────────────────────── */
function _renderConferences(confs) {
  const con = document.getElementById('conf-container');

  if (!confs.length) {
    con.innerHTML = emptyState('🌐', 'Coming soon',
      'External conference details will appear here once added.');
    return;
  }

  const tcCol = App.isTC() ? '<th></th>' : '';

  let html = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Conference</th>
            <th>Date</th>
            <th>Submission Deadline</th>
            ${tcCol}
          </tr>
        </thead>
        <tbody>`;

  confs.forEach(c => {
    // If a URL exists, make the conference name a hyperlink
    const nameCell = c.conference_url
      ? `<a href="${esc(c.conference_url)}" target="_blank" rel="noopener"
            style="color:var(--blue);font-weight:600">
           ${esc(c.conference_name)} ↗
         </a>`
      : `<strong>${esc(c.conference_name)}</strong>`;

    const deadline = c.last_submission_date
      ? `<span class="badge badge-pending">${esc(c.last_submission_date)}</span>`
      : '—';

    html += `
      <tr>
        <td>${nameCell}</td>
        <td>${esc(c.conference_date || '—')}</td>
        <td>${deadline}</td>
        ${App.isTC()
          ? `<td><button class="btn btn-danger btn-sm"
               onclick="deleteConference(${c.id})">🗑 Remove</button></td>`
          : ''}
      </tr>`;
  });

  html += '</tbody></table></div>';
  con.innerHTML = html;
}

/* ── TC: Add a new conference ───────────────────────────────── */
async function addConference(e) {
  e.preventDefault();

  const body = {
    conference_name:      document.getElementById('cf-name').value.trim(),
    conference_url:       document.getElementById('cf-url').value.trim() || null,
    conference_date:      document.getElementById('cf-date').value.trim(),
    last_submission_date: document.getElementById('cf-last').value.trim(),
  };

  try {
    await Api.addConference(body);
    toast('✅ Conference added!', 'success');
    e.target.reset();
    await loadConferences();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  }
}

/* ── TC: Delete a conference ────────────────────────────────── */
async function deleteConference(id) {
  if (!confirm('Remove this conference? This cannot be undone.')) return;
  try {
    await Api.deleteConference(id);
    toast('Conference removed.', 'info');
    await loadConferences();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  }
}
