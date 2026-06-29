import { teamKey, teamsMatch } from './normalize.js';

const OPENFOOTBALL_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

export async function fetchOpenFootballMatches() {
  const res = await fetch(OPENFOOTBALL_URL);
  if (!res.ok) throw new Error(`openfootball HTTP ${res.status}`);
  const data = await res.json();
  return data.matches || [];
}

export function parseOfMinute(raw) {
  if (raw == null || raw === '') return { minute: null, injuryTime: null };
  const str = String(raw).trim();
  const m = str.match(/^(\d+)(?:\+(\d+))?$/);
  if (!m) return { minute: parseInt(str, 10) || null, injuryTime: null };
  return {
    minute: parseInt(m[1], 10),
    injuryTime: m[2] ? parseInt(m[2], 10) : null,
  };
}

export function matchOpenFootballToFixture(of, fixtures) {
  const date = of.date;
  if (!date) return null;

  const ofGroup = of.group?.match(/Group\s+([A-L])/i)?.[1] || null;

  const candidates = fixtures.filter((fx) => {
    const fxDate = fx.kickoffUtc?.slice(0, 10);
    if (!fxDate) return false;
    const dayDiff = Math.abs(new Date(`${fxDate}T12:00:00Z`) - new Date(`${date}T12:00:00Z`));
    if (dayDiff > 36 * 60 * 60 * 1000) return false;
    if (ofGroup && fx.group && fx.group !== ofGroup) return false;
    return teamsMatch(of.team1, fx.homeTeam.name) && teamsMatch(of.team2, fx.awayTeam.name);
  });

  if (candidates.length === 1) return candidates[0];

  const swapped = fixtures.filter((fx) => {
    const fxDate = fx.kickoffUtc?.slice(0, 10);
    if (!fxDate) return false;
    const dayDiff = Math.abs(new Date(`${fxDate}T12:00:00Z`) - new Date(`${date}T12:00:00Z`));
    if (dayDiff > 36 * 60 * 60 * 1000) return false;
    if (ofGroup && fx.group && fx.group !== ofGroup) return false;
    return teamsMatch(of.team1, fx.awayTeam.name) && teamsMatch(of.team2, fx.homeTeam.name);
  });

  return candidates[0] || swapped[0] || null;
}

export function mapOpenFootballGoals(of, fixture) {
  const homeIsTeam1 = teamsMatch(of.team1, fixture.homeTeam.name);
  const homeGoals = homeIsTeam1 ? of.goals1 : of.goals2;
  const awayGoals = homeIsTeam1 ? of.goals2 : of.goals1;
  const homeTeamName = fixture.homeTeam.name;
  const awayTeamName = fixture.awayTeam.name;
  const goals = [];

  for (const g of homeGoals || []) {
    const { minute, injuryTime } = parseOfMinute(g.minute);
    goals.push({
      minute,
      injuryTime,
      type: g.owngoal ? 'OWN_GOAL' : g.penalty ? 'PENALTY' : 'REGULAR',
      team: homeTeamName,
      scorer: g.name || null,
      assist: null,
    });
  }

  for (const g of awayGoals || []) {
    const { minute, injuryTime } = parseOfMinute(g.minute);
    goals.push({
      minute,
      injuryTime,
      type: g.owngoal ? 'OWN_GOAL' : g.penalty ? 'PENALTY' : 'REGULAR',
      team: awayTeamName,
      scorer: g.name || null,
      assist: null,
    });
  }

  goals.sort((a, b) => {
    const ma = (a.minute ?? 0) + (a.injuryTime ?? 0) * 0.001;
    const mb = (b.minute ?? 0) + (b.injuryTime ?? 0) * 0.001;
    return ma - mb;
  });

  return goals.length ? goals : null;
}

export function buildOpenFootballGoalMap(ofMatches, fixtures) {
  const map = new Map();
  for (const of of ofMatches) {
    const fixture = matchOpenFootballToFixture(of, fixtures);
    if (!fixture) continue;
    const goals = mapOpenFootballGoals(of, fixture);
    if (goals) map.set(fixture.matchNumber, goals);
  }
  return map;
}
