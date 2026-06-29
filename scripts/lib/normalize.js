const TEAM_ALIASES = {
  'korea republic': 'south-korea',
  'south korea': 'south-korea',
  'republic of korea': 'south-korea',
  'czechia': 'czech-republic',
  'czech republic': 'czech-republic',
  'united states': 'united-states',
  'usa': 'united-states',
  'u.s.a.': 'united-states',
  'bosnia and herzegovina': 'bosnia-herzegovina',
  'bosnia-herzegovina': 'bosnia-herzegovina',
  'bosnia & herzegovina': 'bosnia-herzegovina',
  'turkiye': 'turkey',
  'turkey': 'turkey',
  'curaçao': 'curacao',
  'curacao': 'curacao',
  'cape verde islands': 'cabo-verde',
  'cape verde': 'cabo-verde',
  'cabo verde': 'cabo-verde',
  'ir iran': 'iran',
  'iran': 'iran',
  'côte d\'ivoire': 'ivory-coast',
  "cote d'ivoire": 'ivory-coast',
  'ivory coast': 'ivory-coast',
  'dr congo': 'dr-congo',
  'congo dr': 'dr-congo',
  'democratic republic of the congo': 'dr-congo',
  'd.r. congo': 'dr-congo',
  'new zealand': 'new-zealand',
  'scotland': 'scotland',
};

const STAGE_TO_FD = {
  'group-stage': 'GROUP_STAGE',
  'round-of-32': 'LAST_32',
  'round-of-16': 'LAST_16',
  'quarter-finals': 'QUARTER_FINALS',
  'semi-finals': 'SEMI_FINALS',
  'third-place': 'THIRD_PLACE',
  'final': 'FINAL',
};

const FD_TO_STAGE = Object.fromEntries(
  Object.entries(STAGE_TO_FD).map(([k, v]) => [v, k])
);

const HOST_CITY_COUNTRY = {
  'mexico-city': 'Mexico',
  'guadalajara': 'Mexico',
  'monterrey': 'Mexico',
  'toronto': 'Canada',
  'vancouver': 'Canada',
  'los-angeles': 'USA',
  'san-francisco': 'USA',
  'seattle': 'USA',
  'houston': 'USA',
  'dallas': 'USA',
  'kansas-city': 'USA',
  'atlanta': 'USA',
  'miami': 'USA',
  'orlando': 'USA',
  'new-york': 'USA',
  'philadelphia': 'USA',
  'boston': 'USA',
};

export function slugify(name) {
  if (!name) return 'tbd';
  const key = name.trim().toLowerCase();
  if (TEAM_ALIASES[key]) return TEAM_ALIASES[key];
  return key
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'tbd';
}

export function normalizeTeamName(name) {
  if (!name) return '';
  const trimmed = name.trim();
  const alias = TEAM_ALIASES[trimmed.toLowerCase()];
  if (alias) {
    return alias.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  return trimmed;
}

export function teamKey(name) {
  return slugify(normalizeTeamName(name));
}

export function isPlaceholderTeam(name) {
  if (!name) return true;
  const n = name.trim().toLowerCase();
  return /^winner\b/.test(n) || /^loser\b/.test(n) || /^w\d+$/i.test(n) || /^l\d+$/i.test(n) ||
    /^3rd\b/.test(n) || /^third\b/.test(n) || /^group\b/.test(n);
}

export function parsePlaceholder(name) {
  const m = name?.match(/(?:Winner|Loser)\s+Match\s+(\d+)/i);
  if (m) return `W${m[1]}`;
  if (/^W\d+$/i.test(name)) return name.toUpperCase();
  return name;
}

export function stageToFd(stage) {
  return STAGE_TO_FD[stage] || stage?.toUpperCase();
}

export function fdToStage(stage) {
  return FD_TO_STAGE[stage] || stage?.toLowerCase().replace(/_/g, '-');
}

export function parseOpenfootballGroup(group) {
  if (!group) return null;
  const m = group.match(/Group\s+([A-L])/i);
  return m ? m[1] : null;
}

export function stadiumSlug(name, hostCity) {
  const base = slugify(name || hostCity || 'stadium');
  return hostCity ? `${slugify(hostCity)}-${base}`.replace(/-+/g, '-') : base;
}

export function hostCityCountry(hostCity) {
  return HOST_CITY_COUNTRY[hostCity] || 'USA';
}

export function kickoffKey(iso) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 16);
}

export function teamsMatch(a, b) {
  if (!a || !b) return false;
  return teamKey(a) === teamKey(b);
}

export function teamMatchesFd(staticName, fdTeam) {
  if (!staticName || !fdTeam) return false;
  if (isPlaceholderTeam(staticName)) return true;
  const candidates = [fdTeam.name, fdTeam.shortName, fdTeam.tla].filter(Boolean);
  return candidates.some((name) => teamsMatch(staticName, name));
}
