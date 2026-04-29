/**
 * upcoming.js
 * Handles all logic for Tab 6 — Upcoming Tech Events.
 *
 * Everyone  : view the events table.
 * TC users  : also see an "Add Event" form and delete buttons.
 */

'use strict';

/* ── Entry point ────────────────────────────────────────────── */
async function loadUpcoming() {
  // Show / hide TC add-form
  document.getElementById('upcoming-tc-form').style.display =
    App.isTC() ? 'block' : 'none';

  const con = document.getElementById('upcoming-container');
  con.innerHTML = loadingHTML();

  try {
    const events = await Api.getUpcomingEvents();
    _renderUpcoming(events);
  } catch {
    con.innerHTML = emptyState('😕', 'Could not load events',
      'Please try again later.');
  }
}

/* ── Render events table ────────────────────────────────────── */
function _renderUpcoming(events) {
  const con = document.getElementById('upcoming-container');

  if (!events.length) {
    con.innerHTML = emptyState('🔭', 'Coming soon',
      'Upcoming tech events will appear here once added.');
    return;
  }

  const tcCol = App.isTC() ? '<th></th>' : '';

  let html = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Topic</th>
            <th>Tentative Date</th>
            <th>Quarter</th>
            <th>Presenter</th>
            ${tcCol}
          </tr>
        </thead>
        <tbody>`;

  events.forEach(ev => {
    html += `
      <tr>
        <td><strong>${esc(ev.topic)}</strong></td>
        <td>${esc(ev.tentative_date || '—')}</td>
        <td><span class="badge badge-tc">${esc(ev.quarter || '—')}</span></td>
        <td>${esc(ev.presenter || '—')}</td>
        ${App.isTC()
          ? `<td><button class="btn btn-danger btn-sm"
               onclick="deleteUpcoming(${ev.id})">🗑 Remove</button></td>`
          : ''}
      </tr>`;
  });

  html += '</tbody></table></div>';
  con.innerHTML = html;
}

/* ── TC: Add a new event ────────────────────────────────────── */
async function addUpcomingEvent(e) {
  e.preventDefault();

  const body = {
    topic:          document.getElementById('ue-topic').value.trim(),
    tentative_date: document.getElementById('ue-date').value.trim(),
    quarter:        document.getElementById('ue-quarter').value,
    presenter:      document.getElementById('ue-presenter').value.trim(),
  };

  try {
    await Api.addUpcomingEvent(body);
    toast('✅ Event added!', 'success');
    e.target.reset();
    await loadUpcoming();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  }
}

/* ── TC: Delete an event ────────────────────────────────────── */
async function deleteUpcoming(id) {
  if (!confirm('Remove this event? This cannot be undone.')) return;
  try {
    await Api.deleteUpcomingEvent(id);
    toast('Event removed.', 'info');
    await loadUpcoming();
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  }
}
