import { fdToStage, isPlaceholderTeam, teamMatchesFd } from './normalize.js';

const LIVE_STATUSES = new Set(['LIVE', 'IN_PLAY', 'PAUSED']);

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

export function matchFdToFixture(fdMatch, fixtures, existingMap = {}) {
  if (existingMap[fdMatch.id]) {
    const fx = fixtures.find((f) => f.matchNumber === existingMap[fdMatch.id]);
    if (fx) return fx;
  }

  const fdStage = fdToStage(fdMatch.stage);
  const fdGroup = fdMatch.group?.replace('GROUP_', '') || null;
  const home = fdMatch.homeTeam?.name || fdMatch.homeTeam?.shortName;
  const away = fdMatch.awayTeam?.name || fdMatch.awayTeam?.shortName;
  const kickoff = fdMatch.utcDate;

  return fixtures.find((fx) => {
    if (fdStage && fx.stage !== fdStage) return false;
    if (fdGroup && fx.group && fx.group !== fdGroup) return false;

    const sameKickoff = fx.kickoffUtc && kickoff &&
      Math.abs(new Date(fx.kickoffUtc) - new Date(kickoff)) < 90 * 60 * 1000;
    if (!sameKickoff) return false;

    const staticPlaceholder =
      isPlaceholderTeam(fx.homeTeam.name) || isPlaceholderTeam(fx.awayTeam.name);
    const fdPlaceholder = isPlaceholderTeam(home) || isPlaceholderTeam(away);

    if (staticPlaceholder || fdPlaceholder) return true;

    return teamMatchesFd(fx.homeTeam.name, fdMatch.homeTeam) &&
      teamMatchesFd(fx.awayTeam.name, fdMatch.awayTeam);
  }) || null;
}
