/**
 * lkw auth login — interactive prompt for email/password, stores token in profile.
 *
 * Usage:
 *   lkw auth login
 *   lkw auth login --api https://api.staging.lkw.digital
 *   lkw auth login --email me@co.com --password "$LKW_PASSWORD"
 */
import prompts from 'prompts';
import { Command } from 'commander';
import { LkwClient } from '@lkw-ai/sdk';
import { readConfig, setActiveProfile } from '../../config.js';
import { colors, die, spinner, symbols } from '../../ui.js';

export function loginCommand(): Command {
  return new Command('login')
    .description('Authenticate with LKW and store the token in ~/.lkw/config.json')
    .option('--api <url>', 'API base URL', 'https://api.lkw.digital')
    .option('--email <email>', 'email address (otherwise prompted)')
    .option('--password <password>', 'password (otherwise prompted hidden)')
    .option('--profile <name>', 'profile name to save under', 'default')
    .action(async (opts: { api: string; email?: string; password?: string; profile: string }) => {
      const answers = await prompts(
        [
          opts.email ? null : { type: 'text', name: 'email', message: 'Email' },
          opts.password ? null : { type: 'password', name: 'password', message: 'Password' },
        ].filter((q) => q !== null) as prompts.PromptObject[],
        { onCancel: () => die('Cancelled') },
      );

      const email = opts.email ?? (answers.email as string);
      const password = opts.password ?? (answers.password as string);
      if (!email || !password) die('Email and password are required');

      const sp = spinner(`Logging in to ${opts.api}...`).start();
      try {
        const lkw = new LkwClient({ apiBaseUrl: opts.api });
        const { user, accessToken } = await lkw.auth.login({ email, password });
        setActiveProfile(opts.profile, { apiBaseUrl: opts.api, token: accessToken, email });
        sp.succeed(`${symbols.success} Logged in as ${colors.bold(user.email)} (${user.role}) — profile "${opts.profile}"`);
      } catch (err) {
        sp.fail();
        die((err as Error).message);
      }
    });
}

export function whoamiCommand(): Command {
  return new Command('whoami')
    .description('Show the active profile and authenticated user')
    .action(() => {
      const cfg = readConfig();
      const p = cfg.profiles[cfg.activeProfile];
      if (!p) die(`No profile "${cfg.activeProfile}" — run \`lkw auth login\``);
      console.log(`Active profile: ${colors.bold(cfg.activeProfile)}`);
      console.log(`API:            ${p.apiBaseUrl}`);
      console.log(`Email:          ${p.email ?? colors.dim('(unknown — login again to capture)')}`);
      console.log(`Token:          ${p.token ? colors.dim(p.token.slice(0, 24) + '…') : colors.warn('(not logged in)')}`);
    });
}

export function logoutCommand(): Command {
  return new Command('logout')
    .description('Revoke the active session server-side and clear the local token')
    .action(async () => {
      const cfg = readConfig();
      const profile = cfg.profiles[cfg.activeProfile];
      if (!profile?.token) {
        console.log(colors.dim('Nothing to log out of.'));
        return;
      }
      try {
        const lkw = new LkwClient({ apiBaseUrl: profile.apiBaseUrl, bearerToken: profile.token });
        await lkw.auth.logout();
      } catch {
        // ignore server-side errors — local cleanup runs regardless
      }
      profile.token = undefined;
      setActiveProfile(cfg.activeProfile, profile);
      console.log(`${symbols.success} Logged out of profile "${cfg.activeProfile}"`);
    });
}
