/**
 * lkw workflow diff <id> <file> — compares a local workflow JSON against
 * what's in prod. Useful before `import` to know exactly what will change.
 */
import fs from 'node:fs/promises';
import { Command } from 'commander';
import { makeClient } from '../../client.js';
import { colors, die, symbols } from '../../ui.js';

interface MinWf {
  name?: string;
  description?: string;
  status?: string;
  nodes?: Array<{ id: string; data?: { type?: string; label?: string } }>;
  edges?: Array<{ id?: string; source: string; target: string }>;
}

export function workflowDiffCommand(): Command {
  return new Command('diff')
    .description('Compare a local workflow JSON with the one in prod (no changes made)')
    .argument('<id>', 'workflow ID in prod')
    .argument('<file>', 'local workflow JSON')
    .action(async (id: string, file: string) => {
      const lkw = makeClient();

      let local: MinWf;
      try { local = JSON.parse(await fs.readFile(file, 'utf-8')); }
      catch (e) { die(`cannot read ${file}: ${(e as Error).message}`); }

      let remote: any;
      try { remote = await lkw.workflows.get(id); }
      catch (e) { die((e as Error).message); }

      const diffs: string[] = [];

      const fields: Array<keyof MinWf> = ['name', 'description', 'status'];
      for (const f of fields) {
        if (local[f] !== undefined && local[f] !== (remote as any)[f]) {
          diffs.push(`${colors.bold(String(f))}: ${colors.error(String((remote as any)[f] ?? ''))} → ${colors.success(String(local[f] ?? ''))}`);
        }
      }

      const localNodeIds = new Set<string>((local.nodes ?? []).map((n) => n.id));
      const remoteNodeIds = new Set<string>((remote.nodes ?? []).map((n: any) => n.id));
      const added = [...localNodeIds].filter((id) => !remoteNodeIds.has(id));
      const removed = [...remoteNodeIds].filter((id) => !localNodeIds.has(id));

      console.log(colors.bold(`Workflow ${id.slice(0, 8)}…`));
      console.log(`  local : ${local.nodes?.length ?? 0} nodes, ${local.edges?.length ?? 0} edges`);
      console.log(`  remote: ${remote.nodes?.length ?? 0} nodes, ${remote.edges?.length ?? 0} edges`);

      if (added.length) {
        console.log(colors.success(`\n+ ${added.length} added nodes:`));
        for (const id of added) {
          const n = (local.nodes ?? []).find((x) => x.id === id);
          console.log(`  ${colors.success('+')} ${id} (${n?.data?.type}) ${n?.data?.label ?? ''}`);
        }
      }
      if (removed.length) {
        console.log(colors.error(`\n- ${removed.length} removed nodes:`));
        for (const id of removed) {
          const n = (remote.nodes ?? []).find((x: any) => x.id === id);
          console.log(`  ${colors.error('-')} ${id} (${n?.data?.type}) ${n?.data?.label ?? ''}`);
        }
      }

      // Modified
      const modified: string[] = [];
      for (const id of localNodeIds) {
        if (!remoteNodeIds.has(id)) continue;
        const l = (local.nodes ?? []).find((x) => x.id === id);
        const r = (remote.nodes ?? []).find((x: any) => x.id === id);
        if (JSON.stringify(l) !== JSON.stringify(r)) modified.push(id);
      }
      if (modified.length) {
        console.log(colors.warn(`\n~ ${modified.length} modified nodes:`));
        for (const id of modified) {
          const l = (local.nodes ?? []).find((x) => x.id === id);
          console.log(`  ${colors.warn('~')} ${id} (${l?.data?.type}) ${l?.data?.label ?? ''}`);
        }
      }

      if (diffs.length) {
        console.log(colors.bold('\nField changes:'));
        for (const d of diffs) console.log(`  ${d}`);
      }

      if (!added.length && !removed.length && !modified.length && !diffs.length) {
        console.log(`\n${symbols.success} ${colors.success('No differences')}`);
      } else {
        console.log(`\n${symbols.warn} ${colors.warn('Differences found — review before `lkw workflow import`')}`);
      }
    });
}
