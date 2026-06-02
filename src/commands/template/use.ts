/**
 * lkw template use <templateId> <projectId> [--name "new name"] — clones
 * a template's nodes/edges into a fresh workflow in the given project.
 */
import { Command } from 'commander';
import { makeClient } from '../../client.js';
import { colors, die, symbols, spinner } from '../../ui.js';

export function templateUseCommand(): Command {
  return new Command('use')
    .description('Clone a template into a project as a new DRAFT workflow')
    .argument('<templateId>', 'template workflow ID')
    .argument('<projectId>', 'destination project ID')
    .option('--name <name>', 'override name on the new workflow')
    .action(async (templateId: string, projectId: string, opts: { name?: string }) => {
      const sp = spinner('Cloning template...').start();
      try {
        const lkw = makeClient();
        const tpl = await lkw.workflows.get(templateId);
        const created = await lkw.workflows.create(projectId, {
          name: opts.name ?? `${tpl.name} (cópia)`,
          description: tpl.description,
          nodes: tpl.nodes,
          edges: tpl.edges,
        });
        sp.stop();
        console.log(`${symbols.success} cloned template ${colors.bold(tpl.name)} → workflow ${colors.bold(created.id)}`);
        console.log(colors.dim(`  status=${created.status} (promote to ACTIVE when ready)`));
      } catch (err) {
        sp.fail();
        die((err as Error).message);
      }
    });
}
