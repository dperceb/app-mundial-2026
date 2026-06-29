import path from 'path';
import { getDataDir, getFootballDataToken } from './lib/env.js';
import { readJson, writeJsonAtomic, nowIso } from './lib/io.js';
import {
  getCompetitionMatches,
  mapFdStatus,
  mapFdScore,
  FootballDataError,
} from './lib/football-data.js';
import { matchFdToFixture } from './lib/merge.js';

const RESULTS_FILE = 'live-results.json';

function buildExistingMap(previous, fixtures) {
  const map = {};
  (previous?.results || []).forEach((r) => {
    if (r.fdMatchId && r.matchNumber) map[r.fdMatchId] = r.matchNumber;
  });
  fixtures.forEach((f) => {
    if (f.fdMatchId) map[f.fdMatchId] = f.matchNumber;
  });
  return map;
}

async function main() {
  const dataDir = getDataDir();
  const outPath = path.join(dataDir, RESULTS_FILE);
  const previous = readJson(outPath, { ok: false, results: [], lastUpdated: null });
  const baseFixtures = readJson(path.join(dataDir, 'base-fixtures.json'));

  if (!baseFixtures?.fixtures?.length) {
    console.error('Ejecuta primero: npm run import:static');
    process.exit(1);
  }

  const token = getFootballDataToken();
  if (!token) {
    const payload = {
      ...previous,
      lastUpdated: nowIso(),
      source: 'football-data.org',
      ok: false,
      error: 'FOOTBALL_DATA_TOKEN no configurado en .env',
    };
    writeJsonAtomic(outPath, payload);
    console.warn('Sin token — se conservó el JSON anterior');
    process.exit(1);
  }

  try {
    const fdMatches = await getCompetitionMatches(token);
    const existingMap = buildExistingMap(previous, baseFixtures.fixtures);
    const results = [];
    const unmatched = [];

    fdMatches.forEach((m) => {
      const fixture = matchFdToFixture(m, baseFixtures.fixtures, existingMap);
      if (!fixture) {
        unmatched.push(m.id);
        return;
      }
      existingMap[m.id] = fixture.matchNumber;
      results.push({
        fdMatchId: m.id,
        matchNumber: fixture.matchNumber,
        status: mapFdStatus(m.status),
        minute: m.minute ?? null,
        score: mapFdScore(m),
        homeTeam: m.homeTeam ? { name: m.homeTeam.name, shortName: m.homeTeam.shortName } : null,
        awayTeam: m.awayTeam ? { name: m.awayTeam.name, shortName: m.awayTeam.shortName } : null,
      });
    });

    const payload = {
      lastUpdated: nowIso(),
      source: 'football-data.org',
      ok: true,
      error: null,
      matched: results.length,
      unmatched: unmatched.length,
      results,
    };

    writeJsonAtomic(outPath, payload);
    console.log(`✓ live-results.json (${results.length} partidos emparejados)`);
    if (unmatched.length) console.warn(`  ${unmatched.length} partidos FD sin emparejar`);
  } catch (err) {
    const message = err instanceof FootballDataError ? err.message : err.message;
    const payload = {
      ...previous,
      lastUpdated: nowIso(),
      source: 'football-data.org',
      ok: false,
      error: message,
    };
    writeJsonAtomic(outPath, payload);
    console.error('Error API — se conservó la última versión:', message);
    process.exit(1);
  }
}

main();
