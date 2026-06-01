/**
 * lkw workflow export <id> [-o file.json] — dump a workflow as JSON.
 */
import fs from 'node:fs';
import { Command } from 'commander';
import { makeClient } from '../../client.js';
import { colors, die, spinner, symbols } from '../../ui.js';

export function workflowExportCommand(): Command {
  return new Command('export')
    .description('Export a workflow as JSON')
    .argument('<id>', 'workflow ID')
    .option('-o, --out <path>', 'write to file (default: stdout)')
    .action(async (id: string, opts: { out?: string }) => {
      const sp = spinner('Fetching workflow...').start();
      try {
        const lkw = makeClient();
        const wf = await lkw.workflows.get(id);
        sp.stop();
        const payload = {
          _lkwExport: true,
          version: '1.0',
          exportedAt: new Date().toISOString(),
          workflow: { name: wf.name, description: wf.description, nodes: wf.nodes, edges: wf.edges },
        };
        const json = JSON.stringify(payload, null, 2);
        if (opts.out) {
          fs.writeFileSync(opts.out, json + '\n');
          console.log(`${symbols.success} Wrote ${colors.bold(opts.out)} (${json.length} bytes)`);
        } else {
          process.stdout.write(json + '\n');
        }
      } catch (err) {
        sp.fail();
        die((err as Error).message);
      }
    });
}
