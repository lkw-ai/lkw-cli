/**
 * lkw client switch [profile] — change the active profile in ~/.lkw/config.json.
 * Profiles let you keep multiple environments side-by-side (default = prod,
 * staging, localhost, etc) without re-logging in.
 *
 *   lkw client switch             # list + interactive prompt
 *   lkw client switch staging     # direct switch (errors if missing)
 *   lkw client switch -l          # just list
 *   lkw client switch --add NAME --url URL   # add new profile (no token; do `auth login` after)
 */
import { Command } from 'commander';
import prompts from 'prompts';
import { readConfig, writeConfig, type Profile } from '../../config.js';
import { colors, die, symbols } from '../../ui.js';

export function clientSwitchCommand(): Command {
  return new Command('switch')
    .description('List, add, or switch between LKW CLI profiles (~/.lkw/config.json)')
    .argument('[profile]', 'profile to switch to (omit for interactive)')
    .option('-l, --list', 'just list profiles')
    .option('--add <name>', 'create a new profile')
    .option('--url <url>', 'API base URL for the new profile')
    .action(async (profile: string | undefined, opts: { list?: boolean; add?: string; url?: string }) => {
      const cfg = readConfig();

      if (opts.add) {
        if (!opts.url) die('--url is required when adding a profile');
        cfg.profiles[opts.add] = { apiBaseUrl: opts.url! } as Profile;
        cfg.activeProfile = opts.add;
        writeConfig(cfg);
        console.log(`${symbols.success} added profile ${colors.bold(opts.add)} and set as active`);
        console.log(colors.dim(`Run \`lkw auth login\` to authenticate.`));
        return;
      }

      const list = () => {
        const names = Object.keys(cfg.profiles);
        for (const name of names) {
          const p = cfg.profiles[name];
          const mark = name === cfg.activeProfile ? colors.success('●') : colors.dim('○');
          const tokenInfo = p.token ? colors.dim(`(authed as ${p.email ?? '?'})`) : colors.warn('(no token)');
          console.log(`  ${mark} ${colors.bold(name.padEnd(15))} ${colors.dim(p.apiBaseUrl)} ${tokenInfo}`);
        }
      };

      if (opts.list) { list(); return; }

      if (!profile) {
        list();
        const r = await prompts({
          type: 'select',
          name: 'p',
          message: 'Switch to which profile?',
          choices: Object.keys(cfg.profiles).map((p) => ({ title: p, value: p })),
          initial: Object.keys(cfg.profiles).indexOf(cfg.activeProfile),
        });
        profile = r.p;
      }

      if (!profile || !cfg.profiles[profile]) die(`profile "${profile}" not found`);
      cfg.activeProfile = profile;
      writeConfig(cfg);
      console.log(`${symbols.success} active profile: ${colors.bold(profile)}`);
    });
}
