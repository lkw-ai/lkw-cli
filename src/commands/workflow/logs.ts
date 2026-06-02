/**
 * lkw workflow logs <executionId> — fetches all logs for an execution
 * (no streaming — see `watch` for that). Handy after the fact.
 */
import { Command } from 'commander';
import { makeClient } from '../../client.js';
import { colors, die } from '../../ui.js';

const LEVEL_COLOR: Record<string, (s: string) => string> = {
  error: colors.error,
  warn: colors.warn,
  info: colors.cyan,
  debug: colors.dim,
};

export function workflowLogsCommand(): Command {
  return new Command('logs')
    .description('Fetch logs of a finished execution (use `watch` for live)')
    .argument('<executionId>', 'execution ID')
    .option('--json', 'output JSON instead of formatted text')
    .action(async (executionId: string, opts: { json?: boolean }) => {
      try {
        const lkw = makeClient();
        const [exec, logs] = await Promise.all([
          lkw.executions.get(executionId),
          lkw.executions.logs(executionId),
        ]);
        if (opts.json) {
          console.log(JSON.stringify({ execution: exec, logs }, null, 2));
          return;
        }
        console.log(`${colors.bold('Execution')} ${executionId} ${colors.dim('·')} status=${colors.bold(exec.status)} workflow=${exec.workflowId.slice(0, 8)}…`);
        if (exec.error) console.log(colors.error(`error: ${exec.error}`));
        console.log(colors.dim('─'.repeat(72)));
        for (const log of logs) {
          const colorize = LEVEL_COLOR[log.level] ?? ((s: string) => s);
          const ts = log.createdAt?.slice(11, 19) ?? '';
          const node = log.nodeId ? colors.cyan(`[node:${log.nodeId}] `) : '';
          console.log(`${colors.dim(ts)} ${colorize(log.level.toUpperCase().padEnd(5))} ${node}${log.message}`);
        }
      } catch (err) {
        die((err as Error).message);
      }
    });
}
