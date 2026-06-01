/**
 * On-disk config at ~/.lkw/config.json — stores the active API URL and
 * bearer token between CLI invocations.
 *
 * Format:
 *   {
 *     "profiles": {
 *       "default": { "apiBaseUrl": "https://api.lkw.digital", "token": "eyJ..." },
 *       "staging":  { ... }
 *     },
 *     "activeProfile": "default"
 *   }
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CONFIG_DIR = path.join(os.homedir(), '.lkw');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

export interface Profile {
  apiBaseUrl: string;
  token?: string;
  email?: string;
}

export interface ConfigFile {
  profiles: Record<string, Profile>;
  activeProfile: string;
}

const EMPTY: ConfigFile = {
  profiles: { default: { apiBaseUrl: 'https://api.lkw.digital' } },
  activeProfile: 'default',
};

export function readConfig(): ConfigFile {
  if (!fs.existsSync(CONFIG_PATH)) return { ...EMPTY };
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as ConfigFile;
    if (!parsed.profiles || !parsed.activeProfile) return { ...EMPTY };
    return parsed;
  } catch {
    return { ...EMPTY };
  }
}

export function writeConfig(cfg: ConfigFile): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n', { mode: 0o600 });
}

export function getActiveProfile(): Profile {
  const cfg = readConfig();
  const profile = cfg.profiles[cfg.activeProfile];
  if (!profile) throw new Error(`Active profile "${cfg.activeProfile}" not found in ~/.lkw/config.json`);
  return profile;
}

export function updateActiveProfile(updates: Partial<Profile>): void {
  const cfg = readConfig();
  const name = cfg.activeProfile;
  cfg.profiles[name] = { ...(cfg.profiles[name] ?? { apiBaseUrl: 'https://api.lkw.digital' }), ...updates };
  writeConfig(cfg);
}

export function setActiveProfile(name: string, profile: Profile): void {
  const cfg = readConfig();
  cfg.profiles[name] = profile;
  cfg.activeProfile = name;
  writeConfig(cfg);
}

export const CONFIG_FILE_PATH = CONFIG_PATH;
