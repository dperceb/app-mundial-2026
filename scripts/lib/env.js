import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnvFile } from '../../load-env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const PLACEHOLDERS = new Set(['', 'your_token_here', 'your_api_key_here', 'tu_clave_aqui', 'xxx']);

export function getProjectRoot() {
  return ROOT;
}

export function getDataDir() {
  return path.join(ROOT, 'public', 'data');
}

export function loadProjectEnv() {
  const envPath = path.join(ROOT, '.env');
  return loadEnvFile(envPath);
}

export function getFootballDataToken() {
  loadProjectEnv();
  const token = process.env.FOOTBALL_DATA_TOKEN?.trim();
  if (!token || PLACEHOLDERS.has(token)) return null;
  return token;
}
