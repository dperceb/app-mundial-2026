import fs from 'fs';
import path from 'path';

const PLACEHOLDER_VALUES = new Set([
  '',
  'your_api_key_here',
  'your_token_here',
  'tu_clave_aqui',
  'xxx',
]);

/**
 * Loads KEY=VALUE pairs from a .env file into process.env.
 * Handles UTF-8 BOM and Windows CRLF line endings.
 */
export function loadEnvFile(envPath) {
  const result = { loaded: false, path: envPath, keys: [] };

  if (!fs.existsSync(envPath)) {
    return result;
  }

  let content = fs.readFileSync(envPath, 'utf8');
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) return;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
    result.keys.push(key);
  });

  result.loaded = result.keys.length > 0;
  return result;
}

export function getApiSportsKey() {
  const key = process.env.APISPORTS_KEY?.trim();
  if (!key || PLACEHOLDER_VALUES.has(key)) return null;
  return key;
}

export function getFootballDataToken() {
  const key = process.env.FOOTBALL_DATA_TOKEN?.trim();
  if (!key || PLACEHOLDER_VALUES.has(key)) return null;
  return key;
}

export function loadProjectEnv(dirname) {
  const envPath = path.join(dirname, '.env');
  const info = loadEnvFile(envPath);
  return { envPath, info, apiKey: getApiSportsKey(), footballDataToken: getFootballDataToken() };
}
