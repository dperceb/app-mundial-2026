const STAGES = [
  { value: '', label: 'Todas las fases' },
  { value: 'group-stage', label: 'Fase de grupos' },
  { value: 'round-of-32', label: 'Dieciseisavos' },
  { value: 'round-of-16', label: 'Octavos' },
  { value: 'quarter-finals', label: 'Cuartos' },
  { value: 'semi-finals', label: 'Semifinales' },
  { value: 'third-place', label: '3er puesto' },
  { value: 'final', label: 'Final' },
];

const STATUSES = [
  { value: '', label: 'Todos' },
  { value: 'LIVE', label: 'En vivo' },
  { value: 'SCHEDULED', label: 'Programados' },
  { value: 'FINISHED', label: 'Finalizados' },
];

const GROUPS = ['', ...'ABCDEFGHIJKL'.split('')];

export function getStageOptions() {
  return STAGES;
}

export function getStatusOptions() {
  return STATUSES;
}

export function getGroupOptions() {
  return GROUPS.map((g) => ({ value: g, label: g ? `Grupo ${g}` : 'Todos los grupos' }));
}

export function defaultFilters() {
  return { stage: '', group: '', status: '', date: '' };
}

export function filterMatches(matches, filters = {}) {
  return matches.filter((m) => {
    if (filters.stage && m.stage !== filters.stage) return false;
    if (filters.group && m.group !== filters.group) return false;
    if (filters.status) {
      if (filters.status === 'LIVE' && !m.isLive) return false;
      if (filters.status === 'SCHEDULED' && !m.isScheduled) return false;
      if (filters.status === 'FINISHED' && !m.isFinished) return false;
    }
    if (filters.date && m.kickoffUtc) {
      const d = m.kickoffUtc.slice(0, 10);
      if (d !== filters.date) return false;
    }
    return true;
  });
}

export function getLiveMatches(matches) {
  return matches.filter((m) => m.isLive);
}

export function getTodayMatches(matches) {
  const now = new Date();
  return matches.filter((m) => m.kickoffUtc && isSameLocalDay(m.kickoffUtc, now));
}

function isSameLocalDay(iso, date) {
  const d = new Date(iso);
  return d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === date.getDate();
}

export function getUpcomingMatches(matches, limit = 6) {
  const now = Date.now();
  return matches
    .filter((m) => m.isScheduled && new Date(m.kickoffUtc).getTime() >= now)
    .sort((a, b) => new Date(a.kickoffUtc) - new Date(b.kickoffUtc))
    .slice(0, limit);
}

export function groupMatchesByDate(matches) {
  const groups = new Map();
  matches.forEach((m) => {
    const key = m.kickoffUtc?.slice(0, 10) || 'sin-fecha';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  });
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}
