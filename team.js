/**
 * team.js
 * Handles all logic for Tab 4 — Organizing Team.
 *
 * Fetches team members from the API and renders avatar cards.
 * Photos can be added via the `photo_url` field in the DB.
 * Initials and gradient colours are auto-generated as fallback.
 */

'use strict';

/* ── Entry point ────────────────────────────────────────────── */
async function loadTeam() {
  const grid = document.getElementById('team-grid');
  grid.innerHTML = loadingHTML('Loading team…');

  try {
    const members = await Api.getTeam();

    if (!members.length) {
      grid.innerHTML = emptyState('👥', 'Team info coming soon',
        'Team details will be published before the event.');
      return;
    }

    grid.innerHTML = members.map((m, i) => _memberCard(m, i)).join('');

  } catch {
    grid.innerHTML = emptyState('😕', 'Could not load team',
      'Please try again later or contact the Tech Council.');
  }
}

/* ── Build a single member card ─────────────────────────────── */
function _memberCard(member, index) {
  const initials = member.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const colorClass = `av-${index % 6}`;

  // If a photo_url is set, render it from static/assets/images/.
  // onerror hides the <img> and lets the initials show through as fallback.
  const photoMarkup = member.photo_url
    ? `<img src="${esc(member.photo_url)}"
            alt="${esc(member.name)}"
            onerror="this.style.display='none'">`
    : '';

  return `
    <div class="team-card">
      <div class="team-avatar ${colorClass}">
        ${photoMarkup}
        ${initials}
      </div>
      <div class="team-name">${esc(member.name)}</div>
      <div class="team-desg">${esc(member.designation || 'Tech Council')}</div>
    </div>`;
}
