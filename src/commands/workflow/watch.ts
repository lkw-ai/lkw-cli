/**
 * lkw workflow watch <executionId> — stream logs of a running execution
 * in real time. Subscribes via `executions.tailLogs()` (polling under
 * the hood) and prints each new log entry as it appears.
 */
import { Command } from 'commander';
import { makeClient } from '../../client.js';
import { colors, die, symbols } from '../../ui.js';

const LEVEL_COLOR: Record<string, (s: string) => string> = {
  error: colors.error,
  warn: colors.warn,
  info: colors.cyan,
  debug: colors.dim,
};

export function workflowWatchCommand(): Command {
  return new Command('watch')
    .description('Stream execution logs in real time (tail -f style)')
    .argument('<executionId>', 'execution ID returned by trigger/execute')
    .option('--interval <ms>', 'poll interval in ms', '1000')
    .option('--timeout <ms>', 'overall timeout in ms', '1800000')
    .action(async (executionId: string, opts: { interval: string; timeout: string }) => {
      const lkw = makeClient();
      const intervalMs = Number(opts.interval);
      const timeoutMs = Number(opts.timeout);
      console.log(colors.dim(`Watching execution ${executionId} (interval ${intervalMs}ms, timeout ${timeoutMs}ms)`));
      console.log(colors.dim('─'.repeat(72)));
      try {
        let last: Awaited<ReturnType<typeof lkw.executions.get>> | null = null;
        const iter = lkw.executions.tailLogs(executionId, { intervalMs, timeoutMs });
        let done = false;
        while (!done) {
          const next = await iter.next();
          if (next.done) {
            last = next.value;
            done = true;
            break;
          }
          const log = next.value;
          const colorize = LEVEL_COLOR[log.level] ?? ((s: string) => s);
          const ts = log.createdAt?.slice(11, 19) ?? '';
          const node = log.nodeId ? colors.cyan(`[node:${log.nodeId}] `) : '';
          console.log(`${colors.dim(ts)} ${colorize(log.level.toUpperCase().padEnd(5))} ${node}${log.message}`);
        }
        console.log(colors.dim('─'.repeat(72)));
        if (last) {
          const symbol = last.status === 'SUCCESS' ? symbols.success : last.status === 'FAILED' ? symbols.error : symbols.warn;
          console.log(`${symbol} Execution finished: ${colors.bold(last.status)}`);
          if (last.error) console.log(colors.error(`  error: ${last.error}`));
        }
      } catch (err) {
        die((err as Error).message);
      }
    });
}
