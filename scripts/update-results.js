import path from 'path';
import { getDataDir, getFootballDataToken } from './lib/env.js';
import { readJson, writeJsonAtomic, nowIso } from './lib/io.js';
import {
  getCompetitionMatches,
  mapFdStatus,
  mapFdScore,
  mapFdTeam,
  mapFdGoals,
  FootballDataError,
} from './lib/football-data.js';
import { matchFdToFixture } from './lib/merge.js';
import { fetchOpenFootballMatches, buildOpenFootballGoalMap } from './lib/openfootball.js';

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

    let ofGoalMap = new Map();
    try {
      const ofMatches = await fetchOpenFootballMatches();
      ofGoalMap = buildOpenFootballGoalMap(ofMatches, baseFixtures.fixtures);
    } catch (err) {
      console.warn('openfootball goles no disponibles:', err.message);
    }

    fdMatches.forEach((m) => {
      const fixture = matchFdToFixture(m, baseFixtures.fixtures, existingMap);
      if (!fixture) {
        unmatched.push(m.id);
        return;
      }
      existingMap[m.id] = fixture.matchNumber;
      const fdGoals = mapFdGoals(m);
      const ofGoals = ofGoalMap.get(fixture.matchNumber) || null;
      results.push({
        fdMatchId: m.id,
        matchNumber: fixture.matchNumber,
        status: mapFdStatus(m.status),
        minute: m.minute ?? null,
        score: mapFdScore(m),
        homeTeam: mapFdTeam(m.homeTeam),
        awayTeam: mapFdTeam(m.awayTeam),
        goals: fdGoals?.length ? fdGoals : ofGoals,
        goalsSource: fdGoals?.length ? 'football-data' : ofGoals ? 'openfootball' : null,
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
    const withGoals = results.filter((r) => r.goals?.length).length;
    console.log(`✓ live-results.json (${results.length} partidos emparejados, ${withGoals} con goles)`);
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
