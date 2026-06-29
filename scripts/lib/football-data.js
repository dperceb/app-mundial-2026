const API_BASE = 'https://api.football-data.org/v4';
const COMPETITION = 'WC';
const SEASON = 2026;

export class FootballDataError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fdFetch(path, token, retries = 2) {
  const url = `${API_BASE}${path}`;
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'X-Auth-Token': token },
      });

      if (res.status === 429) {
        await sleep(7000);
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new FootballDataError(
          body || `Football-Data.org error ${res.status}`,
          res.status
        );
      }

      return res.json();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(1500);
    }
  }

  throw lastErr;
}

export async function getCompetitionMatches(token, season = SEASON) {
  const data = await fdFetch(`/competitions/${COMPETITION}/matches?season=${season}`, token);
  return data.matches || [];
}

export async function getCompetitionStandings(token, season = SEASON) {
  const data = await fdFetch(`/competitions/${COMPETITION}/standings?season=${season}`, token);
  return data.standings || [];
}

export function mapFdStatus(status) {
  const map = {
    SCHEDULED: 'SCHEDULED',
    TIMED: 'SCHEDULED',
    LIVE: 'LIVE',
    IN_PLAY: 'LIVE',
    PAUSED: 'LIVE',
    FINISHED: 'FINISHED',
    POSTPONED: 'POSTPONED',
    SUSPENDED: 'SUSPENDED',
    CANCELLED: 'CANCELLED',
  };
  return map[status] || status || 'SCHEDULED';
}

export function mapFdScore(match) {
  const ft = match.score?.fullTime;
  const ht = match.score?.halfTime;
  if (ft?.home == null && ft?.away == null) return null;
  return {
    home: ft?.home ?? 0,
    away: ft?.away ?? 0,
    homeHt: ht?.home ?? null,
    awayHt: ht?.away ?? null,
  };
}
