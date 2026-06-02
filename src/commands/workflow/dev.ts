/**
 * lkw workflow dev <file> <workflowId> --key <apiKey>
 *
 * Hot-reload mode: watches a local JSON file, automatically pushes any
 * change to LKW via PUT, then triggers the workflow with the local
 * payload, streaming logs. Perfect for iterating on a workflow with
 * `node` / editor in one terminal and tail in another.
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { Command } from 'commander';
import { makeClient } from '../../client.js';
import { colors, die, symbols } from '../../ui.js';

export function workflowDevCommand(): Command {
  return new Command('dev')
    .description('Watch a local workflow JSON, auto-PUT on change, optionally trigger + tail')
    .argument('<file>', 'local workflow JSON to watch')
    .argument('<workflowId>', 'workflow ID in LKW to update')
    .option('--key <apiKey>', 'API key to also trigger after each push')
    .option('--payload <file>', 'JSON file with trigger payload')
    .option('--no-tail', 'do not stream logs after trigger')
    .action(async (file: string, workflowId: string, opts: { key?: string; payload?: string; tail?: boolean }) => {
      const lkw = makeClient();
      const abs = path.resolve(process.cwd(), file);
      console.log(colors.cyan(`Watching ${abs}`));
      console.log(colors.dim('Press Ctrl-C to stop'));

      const push = async () => {
        try {
          const raw = await fsp.readFile(abs, 'utf-8');
          const wf = JSON.parse(raw);
          console.log(`${colors.dim(new Date().toLocaleTimeString())} ${colors.cyan('→ push')} ${workflowId.slice(0, 8)}…`);
          await lkw.workflows.update(workflowId, {
            name: wf.name,
            description: wf.description,
            nodes: wf.nodes,
            edges: wf.edges,
          });
          console.log(`  ${symbols.success} updated`);
          if (opts.key) {
            const payload = opts.payload
              ? JSON.parse(await fsp.readFile(opts.payload, 'utf-8'))
              : {};
            console.log(`  ${colors.cyan('→ trigger')}`);
            const result = await lkw.workflows.trigger(workflowId, opts.key, payload);
            const status = result.success ? symbols.success : symbols.error;
            console.log(`  ${status} result: success=${result.success}`);
            if (opts.tail !== false && result.executionId) {
              console.log(colors.dim(`  ────────── logs ──────────`));
              for await (const log of lkw.executions.tailLogs(result.executionId, { intervalMs: 500 })) {
                console.log(`  ${colors.dim(log.createdAt?.slice(11, 19) ?? '')} [${log.level}] ${log.nodeId ? `node:${log.nodeId} ` : ''}${log.message}`);
              }
            }
          }
        } catch (e) {
          console.error(`  ${symbols.error} ${colors.error((e as Error).message)}`);
        }
      };

      await push();

      let timer: NodeJS.Timeout | null = null;
      fs.watch(abs, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(push, 300); // debounce
      });

      // Keep alive
      await new Promise(() => {});
    });
}
