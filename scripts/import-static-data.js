import path from 'path';
import { getDataDir } from './lib/env.js';
import { writeJsonAtomic, nowIso } from './lib/io.js';
import {
  slugify,
  teamKey,
  parseOpenfootballGroup,
  stadiumSlug,
  hostCityCountry,
  isPlaceholderTeam,
} from './lib/normalize.js';

const THESTATSAPI_URL = 'https://www.thestatsapi.com/world-cup/data/fixtures.json';
const OPENFOOTBALL_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

function normalizeTheStatsFixture(raw) {
  const homeName = raw.homeTeam || raw.home_team || 'TBD';
  const awayName = raw.awayTeam || raw.away_team || 'TBD';
  const hostCity = raw.hostCity || raw.host_city || null;

  return {
    matchNumber: raw.matchNumber ?? raw.match_number,
    kickoffUtc: raw.kickoffUtc || raw.kickoff_utc,
    stage: raw.stage,
    group: raw.group || null,
    homeTeam: { slug: slugify(homeName), name: homeName },
    awayTeam: { slug: slugify(awayName), name: awayName },
    stadium: {
      name: raw.stadium,
      hostCity,
      slug: stadiumSlug(raw.stadium, hostCity),
    },
  };
}

function buildTeamsFromFixtures(fixtures) {
  const teams = new Map();

  fixtures.forEach((fx) => {
    if (!fx.group) return;
    [fx.homeTeam, fx.awayTeam].forEach((team) => {
      if (isPlaceholderTeam(team.name)) return;
      const key = teamKey(team.name);
      if (!teams.has(key)) {
        teams.set(key, {
          slug: team.slug,
          name: team.name,
          group: fx.group,
        });
      }
    });
  });

  return [...teams.values()].sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
}

function buildStadiumsFromFixtures(fixtures) {
  const stadiums = new Map();

  fixtures.forEach((fx) => {
    const { stadium } = fx;
    if (!stadium?.name) return;
    const slug = stadium.slug || stadiumSlug(stadium.name, stadium.hostCity);
    if (!stadiums.has(slug)) {
      stadiums.set(slug, {
        slug,
        name: stadium.name,
        hostCity: stadium.hostCity,
        country: hostCityCountry(stadium.hostCity),
      });
    }
  });

  return [...stadiums.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function validateWithOpenfootball(fixtures, openData) {
  const warnings = [];
  const ofCount = openData?.matches?.length || 0;
  if (ofCount && ofCount !== fixtures.length) {
    warnings.push(`openfootball tiene ${ofCount} partidos; TheStatsAPI tiene ${fixtures.length}`);
  }

  const ofTeams = new Set();
  (openData?.matches || []).forEach((m) => {
    if (m.team1 && !/^W\d|^L\d|Winner|Loser/i.test(m.team1)) ofTeams.add(teamKey(m.team1));
    if (m.team2 && !/^W\d|^L\d|Winner|Loser/i.test(m.team2)) ofTeams.add(teamKey(m.team2));
  });

  const ourTeams = new Set(
    fixtures.flatMap((f) => [f.homeTeam, f.awayTeam])
      .filter((t) => !isPlaceholderTeam(t.name))
      .map((t) => teamKey(t.name))
  );

  ofTeams.forEach((t) => {
    if (!ourTeams.has(t)) warnings.push(`Equipo en openfootball no encontrado en TheStatsAPI: ${t}`);
  });

  (openData?.matches || []).slice(0, 5).forEach((m) => {
    const group = parseOpenfootballGroup(m.group);
    if (!group) return;
    const match = fixtures.find((f) =>
      f.group === group &&
      f.homeTeam.name.toLowerCase().includes(m.team1?.toLowerCase().slice(0, 4) || '___')
    );
    if (!match && m.team1 && !isPlaceholderTeam(m.team1)) {
      warnings.push(`Posible discrepancia openfootball: ${m.team1} vs ${m.team2} (${m.date})`);
    }
  });

  return warnings;
}

async function main() {
  const dataDir = getDataDir();
  console.log('Descargando datos estáticos...');

  const [theStats, openFootball] = await Promise.all([
    fetchJson(THESTATSAPI_URL),
    fetchJson(OPENFOOTBALL_URL).catch((err) => {
      console.warn('openfootball no disponible:', err.message);
      return null;
    }),
  ]);

  const fixtures = (theStats.fixtures || []).map(normalizeTheStatsFixture);
  const warnings = validateWithOpenfootball(fixtures, openFootball);

  if (fixtures.length !== 104) {
    warnings.push(`Se esperaban 104 partidos, se obtuvieron ${fixtures.length}`);
  }

  const teams = buildTeamsFromFixtures(fixtures);
  const stadiums = buildStadiumsFromFixtures(fixtures);
  const ts = nowIso();

  const baseFixtures = {
    lastUpdated: ts,
    source: 'thestatsapi',
    validationSource: openFootball ? 'openfootball' : null,
    warnings,
    tournament: {
      edition: theStats.tournament?.edition || '2026 FIFA World Cup',
      startDate: theStats.tournament?.startDate || theStats.tournament?.start_date,
      endDate: theStats.tournament?.endDate || theStats.tournament?.end_date,
      hosts: theStats.tournament?.hosts || ['United States', 'Canada', 'Mexico'],
      totalTeams: theStats.tournament?.totalTeams || 48,
      totalMatches: fixtures.length,
    },
    fixtures,
  };

  const baseTeams = {
    lastUpdated: ts,
    source: 'thestatsapi',
    teams,
  };

  const baseStadiums = {
    lastUpdated: ts,
    source: 'thestatsapi',
    stadiums,
  };

  writeJsonAtomic(path.join(dataDir, 'base-fixtures.json'), baseFixtures);
  writeJsonAtomic(path.join(dataDir, 'base-teams.json'), baseTeams);
  writeJsonAtomic(path.join(dataDir, 'base-stadiums.json'), baseStadiums);

  console.log(`✓ base-fixtures.json (${fixtures.length} partidos)`);
  console.log(`✓ base-teams.json (${teams.length} equipos)`);
  console.log(`✓ base-stadiums.json (${stadiums.length} estadios)`);
  if (warnings.length) {
    console.warn('Advertencias:', warnings.join('; '));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
