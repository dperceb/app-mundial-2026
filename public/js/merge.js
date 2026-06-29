const LIVE_STATUSES = new Set(['LIVE', 'IN_PLAY', 'PAUSED']);

function isPlaceholderTeam(name) {
  if (!name) return true;
  const n = name.trim().toLowerCase();
  return /^winner\b/.test(n) || /^loser\b/.test(n) || /^w\d+$/i.test(n) || /^l\d+$/i.test(n) ||
    /^3rd\b/.test(n) || /^third\b/.test(n) || /^group\b/.test(n);
}

export function findLiveOverlay(fixture, liveResults) {
  if (!liveResults?.ok || !liveResults.results?.length) return null;
  return liveResults.results.find((r) => r.matchNumber === fixture.matchNumber) || null;
}

export function mergeFixture(fixture, overlay) {
  const status = overlay?.status || 'SCHEDULED';
  const homeTeam = overlay?.homeTeam?.name && isPlaceholderTeam(fixture.homeTeam.name)
    ? { ...fixture.homeTeam, name: overlay.homeTeam.name }
    : fixture.homeTeam;
  const awayTeam = overlay?.awayTeam?.name && isPlaceholderTeam(fixture.awayTeam.name)
    ? { ...fixture.awayTeam, name: overlay.awayTeam.name }
    : fixture.awayTeam;

  return {
    ...fixture,
    homeTeam,
    awayTeam,
    fdMatchId: overlay?.fdMatchId ?? fixture.fdMatchId ?? null,
    status,
    minute: overlay?.minute ?? null,
    score: overlay?.score ?? null,
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

  const matches = (baseFixtures?.fixtures || []).map((fx) => {
    const overlay = findLiveOverlay(fx, resultsOk ? liveResults : null);
    return mergeFixture(fx, overlay);
  });

  const standings = standingsOk ? (liveStandings?.standings || []) : [];

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
