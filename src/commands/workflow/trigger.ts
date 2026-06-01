/**
 * lkw workflow trigger <id> --key <apiKey> [--data '{...}'] — fire a workflow
 * via its public HTTP trigger.
 */
import fs from 'node:fs';
import { Command } from 'commander';
import { LkwClient } from '@lkw-ai/sdk';
import { getActiveProfile } from '../../config.js';
import { colors, die, spinner } from '../../ui.js';

export function workflowTriggerCommand(): Command {
  return new Command('trigger')
    .description('Trigger a workflow via its public HTTP endpoint using an API key')
    .argument('<id>', 'workflow ID')
    .requiredOption('--key <apiKey>', 'workflow API key')
    .option('--data <json>', 'inline JSON payload')
    .option('--file <path>', 'read JSON payload from a file')
    .option('--json', 'output raw JSON instead of a summary')
    .action(async (id: string, opts: { key: string; data?: string; file?: string; json?: boolean }) => {
      let payload: unknown = {};
      if (opts.data && opts.file) die('Use --data OR --file, not both');
      if (opts.data) {
        try {
          payload = JSON.parse(opts.data);
        } catch {
          die('--data must be valid JSON');
        }
      } else if (opts.file) {
        if (!fs.existsSync(opts.file)) die(`File not found: ${opts.file}`);
        try {
          payload = JSON.parse(fs.readFileSync(opts.file, 'utf-8'));
        } catch {
          die(`Invalid JSON in ${opts.file}`);
        }
      }

      const sp = spinner('Triggering workflow...').start();
      try {
        const profile = getActiveProfile();
        const lkw = new LkwClient({ apiBaseUrl: profile.apiBaseUrl });
        const result = await lkw.workflows.trigger(id, opts.key, payload);
        sp.stop();
        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }
        console.log(
          `${result.success ? colors.success('✔') : colors.error('✗')} execution ${colors.bold(result.executionId)}`,
        );
        if (result.error) console.log(colors.error(`Error: ${result.error}`));
        if (result.output !== undefined) {
          console.log(colors.dim('--- output ---'));
          console.log(typeof result.output === 'string' ? result.output : JSON.stringify(result.output, null, 2));
        }
      } catch (err) {
        sp.fail();
        die((err as Error).message);
      }
    });
}
