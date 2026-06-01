#!/usr/bin/env node
/**
 * lkw — command-line interface for the LKW low-code workflow platform.
 *
 *   lkw auth login
 *   lkw whoami / lkw auth logout
 *   lkw client init <name>
 *   lkw project list
 *   lkw workflow list <projectId>
 *   lkw workflow export <id> [-o file.json]
 *   lkw workflow import <projectId> <file.json>
 *   lkw workflow trigger <id> --key <apiKey> [--data '{...}' | --file payload.json]
 */
import { Command } from 'commander';

import { loginCommand, logoutCommand, whoamiCommand } from './commands/auth/login.js';
import { clientInitCommand } from './commands/client/init.js';
import { projectListCommand } from './commands/project/list.js';
import { workflowListCommand } from './commands/workflow/list.js';
import { workflowExportCommand } from './commands/workflow/export.js';
import { workflowImportCommand } from './commands/workflow/import.js';
import { workflowTriggerCommand } from './commands/workflow/trigger.js';

const program = new Command()
  .name('lkw')
  .description('Command-line interface for the LKW low-code workflow platform')
  .version('0.1.0');

const auth = new Command('auth').description('Authentication: login, logout, session info');
auth.addCommand(loginCommand());
auth.addCommand(logoutCommand());
program.addCommand(auth);
program.addCommand(whoamiCommand()); // shortcut: `lkw whoami`

const client = new Command('client').description('Client / organization lifecycle');
client.addCommand(clientInitCommand());
program.addCommand(client);

const project = new Command('project').description('Projects');
project.addCommand(projectListCommand());
program.addCommand(project);

const workflow = new Command('workflow').description('Workflow CRUD + execution + import/export');
workflow.addCommand(workflowListCommand());
workflow.addCommand(workflowExportCommand());
workflow.addCommand(workflowImportCommand());
workflow.addCommand(workflowTriggerCommand());
program.addCommand(workflow);

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
