/**
 * lkw workflow validate <file> — local-only static check of a workflow
 * JSON before importing it. Catches the dumb mistakes (no trigger, dead
 * nodes, dangling edges, missing config fields) so import doesn't fail
 * on the backend with a less helpful error.
 */
import fs from 'node:fs/promises';
import { Command } from 'commander';
import { colors, die, symbols } from '../../ui.js';

interface NodeShape {
  id: string;
  type?: string;
  data?: { type?: string; label?: string; config?: Record<string, unknown> };
}
interface EdgeShape { id?: string; source: string; target: string; sourceHandle?: string }
interface WorkflowShape { name?: string; nodes?: NodeShape[]; edges?: EdgeShape[] }

const TRIGGER_TYPES = new Set(['http_trigger', 'webhook', 'schedule', 'amqp_trigger', 'rabbitmq', 'trigger']);
const REQUIRED_BY_TYPE: Record<string, string[]> = {
  api_call: ['url'],
  code: ['code'],
  llm: ['prompt'],
  condition: ['conditionField', 'conditionOperator'],
  switch: ['switchField', 'cases'],
  send_email: ['to', 'subject'],
  send_sms: ['to', 'message'],
  sub_workflow: ['workflowId'],
  amqp_publish: ['routingKey'],
};

export function workflowValidateCommand(): Command {
  return new Command('validate')
    .description('Statically validate a workflow JSON before import (no network)')
    .argument('<file>', 'path to workflow JSON')
    .option('--strict', 'fail on warnings, not just errors', false)
    .action(async (file: string, opts: { strict?: boolean }) => {
      let raw: string;
      try { raw = await fs.readFile(file, 'utf-8'); }
      catch (e) { die(`Cannot read ${file}: ${(e as Error).message}`); }
      let wf: WorkflowShape;
      try { wf = JSON.parse(raw); }
      catch (e) { die(`Invalid JSON in ${file}: ${(e as Error).message}`); }

      const errors: string[] = [];
      const warnings: string[] = [];

      const nodes = wf.nodes ?? [];
      const edges = wf.edges ?? [];

      if (!wf.name) errors.push('missing top-level `name`');
      if (nodes.length === 0) errors.push('no nodes');
      const triggers = nodes.filter((n) => TRIGGER_TYPES.has(n.data?.type ?? ''));
      if (triggers.length === 0) errors.push('no trigger node (http_trigger/schedule/etc)');

      // Duplicate IDs
      const seenIds = new Set<string>();
      for (const n of nodes) {
        if (!n.id) errors.push(`node without id (label=${n.data?.label})`);
        else if (seenIds.has(n.id)) errors.push(`duplicate node id: ${n.id}`);
        else seenIds.add(n.id);
      }

      // Required config fields per type
      for (const node of nodes) {
        const t = node.data?.type;
        if (!t) { errors.push(`node ${node.id} missing data.type`); continue; }
        const required = REQUIRED_BY_TYPE[t] ?? [];
        for (const k of required) {
          if (node.data?.config?.[k] === undefined || node.data?.config?.[k] === '') {
            errors.push(`node ${node.id} (${t}) missing required config.${k}`);
          }
        }
      }

      // Edge validity
      for (const e of edges) {
        if (!seenIds.has(e.source)) errors.push(`edge points to unknown source ${e.source}`);
        if (!seenIds.has(e.target)) errors.push(`edge points to unknown target ${e.target}`);
      }

      // Disconnected nodes (no in + no out, except triggers)
      const inDegree = new Map<string, number>();
      const outDegree = new Map<string, number>();
      for (const e of edges) {
        inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
        outDegree.set(e.source, (outDegree.get(e.source) ?? 0) + 1);
      }
      for (const node of nodes) {
        const isTrigger = TRIGGER_TYPES.has(node.data?.type ?? '');
        if (!isTrigger && (inDegree.get(node.id) ?? 0) === 0) {
          warnings.push(`node ${node.id} (${node.data?.type}) has no incoming edges`);
        }
      }

      // Output
      console.log(colors.bold(`Workflow: ${wf.name ?? '(unnamed)'}`));
      console.log(`  nodes: ${nodes.length}, edges: ${edges.length}, triggers: ${triggers.length}`);
      if (errors.length === 0 && warnings.length === 0) {
        console.log(`${symbols.success} ${colors.success('Valid — no issues found')}`);
        return;
      }
      for (const w of warnings) console.log(`${symbols.warn} ${colors.warn(w)}`);
      for (const e of errors) console.log(`${symbols.error} ${colors.error(e)}`);
      if (errors.length > 0 || (opts.strict && warnings.length > 0)) {
        process.exit(1);
      }
    });
}
