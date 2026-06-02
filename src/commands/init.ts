/**
 * lkw init — interactive first-run setup.
 *
 * Replaces the multi-step `lkw auth login --api ... --email ... --password
 * ...` with a single guided flow. Asks for API URL, profile name,
 * credentials, validates by hitting /health and /auth/login, persists
 * to ~/.lkw/config.json.
 *
 * Re-runnable: if config already exists, asks before overwriting.
 */
import { Command } from 'commander';
import prompts from 'prompts';
import { readConfig, writeConfig, type Profile } from '../config.js';
import { LkwClient } from '@lkw-ai/sdk';
import { colors, die, symbols, spinner } from '../ui.js';

const PRESETS = [
  { title: 'LKW Cloud (https://api.lkw.digital)', value: 'https://api.lkw.digital' },
  { title: 'Local self-hosted (http://localhost:3001)', value: 'http://localhost:3001' },
  { title: 'Custom (you type the URL)', value: '__custom__' },
];

export function initCommand(): Command {
  return new Command('init')
    .description('Interactive first-run setup — config + auth in one step')
    .option('--api <url>', 'skip prompt and use this API base URL')
    .option('--profile <name>', 'profile name (default "default")')
    .action(async (opts: { api?: string; profile?: string }) => {
      const cfg = readConfig();

      // Profile name
      let profileName = opts.profile;
      if (!profileName) {
        const def = Object.keys(cfg.profiles).length === 0 ? 'default' : 'staging';
        const r = await prompts({ type: 'text', name: 'p', message: 'Profile name', initial: def, validate: (v) => v.trim().length > 0 || 'required' });
        if (!r.p) die('cancelled');
        profileName = r.p.trim();
      }

      const pname = profileName!;
      if (cfg.profiles[pname]?.token) {
        const r = await prompts({ type: 'confirm', name: 'ok', message: `Profile "${pname}" already has a token. Overwrite?`, initial: false });
        if (!r.ok) die('cancelled');
      }

      // API URL
      let apiUrl = opts.api;
      if (!apiUrl) {
        const r = await prompts({ type: 'select', name: 'preset', message: 'Which LKW instance?', choices: PRESETS, initial: 0 });
        apiUrl = r.preset;
        if (apiUrl === '__custom__') {
          const r2 = await prompts({ type: 'text', name: 'u', message: 'API base URL', validate: (v) => /^https?:\/\//.test(v) || 'must start with http(s)://' });
          if (!r2.u) die('cancelled');
          apiUrl = r2.u;
        }
      }

      // Health check
      const sp = spinner(`Pinging ${apiUrl}...`).start();
      try {
        const r = await fetch(`${apiUrl}/health`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        sp.succeed(`Reached ${apiUrl}`);
      } catch (e) {
        sp.fail();
        die(`Cannot reach ${apiUrl}: ${(e as Error).message}\n   Check the URL and your network.`);
      }

      // Credentials
      const creds = await prompts([
        { type: 'text', name: 'email', message: 'Email', validate: (v) => /.+@.+\..+/.test(v) || 'invalid email' },
        { type: 'password', name: 'password', message: 'Password', validate: (v) => v.length >= 8 || 'min 8 chars' },
      ]);
      if (!creds.email || !creds.password) die('cancelled');

      const sp2 = spinner('Authenticating...').start();
      try {
        const sdk = new LkwClient({ apiBaseUrl: apiUrl! });
        const res = await sdk.auth.login({ email: creds.email, password: creds.password });
        sp2.succeed(`Authenticated as ${colors.bold(res.user.email)} (${res.user.role})`);

        // Persist
        const profile: Profile = { apiBaseUrl: apiUrl!, token: res.accessToken, email: res.user.email };
        cfg.profiles[pname] = profile;
        cfg.activeProfile = pname;
        writeConfig(cfg);

        console.log('');
        console.log(`${symbols.success} Profile ${colors.bold(pname)} saved as active.`);
        console.log(colors.dim('   Try: lkw whoami · lkw project list · lkw workflow list <projectId>'));
        console.log(colors.dim('   Switch profiles: lkw client switch'));
      } catch (e: any) {
        sp2.fail();
        die(`Login failed: ${e.message}\n   Double-check credentials or run \`lkw client doctor\` for diagnostics.`);
      }
    });
}
