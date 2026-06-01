/**
 * lkw project list — list projects accessible to the active user.
 */
import { Command } from 'commander';
import { makeClient } from '../../client.js';
import { die, spinner, table } from '../../ui.js';

export function projectListCommand(): Command {
  return new Command('list')
    .description('List projects accessible to the active user')
    .option('--json', 'output JSON instead of a table')
    .action(async (opts: { json?: boolean }) => {
      const sp = spinner('Fetching projects...').start();
      try {
        const lkw = makeClient();
        const projects = await lkw.projects.list();
        sp.stop();
        if (opts.json) {
          console.log(JSON.stringify(projects, null, 2));
          return;
        }
        table(
          projects.map((p) => ({
            id: p.id.slice(0, 8) + '…',
            name: p.name,
            updated: p.updatedAt.slice(0, 10),
          })),
        );
      } catch (err) {
        sp.fail();
        die((err as Error).message);
      }
    });
}
