import { groupMatchesByDate } from './filters.js';

const STATUS_LABELS = {
  SCHEDULED: 'Programado',
  TIMED: 'Programado',
  LIVE: 'En vivo',
  IN_PLAY: 'En vivo',
  PAUSED: 'Descanso',
  FINISHED: 'Finalizado',
  POSTPONED: 'Aplazado',
  SUSPENDED: 'Suspendido',
  CANCELLED: 'Cancelado',
};

const STAGE_LABELS = {
  'group-stage': 'Grupos',
  'round-of-32': 'Dieciseisavos',
  'round-of-16': 'Octavos',
  'quarter-finals': 'Cuartos',
  'semi-finals': 'Semifinales',
  'third-place': '3er puesto',
  final: 'Final',
};

function isSameLocalDay(iso, date = new Date()) {
  const d = new Date(iso);
  return d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === date.getDate();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function formatTime(iso) {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function formatDateLong(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatDateShort(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function statusBadge(match) {
  if (match.isLive) return '<span class="badge badge-live">EN VIVO</span>';
  if (match.isFinished) return '<span class="badge badge-finished">FT</span>';
  return `<span class="badge badge-scheduled">${escapeHtml(STATUS_LABELS[match.status] || 'Programado')}</span>`;
}

function scoreHtml(match) {
  if (match.score) {
    return `<div class="match-score">${match.score.home}<span class="sep">-</span>${match.score.away}</div>`;
  }
  return `<div class="match-score"><span class="sep">vs</span></div>`;
}

export function renderMatchCard(match) {
  const liveClass = match.isLive ? ' live' : '';
  const stage = STAGE_LABELS[match.stage] || match.stage;
  const group = match.group ? ` · Grupo ${match.group}` : '';
  const minute = match.isLive && match.minute ? ` (${match.minute}')` : '';

  return `
    <article class="match-card${liveClass}" data-match="${match.matchNumber}">
      <div class="match-team home">
        <span class="name">${escapeHtml(match.homeTeam.name)}</span>
      </div>
      <div class="match-center">
        ${scoreHtml(match)}
        <div class="match-status">${statusBadge(match)}${minute}</div>
        <div class="match-time">${formatTime(match.kickoffUtc)}</div>
      </div>
      <div class="match-team away">
        <span class="name">${escapeHtml(match.awayTeam.name)}</span>
      </div>
      <div class="match-meta">
        ${escapeHtml(stage)}${escapeHtml(group)} · ${escapeHtml(match.stadium?.name || '')}
      </div>
    </article>
  `;
}

export function renderMatchList(matches) {
  if (!matches.length) {
    return `<div class="empty-state"><div class="icon">⚽</div><h3>Sin partidos</h3><p>No hay partidos para mostrar.</p></div>`;
  }
  return `<div class="match-list">${matches.map(renderMatchCard).join('')}</div>`;
}

export function renderMatchesByDate(groups) {
  if (!groups.length) return renderMatchList([]);
  return groups.map(([date, matches]) => `
    <div class="match-date-group">
      <h3>${escapeHtml(formatDateLong(date + 'T12:00:00Z'))}</h3>
      ${renderMatchList(matches)}
    </div>
  `).join('');
}

export function renderFiltersUI(filters, { stages, groups, statuses }) {
  const stageOpts = stages.map((s) =>
    `<option value="${escapeHtml(s.value)}"${filters.stage === s.value ? ' selected' : ''}>${escapeHtml(s.label)}</option>`
  ).join('');
  const groupOpts = groups.map((g) =>
    `<option value="${escapeHtml(g.value)}"${filters.group === g.value ? ' selected' : ''}>${escapeHtml(g.label)}</option>`
  ).join('');
  const statusOpts = statuses.map((s) =>
    `<option value="${escapeHtml(s.value)}"${filters.status === s.value ? ' selected' : ''}>${escapeHtml(s.label)}</option>`
  ).join('');

  return `
    <div class="filters" id="match-filters">
      <div class="filter-group">
        <label for="filter-stage">Fase</label>
        <select id="filter-stage" data-filter="stage">${stageOpts}</select>
      </div>
      <div class="filter-group">
        <label for="filter-group">Grupo</label>
        <select id="filter-group" data-filter="group">${groupOpts}</select>
      </div>
      <div class="filter-group">
        <label for="filter-status">Estado</label>
        <select id="filter-status" data-filter="status">${statusOpts}</select>
      </div>
      <div class="filter-group">
        <label for="filter-date">Fecha</label>
        <input type="date" id="filter-date" data-filter="date" value="${escapeHtml(filters.date || '')}">
      </div>
    </div>
  `;
}

export function renderHome(data) {
  const matches = data.matches || [];
  const live = matches.filter((m) => m.isLive);
  const today = matches.filter((m) => m.kickoffUtc && isSameLocalDay(m.kickoffUtc));
  const upcoming = matches
    .filter((m) => m.isScheduled && new Date(m.kickoffUtc) >= new Date())
    .sort((a, b) => new Date(a.kickoffUtc) - new Date(b.kickoffUtc))
    .slice(0, 6);

  return `
    <div class="hero">
      <div class="hero-content">
        <h1>FIFA WORLD CUP 2026</h1>
        <p class="tagline">#SOMOS26</p>
        <p>Canadá · México · Estados Unidos</p>
        <div class="hero-stats">
          <div class="hero-stat">
            <div class="value">${matches.length}</div>
            <div class="label">Partidos</div>
          </div>
          <div class="hero-stat">
            <div class="value">${live.length}</div>
            <div class="label">En vivo</div>
          </div>
          <div class="hero-stat">
            <div class="value">${today.length}</div>
            <div class="label">Hoy</div>
          </div>
        </div>
      </div>
    </div>

    <div class="quick-links">
      <a href="#partidos" class="quick-link" data-nav="partidos"><span class="icon">📅</span><span class="text">Partidos</span></a>
      <a href="#grupos" class="quick-link" data-nav="grupos"><span class="icon">📊</span><span class="text">Grupos</span></a>
    </div>

    ${live.length ? `<h2 class="section-title"><span class="badge badge-live">EN VIVO</span> Partidos en directo</h2>${renderMatchList(live)}` : ''}

      <h2 class="section-title">📅 Partidos de hoy — ${escapeHtml(formatDateLong(new Date()))}</h2>
    ${today.length ? renderMatchList(today) : '<div class="empty-state"><div class="icon">⚽</div><p>No hay partidos programados para hoy</p></div>'}

    ${upcoming.length ? `<h2 class="section-title" style="margin-top:2rem">🔜 Próximos partidos</h2>${renderMatchList(upcoming)}` : ''}
  `;
}

export function renderMatchesPage(matches, filters, filterOptions) {
  const grouped = groupMatchesByDate(matches);

  return `
    <div class="view-header">
      <h1>Partidos</h1>
      <p>Calendario completo del Mundial 2026 (${matches.length} partidos)</p>
    </div>
    ${renderFiltersUI(filters, filterOptions)}
    ${renderMatchesByDate(grouped)}
  `;
}

export function renderLoading(message = 'Cargando...') {
  return `<div class="loading"><div class="spinner"></div><p>${escapeHtml(message)}</p></div>`;
}

export function renderError(message) {
  return `
    <div class="error-state">
      <div class="icon">⚠️</div>
      <h3>No se pudieron cargar los datos</h3>
      <p>${escapeHtml(message)}</p>
      <button class="btn-refresh" id="btn-retry">Reintentar</button>
    </div>
  `;
}

export function renderUpdateBar(lastUpdated, warnings = []) {
  const date = lastUpdated
    ? new Date(lastUpdated).toLocaleString('es-ES')
    : 'desconocido';
  const warn = warnings.length
    ? `<span class="cache-notice stale">${escapeHtml(warnings[0])}</span>`
    : '';
  return `
    <div class="update-bar">
      <span>Datos actualizados: <strong>${escapeHtml(date)}</strong></span>
      ${warn}
      <button class="btn-refresh" id="btn-refresh">Actualizar</button>
    </div>
  `;
}
