function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function renderTable(groupData) {
  const rows = (groupData.table || []).map((row, i) => {
    const qual = row.position <= 2 ? 'qualified' : row.position === 3 ? 'qualified-third' : '';
    return `
      <tr class="${qual}">
        <td class="rank">${row.position}</td>
        <td>
          <div class="team-cell">
            ${row.team.crest ? `<img src="${escapeHtml(row.team.crest)}" alt="" loading="lazy">` : ''}
            <span>${escapeHtml(row.team.name)}</span>
          </div>
        </td>
        <td>${row.played}</td>
        <td>${row.won}</td>
        <td>${row.drawn}</td>
        <td>${row.lost}</td>
        <td>${row.gf}</td>
        <td>${row.ga}</td>
        <td>${row.gd > 0 ? '+' : ''}${row.gd}</td>
        <td class="pts">${row.points}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="standings-table-wrap">
      <h3>GRUPO ${escapeHtml(groupData.group)}</h3>
      <table class="standings-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Equipo</th>
            <th>PJ</th>
            <th>G</th>
            <th>E</th>
            <th>P</th>
            <th>GF</th>
            <th>GC</th>
            <th>DG</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

export function renderStandings(standings, meta = {}) {
  if (!standings?.length) {
    const msg = meta.standingsOk === false
      ? 'La clasificación no está disponible. Los scripts de actualización aún no han obtenido datos de Football-Data.org.'
      : 'Aún no hay datos de clasificación.';
    return `
      <div class="view-header">
        <h1>Clasificación</h1>
        <p>12 grupos · 48 selecciones</p>
      </div>
      <div class="empty-state">
        <div class="icon">📊</div>
        <h3>Clasificación no disponible</h3>
        <p>${escapeHtml(msg)}</p>
      </div>
    `;
  }

  const tables = standings.map(renderTable).join('');
  return `
    <div class="view-header">
      <h1>Clasificación</h1>
      <p>12 grupos · ${standings.length} tablas actualizadas</p>
    </div>
    <div class="standings-grid">${tables}</div>
  `;
}

export function renderTeamsGrid(teams) {
  if (!teams.length) return '';
  const cards = teams.map((t) => `
    <div class="team-card">
      <div class="team-name">${escapeHtml(t.name)}</div>
      <div class="team-code">Grupo ${escapeHtml(t.group)}</div>
    </div>
  `).join('');

  return `
    <div class="view-header">
      <h1>Selecciones</h1>
      <p>${teams.length} equipos clasificados</p>
    </div>
    <div class="teams-grid">${cards}</div>
  `;
}
