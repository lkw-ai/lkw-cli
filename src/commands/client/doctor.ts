/**
 * lkw client doctor — comprehensive diagnostics.
 *
 * Walks through the layers (config → connectivity → auth → API surface
 * → permissions) and reports each one with a clear ✓/✗ and a hint when
 * something fails. Designed to be the first thing you run when "it's
 * broken" so you don't waste time bisecting.
 */
import os from 'node:os';
import { Command } from 'commander';
import { LkwClient, LkwError } from '@lkw-ai/sdk';
import { readConfig, CONFIG_FILE_PATH } from '../../config.js';
import { colors, symbols, vlog } from '../../ui.js';

interface CheckResult {
  ok: boolean;
  detail: string;
  hint?: string;
}
interface Check {
  label: string;
  category: 'config' | 'connectivity' | 'auth' | 'api' | 'env';
  fn: () => Promise<CheckResult>;
}

export function clientDoctorCommand(): Command {
  return new Command('doctor')
    .description('Comprehensive diagnostics — config / connectivity / auth / API / env')
    .option('--json', 'output JSON instead of formatted text', false)
    .action(async (opts: { json?: boolean }) => {
      const cfg = readConfig();
      const profile = cfg.profiles[cfg.activeProfile] ?? null;

      const checks: Check[] = [
        // ── Config layer ─────────────────────────────────────────
        {
          label: 'Config file',
          category: 'config',
          fn: async () => ({
            ok: !!profile,
            detail: profile ? `${CONFIG_FILE_PATH} (profile "${cfg.activeProfile}")` : `missing at ${CONFIG_FILE_PATH}`,
            hint: profile ? undefined : 'run `lkw init` for guided setup',
          }),
        },
        {
          label: 'API base URL',
          category: 'config',
          fn: async () => ({
            ok: !!profile?.apiBaseUrl,
            detail: profile?.apiBaseUrl || '<unset>',
            hint: profile?.apiBaseUrl ? undefined : 'set via `lkw init` or `lkw client switch --add ...`',
          }),
        },
        {
          label: 'Token present',
          category: 'config',
          fn: async () => ({
            ok: !!profile?.token,
            detail: profile?.token ? `${profile.token.length} chars (${(profile.email || '?')})` : '<no token>',
            hint: profile?.token ? undefined : 'run `lkw auth login`',
          }),
        },

        // ── Connectivity layer ────────────────────────────────────
        {
          label: 'API reachable (/health)',
          category: 'connectivity',
          fn: async () => {
            if (!profile?.apiBaseUrl) return { ok: false, detail: 'no API URL configured', hint: 'fix above first' };
            try {
              const r = await fetch(`${profile.apiBaseUrl}/health`);
              const body = await r.json().catch(() => ({}));
              return {
                ok: r.ok,
                detail: `HTTP ${r.status} · ${body.status ?? 'no status field'}`,
                hint: r.ok ? undefined : 'API is down or URL is wrong',
              };
            } catch (e) {
              return { ok: false, detail: (e as Error).message, hint: 'check firewall/VPN/DNS' };
            }
          },
        },

        // ── Auth layer ────────────────────────────────────────────
        {
          label: 'Token valid (workflows.listTemplates)',
          category: 'auth',
          fn: async () => {
            if (!profile?.apiBaseUrl || !profile?.token) return { ok: false, detail: 'skipped — config/token missing' };
            try {
              const sdk = new LkwClient({ apiBaseUrl: profile.apiBaseUrl, bearerToken: profile.token, retries: 0 });
              const tpls = await sdk.workflows.listTemplates();
              return { ok: true, detail: `${tpls.length} template(s) returned` };
            } catch (e) {
              if (e instanceof LkwError && e.category === 'auth') {
                return { ok: false, detail: `auth error (${e.status})`, hint: 'token expired — run `lkw auth login`' };
              }
              return { ok: false, detail: (e as Error).message, hint: 'unexpected — check API logs' };
            }
          },
        },

        // ── API surface ───────────────────────────────────────────
        {
          label: 'Projects accessible',
          category: 'api',
          fn: async () => {
            if (!profile?.apiBaseUrl || !profile?.token) return { ok: false, detail: 'skipped' };
            try {
              const sdk = new LkwClient({ apiBaseUrl: profile.apiBaseUrl, bearerToken: profile.token, retries: 0 });
              const ps = await sdk.projects.list();
              return { ok: true, detail: `${ps.length} project(s)` };
            } catch (e) {
              return { ok: false, detail: (e as Error).message };
            }
          },
        },
        {
          label: 'Organizations accessible',
          category: 'api',
          fn: async () => {
            if (!profile?.apiBaseUrl || !profile?.token) return { ok: false, detail: 'skipped' };
            try {
              const sdk = new LkwClient({ apiBaseUrl: profile.apiBaseUrl, bearerToken: profile.token, retries: 0 });
              const os = await sdk.organizations.list();
              return { ok: true, detail: `${os.length} org(s)` };
            } catch (e) {
              return { ok: false, detail: (e as Error).message };
            }
          },
        },

        // ── Env ────────────────────────────────────────────────────
        {
          label: 'Node.js >= 18',
          category: 'env',
          fn: async () => {
            const major = Number(process.versions.node.split('.')[0]);
            return {
              ok: major >= 18,
              detail: `node ${process.versions.node} (${process.platform} ${os.arch()})`,
              hint: major >= 18 ? undefined : 'upgrade Node.js to 18+ — `fetch` is required',
            };
          },
        },
        {
          label: 'All profiles',
          category: 'env',
          fn: async () => {
            const names = Object.keys(cfg.profiles);
            return {
              ok: names.length > 0,
              detail: names.map((n) => (n === cfg.activeProfile ? `*${n}` : n)).join(', ') || '<empty>',
            };
          },
        },
      ];

      if (opts.json) {
        const results = await Promise.all(checks.map(async (c) => ({ ...c, result: await c.fn() })));
        console.log(JSON.stringify({
          version: '1.0',
          activeProfile: cfg.activeProfile,
          configPath: CONFIG_FILE_PATH,
          checks: results.map((r) => ({ label: r.label, category: r.category, ok: r.result.ok, detail: r.result.detail, hint: r.result.hint })),
        }, null, 2));
        const fails = results.filter((r) => !r.result.ok).length;
        process.exit(fails === 0 ? 0 : 1);
      }

      console.log(colors.bold('LKW Doctor'));
      console.log(colors.dim('─'.repeat(72)));
      let fail = 0;
      let lastCategory = '';
      for (const c of checks) {
        if (c.category !== lastCategory) {
          console.log(colors.dim(`\n${c.category.toUpperCase()}`));
          lastCategory = c.category;
        }
        vlog(`running: ${c.label}`);
        const r = await c.fn();
        const symbol = r.ok ? symbols.success : symbols.error;
        const colored = r.ok ? colors.success : colors.error;
        console.log(`  ${symbol} ${c.label.padEnd(40)} ${colored(r.detail)}`);
        if (!r.ok) {
          fail++;
          if (r.hint) console.log(`     ${colors.dim('💡 ' + r.hint)}`);
        }
      }
      console.log(colors.dim('\n' + '─'.repeat(72)));
      if (fail === 0) {
        console.log(`${symbols.success} ${colors.success('All checks passed')}`);
      } else {
        console.log(`${symbols.error} ${colors.error(`${fail} check(s) failed`)}`);
        process.exit(1);
      }
    });
}
