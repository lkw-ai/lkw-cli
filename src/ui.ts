/**
 * Tiny console helpers used by every command. Keeps chalk/ora imports in
 * one place so command files stay clean.
 */
import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import prompts from 'prompts';

export const colors = {
  success: chalk.green,
  warn: chalk.yellow,
  error: chalk.red,
  dim: chalk.dim,
  bold: chalk.bold,
  cyan: chalk.cyan,
};

export const symbols = {
  success: chalk.green('✔'),
  warn: chalk.yellow('!'),
  error: chalk.red('✗'),
  info: chalk.cyan('ℹ'),
};

export function spinner(text: string): Ora {
  return ora({ text, color: 'cyan' });
}

/**
 * Centralized exit. Optionally adds a helpful hint after the error.
 * Examples:
 *   die('CEP inválido', { hint: 'must be 8 digits' })
 *   die('cannot reach API', { hint: 'try `lkw client doctor`', status: 2 })
 */
export function die(message: string, opts: { status?: number; hint?: string } = {}): never {
  console.error(`${symbols.error} ${message}`);
  if (opts.hint) console.error(colors.dim(`  💡 ${opts.hint}`));
  process.exit(opts.status ?? 1);
}

export function table(rows: Array<Record<string, unknown>>): void {
  if (rows.length === 0) {
    console.log(colors.dim('(no results)'));
    return;
  }
  // Native console.table works well enough for the typical CLI table sizes.
  // eslint-disable-next-line no-console
  console.table(rows);
}

/**
 * Interactive yes/no confirmation. Returns true when the user confirms,
 * false on cancel or "no". Bypassed if process.env.LKW_YES=true (CI).
 *
 * Use before destructive operations:
 *   if (!(await confirm(`Delete workflow ${id}?`))) return;
 */
export async function confirm(message: string, defaultYes = false): Promise<boolean> {
  if (process.env.LKW_YES === 'true') return true;
  if (!process.stdin.isTTY) return defaultYes; // non-interactive (pipe) → use default
  const r = await prompts({ type: 'confirm', name: 'ok', message, initial: defaultYes });
  return r.ok === true;
}

/** Global verbose flag — set once from --verbose, read elsewhere. */
let verboseMode = false;
export function setVerbose(v: boolean) { verboseMode = v; }
export function isVerbose(): boolean { return verboseMode || process.env.LKW_VERBOSE === 'true'; }

/** Verbose-only log. Use to dump request/response, paths, decisions. */
export function vlog(...args: unknown[]): void {
  if (isVerbose()) console.error(colors.dim('[verbose]'), ...args);
}
