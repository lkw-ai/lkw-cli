/**
 * lkw client doctor — sanity-check the local CLI config + connectivity.
 * Useful before saying "the CLI is broken"; covers the 90% of issues
 * (wrong API URL, expired token, etc).
 */
import { Command } from 'commander';
import { makeClient } from '../../client.js';
import { getActiveProfile, readConfig } from '../../config.js';
import { colors, symbols } from '../../ui.js';

interface Check {
  label: string;
  fn: () => Promise<{ ok: boolean; detail?: string }>;
}

export function clientDoctorCommand(): Command {
  return new Command('doctor')
    .description('Diagnose connectivity, auth, and config')
    .action(async () => {
      const cfg = readConfig();
      const profile = cfg.profiles[cfg.activeProfile] ?? { apiBaseUrl: '' };
      const checks: Check[] = [
        {
          label: 'Active profile',
          fn: async () => ({ ok: !!profile.apiBaseUrl, detail: `${cfg.activeProfile} (apiBaseUrl=${profile.apiBaseUrl || '<unset>'})` }),
        },
        {
          label: 'Token present',
          fn: async () => ({ ok: !!profile.token, detail: profile.token ? `length=${profile.token.length}` : 'run `lkw auth login`' }),
        },
        {
          label: 'API reachable',
          fn: async () => {
            try {
              const r = await fetch(`${profile.apiBaseUrl}/health`);
              return { ok: r.ok, detail: `GET /health → ${r.status}` };
            } catch (e) {
              return { ok: false, detail: (e as Error).message };
            }
          },
        },
        {
          label: 'Auth works (workflows reachable)',
          fn: async () => {
            try {
              const lkw = makeClient();
              // Light call that requires auth — list templates is short
              const t = await lkw.workflows.listTemplates();
              return { ok: true, detail: `${t.length} template(s) returned` };
            } catch (e) {
              return { ok: false, detail: (e as Error).message };
            }
          },
        },
      ];

      console.log(colors.bold('LKW Doctor'));
      console.log(colors.dim('─'.repeat(72)));
      let fail = 0;
      for (const c of checks) {
        const r = await c.fn();
        const symbol = r.ok ? symbols.success : symbols.error;
        const colored = r.ok ? colors.success : colors.error;
        console.log(`${symbol} ${c.label.padEnd(28)} ${colored(r.detail ?? '')}`);
        if (!r.ok) fail++;
      }
      console.log(colors.dim('─'.repeat(72)));
      if (fail === 0) {
        console.log(`${symbols.success} ${colors.success('All checks passed')}`);
      } else {
        console.log(`${symbols.error} ${colors.error(`${fail} check(s) failed`)}`);
        process.exit(1);
      }
    });
}
