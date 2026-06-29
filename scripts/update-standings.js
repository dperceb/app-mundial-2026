import path from 'path';
import { getDataDir, getFootballDataToken } from './lib/env.js';
import { readJson, writeJsonAtomic, nowIso } from './lib/io.js';
import { getCompetitionStandings, FootballDataError } from './lib/football-data.js';
import { teamKey } from './lib/normalize.js';

const STANDINGS_FILE = 'live-standings.json';
const GROUPS = 'ABCDEFGHIJKL'.split('');

function resolveTeamGroup(fdTeam, baseTeams) {
  const byKey = new Map();
  (baseTeams?.teams || []).forEach((t) => byKey.set(teamKey(t.name), t.group));

  const candidates = [fdTeam.name, fdTeam.shortName, fdTeam.tla].filter(Boolean);
  for (const name of candidates) {
    const group = byKey.get(teamKey(name));
    if (group) return group;
  }
  return null;
}

function mapStandings(fdStandings, baseTeams) {
  const totalBlock = fdStandings.find(
    (block) => block.stage === 'GROUP_STAGE' && block.type === 'TOTAL'
  );

  if (!totalBlock?.table?.length) return [];

  const byGroup = new Map(GROUPS.map((g) => [g, []]));

  totalBlock.table.forEach((row) => {
    const group = resolveTeamGroup(row.team, baseTeams);
    if (!group || !byGroup.has(group)) return;

    byGroup.get(group).push({
      team: {
        slug: teamKey(row.team.name),
        name: row.team.name,
        fdId: row.team.id,
        crest: row.team.crest || null,
      },
      played: row.playedGames,
      won: row.won,
      drawn: row.draw,
      lost: row.lost,
      gf: row.goalsFor,
      ga: row.goalsAgainst,
      gd: row.goalDifference,
      points: row.points,
      form: row.form || null,
    });
  });

  return GROUPS
    .filter((g) => byGroup.get(g).length > 0)
    .map((group) => {
      const table = byGroup.get(group)
        .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
        .map((row, index) => ({ position: index + 1, ...row }));
      return { group, table };
    });
}

async function main() {
  const dataDir = getDataDir();
  const outPath = path.join(dataDir, STANDINGS_FILE);
  const previous = readJson(outPath, { ok: false, standings: [], lastUpdated: null });
  const baseTeams = readJson(path.join(dataDir, 'base-teams.json'));

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
    const fdStandings = await getCompetitionStandings(token);
    const standings = mapStandings(fdStandings, baseTeams);

    const payload = {
      lastUpdated: nowIso(),
      source: 'football-data.org',
      ok: true,
      error: null,
      standings,
    };

    writeJsonAtomic(outPath, payload);
    console.log(`✓ live-standings.json (${standings.length} grupos)`);
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
