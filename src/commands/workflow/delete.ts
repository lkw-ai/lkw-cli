/**
 * lkw workflow delete <id> — destructive, asks confirmation unless --yes
 * or LKW_YES=true (CI).
 */
import { Command } from 'commander';
import { makeClient, friendlyError } from '../../client.js';
import { colors, confirm, die, symbols, spinner } from '../../ui.js';

export function workflowDeleteCommand(): Command {
  return new Command('delete')
    .description('Permanently delete a workflow (asks confirmation)')
    .argument('<id>', 'workflow ID')
    .option('-y, --yes', 'skip confirmation (CI-safe)')
    .action(async (id: string, opts: { yes?: boolean }) => {
      const lkw = makeClient();

      // Fetch first to show what we're about to delete
      let wfName = id;
      try {
        const w = await lkw.workflows.get(id);
        wfName = `"${w.name}" (${id})`;
      } catch (e) {
        die(friendlyError(e));
      }

      if (!opts.yes && !(await confirm(`Permanently delete workflow ${colors.bold(wfName)}? This cannot be undone.`, false))) {
        console.log(colors.dim('Cancelled.'));
        return;
      }

      const sp = spinner('Deleting...').start();
      try {
        await lkw.workflows.delete(id);
        sp.stop();
        console.log(`${symbols.success} Deleted ${wfName}`);
      } catch (e) {
        sp.fail();
        die(friendlyError(e));
      }
    });
}
