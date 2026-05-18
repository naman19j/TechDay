/**
 * app.js
 * Main application controller.
 *
 * Responsibilities:
 *  - Load the current user from the API on page load.
 *  - Manage the active tab and delegate data loading to tab modules.
 *  - Expose the global `App` namespace consumed by all tab modules.
 *  - Handle the TC view-mode toggle (lets TC members preview as a regular user).
 */

'use strict';

/* ══════════════════════════════════════════════════════════════
   APP NAMESPACE
   All tab modules call App.isTC() to gate TC-only features.
══════════════════════════════════════════════════════════════ */
const App = {
  currentUser: null,
  viewMode:    'user',          // 'tech_council' | 'user'
  activeTab:   'home',

  /** True when the logged-in user is TC AND the view-mode is TC. */
  isTC() {
    return (
      this.currentUser?.role === 'tech_council' &&
      this.viewMode === 'tech_council'
    );
  },
};

/* ══════════════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  await _loadUser();
  _setupNavigation();

  // Honour URL hash on first load (e.g. #agenda bookmarks the Agenda tab)
  const hashTab = location.hash.slice(1);
  const validTab = document.getElementById('content-' + hashTab) ? hashTab : 'home';
  _switchTab(validTab);
});

/* ── Load current user ──────────────────────────────────────── */
async function _loadUser() {
  try {
    App.currentUser = await Api.getMe();
  } catch {
    // Fallback to demo user when backend is offline
    App.currentUser = { email: 'njain@abc.com', name: 'Nidhi Jain', role: 'tech_council' };
    toast('⚠️ Backend offline — running in demo mode', 'warning');
  }

  // Default viewMode matches the user's actual role
  App.viewMode = App.currentUser.role;

  _renderUserBadge();

  // Show the view-mode toggle only to TC members
  if (App.currentUser.role === 'tech_council') {
    const toggle = document.getElementById('view-toggle');
    toggle.style.display = 'flex';
    _updateToggleButtons();
  }
}

/* ── Render the header user pill ────────────────────────────── */
function _renderUserBadge() {
  const initials = App.currentUser.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  document.getElementById('user-avatar').textContent = initials;
  document.getElementById('user-name').textContent   = App.currentUser.name;

  const badge = document.getElementById('user-role-badge');
  if (App.currentUser.role === 'tech_council') {
    badge.textContent = 'Tech Council';
    badge.className   = 'user-role-badge tc';
  } else {
    badge.textContent = 'User';
    badge.className   = 'user-role-badge usr';
  }
}

/* ══════════════════════════════════════════════════════════════
   VIEW-MODE TOGGLE  (TC → preview as regular User)
══════════════════════════════════════════════════════════════ */
function setViewMode(mode) {
  App.viewMode = mode;
  _updateToggleButtons();
  // Reload the current tab so all TC-gated UI updates instantly
  _loadTabData(App.activeTab);
}

function _updateToggleButtons() {
  document.getElementById('btn-tc-view').className =
    'toggle-btn ' + (App.viewMode === 'tech_council' ? 'active' : 'inactive');
  document.getElementById('btn-usr-view').className =
    'toggle-btn ' + (App.viewMode === 'user' ? 'active' : 'inactive');
}

/* ══════════════════════════════════════════════════════════════
   TAB NAVIGATION
══════════════════════════════════════════════════════════════ */
function _setupNavigation() {
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => _switchTab(btn.dataset.tab));
  });
}

function _switchTab(tabId) {
  // Update nav highlight
  document.querySelectorAll('.nav-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tabId)
  );
  // Show/hide content panels
  document.querySelectorAll('.tab-content').forEach(s =>
    s.classList.toggle('active', s.id === 'content-' + tabId)
  );

  App.activeTab = tabId;
  location.hash = tabId;

  _loadTabData(tabId);
}

/* ── Delegate to the correct tab module ─────────────────────── */
function _loadTabData(tabId) {
  switch (tabId) {
    case 'home':          /* static — nothing to load */    break;
    case 'agenda':        loadAgenda();                     break;
    case 'presentations': loadPresentations();              break;
    case 'team':          loadTeam();                       break;
    case 'results':       loadResults();                    break;
    case 'upcoming':      loadUpcoming();                   break;
    case 'conferences':   loadConferences();                break;
    case 'archive2025':   loadArchive2025();                break;
    case 'logo':          loadLogoTab();                    break;
    case 'ask':           /* static */                      break;
    default: break;
  }
}
