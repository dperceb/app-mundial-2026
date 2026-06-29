const STAGE_ORDER = [
  { key: 'round-of-32', label: 'Dieciseisavos', css: 'r32', matches: [73, 75, 74, 77, 76, 78, 79, 80, 81, 82, 83, 84, 85, 87, 86, 88] },
  { key: 'round-of-16', label: 'Octavos', css: 'r16', matches: [90, 89, 91, 92, 94, 93, 96, 95] },
  { key: 'quarter-finals', label: 'Cuartos', css: 'qf', matches: [97, 99, 98, 100] },
  { key: 'semi-finals', label: 'Semifinales', css: 'sf', matches: [101, 102] },
  { key: 'final', label: 'Final', css: 'final', matches: [104] },
];

const THIRD_PLACE = 103;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function isPlaceholderName(name) {
  if (!name) return true;
  const n = name.trim().toLowerCase();
  return /^winner\b/.test(n) || /^loser\b/.test(n) || /^w\d+$/i.test(n) || /^l\d+$/i.test(n) ||
    /^3rd\b/.test(n) || /^third\b/.test(n) || /^group\b/.test(n);
}

function formatDateShort(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function buildMatchMap(matches) {
  const map = new Map();
  for (const m of matches) map.set(m.matchNumber, m);
  return map;
}

function buildCrestMap(standings) {
  const crests = new Map();
  for (const group of standings || []) {
    for (const row of group.table || []) {
      const name = row.team?.name;
      const crest = row.team?.crest;
      if (name && crest) crests.set(name.toLowerCase(), crest);
    }
  }
  return crests;
}

function getWinnerSide(match) {
  if (!match?.isFinished || !match.score) return null;
  const { home, away } = match.score;
  if (home > away) return 'home';
  if (away > home) return 'away';
  return null;
}

function getWinnerTeam(match) {
  const side = getWinnerSide(match);
  if (!side) return null;
  return side === 'home' ? match.homeTeam : match.awayTeam;
}

function getLoserTeam(match) {
  const side = getWinnerSide(match);
  if (!side) return null;
  return side === 'home' ? match.awayTeam : match.homeTeam;
}

function resolveTeam(team, matchMap) {
  if (!team) return { slug: 'tbd', name: 'Por definir', pending: true };

  const winnerRef = team.slug?.match(/^winner-match-(\d+)$/);
  if (winnerRef) {
    const parent = matchMap.get(Number(winnerRef[1]));
    const winner = parent ? getWinnerTeam(parent) : null;
    if (winner) return { ...winner, pending: false };
  }

  const loserRef = team.slug?.match(/^loser-match-(\d+)$/);
  if (loserRef) {
    const parent = matchMap.get(Number(loserRef[1]));
    const loser = parent ? getLoserTeam(parent) : null;
    if (loser) return { ...loser, pending: false };
  }

  if (!isPlaceholderName(team.name)) {
    return { ...team, pending: false };
  }

  return { slug: 'tbd', name: 'Por definir', pending: true };
}

function crestHtml(team, crestMap) {
  const crest = team?.crest || crestMap.get(team?.name?.toLowerCase());
  if (!crest) return '';
  return `<img src="${escapeHtml(crest)}" alt="" loading="lazy" width="18" height="18">`;
}

function renderTeamRow(match, side, matchMap, crestMap) {
  const team = resolveTeam(match[`${side}Team`], matchMap);
  const winnerSide = getWinnerSide(match);
  const score = match.score?.[side];
  const classes = ['team-row'];
  if (winnerSide === side) classes.push('winner');
  else if (winnerSide && winnerSide !== side) classes.push('loser');
  if (team.pending) classes.push('tbd');

  const scoreCell = match.score != null
    ? `<span class="score">${score ?? '-'}</span>`
    : '';

  return `
    <div class="${classes.join(' ')}">
      <div class="team-info">
        ${crestHtml(team, crestMap)}
        <span>${escapeHtml(team.name)}</span>
      </div>
      ${scoreCell}
    </div>
  `;
}

function renderBracketMatch(match, matchMap, crestMap) {
  if (!match) {
    return `<div class="bracket-match bracket-match--empty"><div class="team-row tbd"><span>Por definir</span></div></div>`;
  }

  const liveClass = match.isLive ? ' live' : '';
  const finishedClass = match.isFinished ? ' finished' : '';

  return `
    <div class="bracket-match${liveClass}${finishedClass}" data-match="${match.matchNumber}">
      ${renderTeamRow(match, 'home', matchMap, crestMap)}
      ${renderTeamRow(match, 'away', matchMap, crestMap)}
      <div class="match-date">
        ${match.isLive ? '<span class="badge badge-live">EN VIVO</span>' : escapeHtml(formatDateShort(match.kickoffUtc))}
      </div>
    </div>
  `;
}

function renderRound(stage, matchMap, crestMap) {
  const matches = stage.matches
    .map((n) => matchMap.get(n))
    .map((m) => renderBracketMatch(m, matchMap, crestMap))
    .join('');

  return `
    <div class="bracket-round bracket-round--${stage.css}">
      <div class="bracket-round-title">${escapeHtml(stage.label)}</div>
      <div class="bracket-round-matches">${matches}</div>
    </div>
  `;
}

export function renderBracket(matches, standings = []) {
  const knockout = matches.filter((m) => m.stage !== 'group-stage');
  if (!knockout.length) {
    return `
      <div class="view-header">
        <h1>Cuadro eliminatorio</h1>
        <p>El cuadro de eliminatorias estará disponible cuando comience la fase final.</p>
      </div>
      <div class="empty-state"><div class="icon">🏆</div><p>Sin partidos de eliminatoria</p></div>
    `;
  }

  const matchMap = buildMatchMap(matches);
  const crestMap = buildCrestMap(standings);
  const rounds = STAGE_ORDER.map((s) => renderRound(s, matchMap, crestMap)).join('');
  const thirdPlace = matchMap.get(THIRD_PLACE);
  const thirdHtml = thirdPlace
    ? `
      <div class="bracket-third-place">
        <h3 class="bracket-extra-title">Tercer puesto</h3>
        ${renderBracketMatch(thirdPlace, matchMap, crestMap)}
      </div>
    `
    : '';

  const finished = knockout.filter((m) => m.isFinished).length;

  return `
    <div class="view-header">
      <h1>Cuadro eliminatorio</h1>
      <p>Fase final del Mundial 2026 · ${finished}/${knockout.length} partidos jugados</p>
    </div>

    <p class="bracket-hint">Desliza horizontalmente para ver todo el cuadro. Los equipos en <strong>dorado</strong> avanzan a la siguiente ronda.</p>

    <div class="bracket-container">
      <div class="bracket">${rounds}</div>
      ${thirdHtml}
    </div>
  `;
}
