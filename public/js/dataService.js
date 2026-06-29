import { mergeAppData } from './merge.js';

const STORAGE_KEY = 'wc26_app_data';
const DATA_BASE = new URL('../data/', import.meta.url).pathname;
let cache = null;

function dataUrl(file) {
  const base = DATA_BASE.endsWith('/') ? DATA_BASE : `${DATA_BASE}/`;
  return `${base}${file}`;
}

async function fetchJson(file) {
  const url = `${dataUrl(file)}?t=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar ${file} (${res.status})`);
  return res.json();
}

async function loadFromParts() {
  const [baseFixtures, baseTeams, baseStadiums, liveResults, liveStandings] = await Promise.all([
    fetchJson('base-fixtures.json'),
    fetchJson('base-teams.json'),
    fetchJson('base-stadiums.json'),
    fetchJson('live-results.json').catch(() => ({ ok: false, results: [] })),
    fetchJson('live-standings.json').catch(() => ({ ok: false, standings: [] })),
  ]);
  return mergeAppData({ baseFixtures, baseTeams, baseStadiums, liveResults, liveStandings });
}

function saveSession(data) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function loadAppData(force = false) {
  if (cache && !force) return cache;

  try {
    const data = await fetchJson('app-data.json');
    cache = data;
    saveSession(data);
    return data;
  } catch {
    try {
      const data = await loadFromParts();
      cache = data;
      saveSession(data);
      return data;
    } catch {
      const fallback = loadSession();
      if (fallback) {
        cache = fallback;
        return fallback;
      }
      throw new Error('No hay datos disponibles. Ejecuta npm run setup en el servidor.');
    }
  }
}

export function getLastUpdated(data) {
  return data?.lastUpdated || null;
}

export function getMatches(data) {
  return data?.matches || [];
}

export function getStandings(data) {
  return data?.standings || [];
}

export function getTeams(data) {
  return data?.teams || [];
}

export function clearCache() {
  cache = null;
}
