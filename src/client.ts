/**
 * Factory: builds an LkwClient configured from the active profile in
 * ~/.lkw/config.json. Wires telemetry into the global verbose channel
 * so `lkw -v <cmd>` prints request/response for debugging.
 */
import { LkwClient, LkwError, type RequestTelemetry } from '@lkw-ai/sdk';
import { getActiveProfile } from './config.js';
import { vlog, isVerbose, colors } from './ui.js';

const CLI_VERSION = '0.3.0';

export function makeClient(): LkwClient {
  const profile = getActiveProfile();
  return new LkwClient({
    apiBaseUrl: profile.apiBaseUrl,
    bearerToken: profile.token,
    userAgent: `@lkw-ai/cli/${CLI_VERSION}`,
    onRequest: (info: RequestTelemetry) => {
      if (!isVerbose()) return;
      const status = info.error ? colors.error(`${info.status}`) : colors.success(`${info.status}`);
      const retry = info.retried ? colors.warn(` (attempt ${info.attempt}${info.retried ? ', retry' : ''})`) : '';
      vlog(`${info.method} ${info.url} → ${status} ${info.durationMs}ms${retry}`);
      if (info.error) vlog(`  ${colors.error(String(info.error))}`);
    },
  });
}

/** Convenience: throw a friendly CLI error from a LkwError, with hints. */
export function friendlyError(err: unknown): string {
  if (err instanceof LkwError) {
    const hint = HINTS[err.category];
    return hint ? `${err.message}\n  💡 ${hint}` : err.message;
  }
  return (err as Error)?.message || String(err);
}

const HINTS: Partial<Record<string, string>> = {
  auth: 'token may have expired — run `lkw auth login` or `lkw client doctor`',
  rate_limit: 'server is throttling — wait a moment and retry',
  server: 'LKW server issue — retry; if persistent, check api.lkw.digital status',
  network: 'connectivity issue — check VPN/firewall/DNS or run `lkw client doctor`',
  timeout: 'request timed out — try `--verbose` to see where, or bump timeout',
  client: 'request was rejected by the API — check your inputs',
};
