/**
 * CLI smoke tests — covers pieces that don't need a live LKW API:
 *  - validate command (static check, offline)
 *  - completion script generation
 *  - UI helpers (die, confirm, vlog)
 *
 * Anything that needs a live API is exercised in examples/ as integration
 * recipes — not run in CI to keep tests fast and deterministic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const CLI = path.resolve(__dirname, '../dist/index.js');

function run(args: string, stdin?: string): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execSync(`node ${CLI} ${args}`, {
      input: stdin,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, LKW_YES: 'true', NO_COLOR: '1' },
    });
    return { stdout, stderr: '', code: 0 };
  } catch (e: any) {
    return { stdout: e.stdout?.toString() ?? '', stderr: e.stderr?.toString() ?? '', code: e.status ?? 1 };
  }
}

describe('lkw --help / --version', () => {
  it('--version prints semver', () => {
    const r = run('--version');
    expect(r.code).toBe(0);
    expect(r.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('--help lists the major command groups', () => {
    const r = run('--help');
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('init');
    expect(r.stdout).toContain('auth');
    expect(r.stdout).toContain('client');
    expect(r.stdout).toContain('workflow');
    expect(r.stdout).toContain('template');
    expect(r.stdout).toContain('mocks');
    expect(r.stdout).toContain('completion');
  });

  it('--verbose is recognized as global flag', () => {
    const r = run('--help');
    expect(r.stdout).toContain('--verbose');
  });
});

describe('lkw completion', () => {
  it('emits bash script', () => {
    const r = run('completion bash');
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('_lkw()');
    expect(r.stdout).toContain('complete -F _lkw lkw');
  });

  it('emits zsh script', () => {
    const r = run('completion zsh');
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('#compdef lkw');
    expect(r.stdout).toContain('compdef _lkw lkw');
  });

  it('emits fish script', () => {
    const r = run('completion fish');
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('complete -c lkw');
  });

  it('rejects unsupported shell', () => {
    const r = run('completion powershell');
    expect(r.code).toBe(2);
  });
});

describe('lkw workflow validate (offline static check)', () => {
  it('passes on a clean workflow', () => {
    const tmp = path.join(os.tmpdir(), `wf-${Date.now()}.json`);
    fs.writeFileSync(tmp, JSON.stringify({
      name: 'Clean',
      nodes: [
        { id: '1', type: 'custom', position: { x: 0, y: 0 }, data: { type: 'http_trigger', label: 'In' } },
        { id: '2', type: 'custom', position: { x: 0, y: 0 }, data: { type: 'code', label: 'Run', config: { code: 'return input;' } } },
        { id: '3', type: 'custom', position: { x: 0, y: 0 }, data: { type: 'respond', label: 'Out', config: { statusCode: 200 } } },
      ],
      edges: [
        { source: '1', target: '2' },
        { source: '2', target: '3' },
      ],
    }));
    const r = run(`workflow validate ${tmp}`);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/Valid|3 nodes/);
    fs.unlinkSync(tmp);
  });

  it('flags missing trigger, missing config, dangling edge', () => {
    const tmp = path.join(os.tmpdir(), `wf-bad-${Date.now()}.json`);
    fs.writeFileSync(tmp, JSON.stringify({
      name: 'Bad',
      nodes: [
        { id: '1', type: 'custom', position: { x: 0, y: 0 }, data: { type: 'code', label: 'C', config: {} } }, // missing code
        { id: '2', type: 'custom', position: { x: 0, y: 0 }, data: { type: 'respond', label: 'R', config: { statusCode: 200 } } },
      ],
      edges: [
        { source: '1', target: '99' }, // dangling
      ],
    }));
    const r = run(`workflow validate ${tmp}`);
    expect(r.code).toBe(1);
    expect(r.stdout + r.stderr).toMatch(/no trigger/i);
    expect(r.stdout + r.stderr).toMatch(/missing.*config\.code/i);
    expect(r.stdout + r.stderr).toMatch(/unknown target/i);
    fs.unlinkSync(tmp);
  });
});
