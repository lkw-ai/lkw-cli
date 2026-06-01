/**
 * Tiny console helpers used by every command. Keeps chalk/ora imports in
 * one place so command files stay clean.
 */
import chalk from 'chalk';
import ora, { type Ora } from 'ora';

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
};

export function spinner(text: string): Ora {
  return ora({ text, color: 'cyan' });
}

export function die(message: string, status = 1): never {
  console.error(`${symbols.error} ${message}`);
  process.exit(status);
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
