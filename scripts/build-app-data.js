import path from 'path';
import { getDataDir } from './lib/env.js';
import { readJson, writeJsonAtomic } from './lib/io.js';
import { mergeAppData } from './lib/merge.js';

async function main() {
  const dataDir = getDataDir();

  const baseFixtures = readJson(path.join(dataDir, 'base-fixtures.json'));
  const baseTeams = readJson(path.join(dataDir, 'base-teams.json'));
  const baseStadiums = readJson(path.join(dataDir, 'base-stadiums.json'));
  const liveResults = readJson(path.join(dataDir, 'live-results.json'), { ok: false, results: [] });
  const liveStandings = readJson(path.join(dataDir, 'live-standings.json'), { ok: false, standings: [] });

  if (!baseFixtures) {
    console.error('Falta base-fixtures.json — ejecuta: npm run import:static');
    process.exit(1);
  }

  const appData = mergeAppData({
    baseFixtures,
    baseTeams: baseTeams || { teams: [] },
    baseStadiums: baseStadiums || { stadiums: [] },
    liveResults,
    liveStandings,
  });

  writeJsonAtomic(path.join(dataDir, 'app-data.json'), appData);
  console.log(`✓ app-data.json (${appData.matches.length} partidos, ${appData.standings.length} grupos)`);
  console.log(`  lastUpdated: ${appData.lastUpdated}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
