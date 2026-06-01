/**
 * lkw workflow import <projectId> <file.json> — create a new workflow from a
 * JSON file (output of `lkw workflow export`).
 */
import fs from 'node:fs';
import { Command } from 'commander';
import { z } from 'zod';
import { makeClient } from '../../client.js';
import { colors, die, spinner, symbols } from '../../ui.js';

const ExportSchema = z.object({
  _lkwExport: z.literal(true),
  workflow: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    nodes: z.array(z.unknown()),
    edges: z.array(z.unknown()),
  }),
});

export function workflowImportCommand(): Command {
  return new Command('import')
    .description('Import a workflow from a JSON file into a project')
    .argument('<projectId>', 'destination project ID')
    .argument('<file>', 'path to exported workflow JSON')
    .option('--name <name>', 'override workflow name (otherwise uses name from file)')
    .action(async (projectId: string, file: string, opts: { name?: string }) => {
      if (!fs.existsSync(file)) die(`File not found: ${file}`);
      const raw = fs.readFileSync(file, 'utf-8');
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        die(`Invalid JSON in ${file}`);
      }
      const result = ExportSchema.safeParse(parsed);
      if (!result.success) {
        die(`Invalid LKW export format in ${file}:\n${JSON.stringify(result.error.format(), null, 2)}`);
      }
      const { workflow } = result.data;

      const sp = spinner('Importing workflow...').start();
      try {
        const lkw = makeClient();
        const created = await lkw.workflows.create(projectId, {
          name: opts.name ?? workflow.name,
          description: workflow.description,
          nodes: workflow.nodes,
          edges: workflow.edges,
        });
        sp.succeed(`${symbols.success} Created ${colors.bold(created.name)} (${created.id})`);
      } catch (err) {
        sp.fail();
        die((err as Error).message);
      }
    });
}
