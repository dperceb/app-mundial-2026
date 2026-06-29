const LIVE_STATUSES = new Set(['LIVE', 'IN_PLAY', 'PAUSED']);

function teamKey(name) {
  if (!name) return '';
  return name.trim().toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function isPlaceholderTeam(name) {
  if (!name) return true;
  const n = name.trim().toLowerCase();
  return /^winner\b/.test(n) || /^loser\b/.test(n) || /^w\d+$/i.test(n) || /^l\d+$/i.test(n) ||
    /^3rd\b/.test(n) || /^third\b/.test(n) || /^group\b/.test(n);
}

function buildCrestMap(standings, liveResults) {
  const map = new Map();
  for (const group of standings || []) {
    for (const row of group.table || []) {
      const crest = row.team?.crest;
      const name = row.team?.name;
      if (crest && name) map.set(teamKey(name), crest);
    }
  }
  for (const result of liveResults?.results || []) {
    for (const side of ['homeTeam', 'awayTeam']) {
      const team = result[side];
      if (team?.crest && team?.name) map.set(teamKey(team.name), team.crest);
    }
  }
  return map;
}

function enrichTeam(team, crestMap) {
  if (!team) return team;
  const crest = team.crest || crestMap.get(teamKey(team.name)) || null;
  return crest ? { ...team, crest } : team;
}

export function findLiveOverlay(fixture, liveResults) {
  if (!liveResults?.ok || !liveResults.results?.length) return null;
  return liveResults.results.find((r) => r.matchNumber === fixture.matchNumber) || null;
}

export function mergeFixture(fixture, overlay, crestMap = new Map()) {
  const status = overlay?.status || 'SCHEDULED';
  let homeTeam = overlay?.homeTeam?.name && isPlaceholderTeam(fixture.homeTeam.name)
    ? { ...fixture.homeTeam, name: overlay.homeTeam.name }
    : fixture.homeTeam;
  let awayTeam = overlay?.awayTeam?.name && isPlaceholderTeam(fixture.awayTeam.name)
    ? { ...fixture.awayTeam, name: overlay.awayTeam.name }
    : fixture.awayTeam;

  homeTeam = enrichTeam(homeTeam, crestMap);
  awayTeam = enrichTeam(awayTeam, crestMap);
  if (overlay?.homeTeam?.crest) homeTeam = { ...homeTeam, crest: overlay.homeTeam.crest };
  if (overlay?.awayTeam?.crest) awayTeam = { ...awayTeam, crest: overlay.awayTeam.crest };

  return {
    ...fixture,
    homeTeam,
    awayTeam,
    fdMatchId: overlay?.fdMatchId ?? fixture.fdMatchId ?? null,
    status,
    minute: overlay?.minute ?? null,
    score: overlay?.score ?? null,
    goals: overlay?.goals ?? null,
    isLive: LIVE_STATUSES.has(status),
    isFinished: status === 'FINISHED',
    isScheduled: status === 'SCHEDULED' || status === 'TIMED',
  };
}

export function mergeAppData({ baseFixtures, baseTeams, baseStadiums, liveResults, liveStandings }) {
  const warnings = [...(baseFixtures?.warnings || [])];
  const resultsOk = liveResults?.ok !== false;
  const standingsOk = liveStandings?.ok !== false;

  if (liveResults && !resultsOk && liveResults.error) {
    warnings.push(`Resultados: ${liveResults.error}`);
  }
  if (liveStandings && !standingsOk && liveStandings.error) {
    warnings.push(`Clasificación: ${liveStandings.error}`);
  }

  const standings = standingsOk ? (liveStandings?.standings || []) : [];
  const crestMap = buildCrestMap(standings, resultsOk ? liveResults : null);

  const matches = (baseFixtures?.fixtures || []).map((fx) => {
    const overlay = findLiveOverlay(fx, resultsOk ? liveResults : null);
    return mergeFixture(fx, overlay, crestMap);
  });

  return {
    lastUpdated: new Date().toISOString(),
    meta: {
      staticLastUpdated: baseFixtures?.lastUpdated || null,
      resultsLastUpdated: liveResults?.lastUpdated || null,
      standingsLastUpdated: liveStandings?.lastUpdated || null,
      liveOk: resultsOk || standingsOk,
      resultsOk,
      standingsOk,
      warnings,
    },
    tournament: baseFixtures?.tournament || {},
    teams: baseTeams?.teams || [],
    stadiums: baseStadiums?.stadiums || [],
    matches,
    standings,
  };
}
