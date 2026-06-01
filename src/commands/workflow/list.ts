/**
 * lkw workflow list <projectId> — list workflows in a project.
 */
import { Command } from 'commander';
import { makeClient } from '../../client.js';
import { die, spinner, table } from '../../ui.js';

export function workflowListCommand(): Command {
  return new Command('list')
    .description('List workflows in a project')
    .argument('<projectId>', 'project ID')
    .option('--json', 'output JSON instead of a table')
    .action(async (projectId: string, opts: { json?: boolean }) => {
      const sp = spinner('Fetching workflows...').start();
      try {
        const lkw = makeClient();
        const workflows = await lkw.workflows.list(projectId);
        sp.stop();
        if (opts.json) {
          console.log(JSON.stringify(workflows, null, 2));
          return;
        }
        table(
          workflows.map((w) => ({
            id: w.id.slice(0, 8) + '…',
            name: w.name,
            status: w.status,
            nodes: Array.isArray(w.nodes) ? w.nodes.length : 0,
            updated: w.updatedAt.slice(0, 10),
          })),
        );
      } catch (err) {
        sp.fail();
        die((err as Error).message);
      }
    });
}
