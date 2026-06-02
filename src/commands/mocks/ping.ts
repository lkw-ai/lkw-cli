/**
 * lkw mocks ping [client] — hits the lkw-mocks service to verify it's up
 * and lists which client mock catalogs are available. Default base URL
 * is `https://lkw-mocks.vercel.app` but can be overridden.
 */
import { Command } from 'commander';
import { colors, die, symbols } from '../../ui.js';

const DEFAULT_BASE = 'https://lkw-mocks.vercel.app';

export function mocksPingCommand(): Command {
  return new Command('ping')
    .description('Ping the lkw-mocks service and list available client mocks')
    .argument('[client]', 'optional client name to test a known endpoint (e.g. arcom, hubio)')
    .option('--base <url>', 'override base URL', DEFAULT_BASE)
    .action(async (client: string | undefined, opts: { base: string }) => {
      const base = opts.base.replace(/\/$/, '');
      try {
        const health = await fetch(`${base}/health`);
        const healthBody = await health.json().catch(() => ({}));
        console.log(`${symbols.success} ${colors.bold('health')}: ${colors.success(String(healthBody.status ?? health.status))} ${colors.dim(`(${base}/health)`)}`);

        if (client) {
          const probes: Record<string, string> = {
            arcom: '/arcom/siga/cargas/pendentes-liberacao',
            hubio: '/hubio/risco/00000000000191',
          };
          const probe = probes[client] ?? `/${client}/`;
          const r = await fetch(`${base}${probe}`);
          const sym = r.ok ? symbols.success : symbols.error;
          console.log(`${sym} ${colors.bold(client)}: HTTP ${r.status} ${colors.dim(`(${base}${probe})`)}`);
          if (!r.ok) {
            const text = await r.text();
            console.log(colors.error(`  ${text.slice(0, 200)}`));
          }
        }
      } catch (e) {
        die((e as Error).message);
      }
    });
}
