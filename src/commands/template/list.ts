/**
 * lkw template list — list workflow templates available to clone into a
 * project. `lkw template use` actually clones.
 */
import { Command } from 'commander';
import { makeClient } from '../../client.js';
import { die, table, colors } from '../../ui.js';

export function templateListCommand(): Command {
  return new Command('list')
    .description('List workflow templates')
    .option('--json', 'output JSON')
    .action(async (opts: { json?: boolean }) => {
      try {
        const lkw = makeClient();
        const templates = await lkw.workflows.listTemplates();
        if (opts.json) {
          console.log(JSON.stringify(templates, null, 2));
          return;
        }
        if (templates.length === 0) {
          console.log(colors.dim('No templates found.'));
          return;
        }
        table(templates.map((t) => ({
          id: t.id.slice(0, 8) + '…',
          name: t.name,
          status: t.status,
          nodes: Array.isArray(t.nodes) ? t.nodes.length : 0,
        })));
      } catch (err) {
        die((err as Error).message);
      }
    });
}
