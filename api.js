/**
 * api.js
 * Thin wrappers around fetch() for every backend endpoint.
 * All functions are async and throw on non-OK responses.
 */

'use strict';

/* ── Generic helpers ────────────────────────────────────────── */
async function _get(path) {
  const r = await fetch(API_BASE + path);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function _post(path, body) {
  const r = await fetch(API_BASE + path, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function _patch(path, body) {
  const r = await fetch(API_BASE + path, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function _delete(path) {
  const r = await fetch(API_BASE + path, { method: 'DELETE' });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

/* ── Auth ───────────────────────────────────────────────────── */
const Api = {

  getMe: ()                    => _get('/api/me'),

  /* ── Agenda ─────────────────────────────────────────────── */
  getAgenda:  ()               => _get('/api/agenda'),
  saveAgenda: (headers, rows, published) =>
    _post('/api/agenda', { headers, rows, published }),

  /* ── Presentations ──────────────────────────────────────── */
  // Phase 1 — submit abstract (JSON, no file)
  submitAbstract: (body) => _post('/api/presentations/abstract', body),

  // Phase 2 — TC accept / reject abstract
  updateAbstractStatus: (id, status) =>
    _patch(`/api/presentations/${id}/abstract-status`, { status }),

  // Phase 3 — upload full file (accepted submitter only)
  uploadPresentationFile: (id, formData) =>
    fetch(API_BASE + `/api/presentations/${id}/file`, { method: 'POST', body: formData })
      .then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error); }); return r.json(); }),

  // Read endpoints
  getMyPresentation:    ()  => _get('/api/presentations/mine'),
  getAcceptedPresentations: () => _get('/api/presentations/accepted'),
  getAllPresentations:   ()  => _get('/api/presentations/all'),

  fileUrl: (filePath) => `${API_BASE}/uploads/${encodeURIComponent(filePath)}`,

  /* ── Team ───────────────────────────────────────────────── */
  getTeam: () => _get('/api/team'),

  /* ── Results ────────────────────────────────────────────── */
  getResults:  ()              => _get('/api/results'),
  saveResults: (headers, rows, published) =>
    _post('/api/results', { headers, rows, published }),

  /* ── Upcoming Events ────────────────────────────────────── */
  getUpcomingEvents:  ()       => _get('/api/upcoming-events'),
  addUpcomingEvent:   (body)   => _post('/api/upcoming-events', body),
  deleteUpcomingEvent:(id)     => _delete(`/api/upcoming-events/${id}`),

  /* ── External Conferences ───────────────────────────────── */
  getConferences:    ()        => _get('/api/conferences'),
  addConference:     (body)    => _post('/api/conferences', body),
  deleteConference:  (id)      => _delete(`/api/conferences/${id}`),
  /* ── Archive (Tech Day 2025) ────────────────────────────── */
  getArchivePresentations: () => _get('/api/archive/2025/presentations'),
  getArchiveResults:       () => _get('/api/archive/2025/results'),

  /* ── Logo Competition ───────────────────────────────────── */
  getMyLogo: () => _get('/api/logo/mine'),

  submitLogo: (formData) =>
    fetch(API_BASE + '/api/logo/submit', { method: 'POST', body: formData })
      .then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error); }); return r.json(); }),

  getAllLogos: () => _get('/api/logo/all'),

  logoUrl: (filePath) => `${API_BASE}/logo-uploads/${encodeURIComponent(filePath)}`,
};
