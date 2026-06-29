import { loadAppData, clearCache } from './dataService.js';
import {
  defaultFilters,
  filterMatches,
  getStageOptions,
  getGroupOptions,
  getStatusOptions,
} from './filters.js';
import {
  renderHome,
  renderMatchesPage,
  renderLoading,
  renderError,
  renderUpdateBar,
} from './renderMatches.js';
import { renderStandings, renderTeamsGrid } from './renderGroups.js';
import { renderBracket } from './renderBracket.js';

const VIEWS = {
  inicio: 'view-inicio',
  partidos: 'view-partidos',
  grupos: 'view-grupos',
  eliminatoria: 'view-eliminatoria',
  selecciones: 'view-selecciones',
};

let currentRoute = 'inicio';
let appData = null;
let matchFilters = defaultFilters();
let refreshTimer = null;
const POLL_MS = 90_000;

async function loadData(force = false) {
  if (force) clearCache();
  appData = await loadAppData(force);
  return appData;
}

function getContainer(route) {
  return document.getElementById(VIEWS[route]);
}

function renderUpdateBarAll() {
  const bar = document.getElementById('update-bar');
  if (!bar || !appData) return;
  const warnings = (appData.meta?.warnings || []).filter(
    (w) => !w.startsWith('Equipo en openfootball')
  );
  bar.innerHTML = renderUpdateBar(appData.lastUpdated, warnings);
  bar.querySelector('#btn-refresh')?.addEventListener('click', () => refresh(true));
}

function renderRoute(route) {
  const container = getContainer(route);
  if (!container || !appData) return;

  switch (route) {
    case 'inicio':
      container.innerHTML = renderHome(appData);
      break;
    case 'partidos': {
      const filtered = filterMatches(appData.matches, matchFilters);
      container.innerHTML = renderMatchesPage(filtered, matchFilters, {
        stages: getStageOptions(),
        groups: getGroupOptions(),
        statuses: getStatusOptions(),
      });
      bindFilterEvents(container);
      break;
    }
    case 'grupos':
      container.innerHTML = renderStandings(appData.standings, appData.meta);
      break;
    case 'eliminatoria':
      try {
        const html = renderBracket(appData.matches, appData.standings);
        container.innerHTML = html;
        requestAnimationFrame(() => {
          container.querySelector('.bracket-container')?.scrollTo({ left: 0, behavior: 'instant' });
        });
      } catch (err) {
        container.innerHTML = renderError(err.message);
      }
      break;
    case 'selecciones':
      container.innerHTML = renderTeamsGrid(appData.teams);
      break;
    default:
      container.innerHTML = renderHome(appData);
  }
}

function bindFilterEvents(container) {
  container.querySelectorAll('[data-filter]').forEach((el) => {
    el.addEventListener('change', () => {
      matchFilters = {
        ...matchFilters,
        [el.dataset.filter]: el.value,
      };
      renderRoute('partidos');
    });
  });
}

function navigateTo(route) {
  const r = VIEWS[route] ? route : 'inicio';
  currentRoute = r;

  document.querySelectorAll('.view').forEach((el) => el.classList.remove('active'));
  const activeEl = document.getElementById(VIEWS[r]);
  activeEl?.classList.add('active');

  document.querySelectorAll('.main-nav a').forEach((a) => {
    a.classList.toggle('active', a.dataset.nav === r);
  });

  const nav = document.querySelector('.main-nav');
  const toggle = document.querySelector('.nav-toggle');
  if (nav?.classList.contains('open')) {
    nav.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
  }

  renderRoute(r);
}

function parseHash() {
  const hash = window.location.hash.replace('#', '') || 'inicio';
  return VIEWS[hash] ? hash : 'inicio';
}

function initRouter() {
  window.addEventListener('hashchange', () => navigateTo(parseHash()));

  document.querySelectorAll('[data-nav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const nav = el.dataset.nav;
      if (nav && VIEWS[nav]) {
        e.preventDefault();
        const current = window.location.hash.replace('#', '') || 'inicio';
        if (current === nav) {
          navigateTo(nav);
        } else {
          window.location.hash = nav;
        }
      }
    });
  });

  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  toggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  const route = parseHash();
  const currentHash = window.location.hash.replace('#', '');
  if (currentHash === route) {
    navigateTo(route);
  } else {
    window.location.hash = route;
  }
}

async function refresh(force = false) {
  document.querySelectorAll('.view.active').forEach((el) => {
    if (!el.innerHTML.trim()) el.innerHTML = renderLoading('Actualizando...');
  });
  try {
    await loadData(force);
    renderUpdateBarAll();
    navigateTo(currentRoute);
  } catch (err) {
    const container = getContainer(currentRoute);
    if (container) container.innerHTML = renderError(err.message);
  }
}

function setupPolling() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => refresh(true), POLL_MS);
}

async function init() {
  const route = parseHash();
  document.querySelectorAll('.view').forEach((el) => el.classList.remove('active'));
  const initialEl = getContainer(route);
  initialEl?.classList.add('active');
  if (initialEl) initialEl.innerHTML = renderLoading();

  try {
    await loadData();
    renderUpdateBarAll();
    initRouter();
    setupPolling();
  } catch (err) {
    document.getElementById('view-inicio').innerHTML = renderError(err.message);
    document.getElementById('btn-retry')?.addEventListener('click', () => refresh(true));
  }

  document.addEventListener('click', (e) => {
    if (e.target.id === 'btn-retry') refresh(true);
  });
}

document.addEventListener('DOMContentLoaded', init);
