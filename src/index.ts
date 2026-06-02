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
import { initCommand } from './commands/init.js';
import { clientInitCommand } from './commands/client/init.js';
import { clientDoctorCommand } from './commands/client/doctor.js';
import { clientSwitchCommand } from './commands/client/switch.js';
import { setVerbose } from './ui.js';
import { projectListCommand } from './commands/project/list.js';
import { workflowListCommand } from './commands/workflow/list.js';
import { workflowExportCommand } from './commands/workflow/export.js';
import { workflowImportCommand } from './commands/workflow/import.js';
import { workflowTriggerCommand } from './commands/workflow/trigger.js';
import { workflowWatchCommand } from './commands/workflow/watch.js';
import { workflowValidateCommand } from './commands/workflow/validate.js';
import { workflowDiffCommand } from './commands/workflow/diff.js';
import { workflowDevCommand } from './commands/workflow/dev.js';
import { workflowLogsCommand } from './commands/workflow/logs.js';
import { workflowDeleteCommand } from './commands/workflow/delete.js';
import { completionCommand } from './commands/completion.js';
import { templateListCommand } from './commands/template/list.js';
import { templateUseCommand } from './commands/template/use.js';
import { mocksPingCommand } from './commands/mocks/ping.js';

const program = new Command()
  .name('lkw')
  .description('Command-line interface for the LKW low-code workflow platform')
  .version('0.3.0')
  .option('-v, --verbose', 'log HTTP requests and internal decisions to stderr')
  .hook('preAction', (cmd) => {
    if (cmd.opts().verbose) setVerbose(true);
  });

// Top-level interactive setup (run once on a fresh machine)
program.addCommand(initCommand());

const auth = new Command('auth').description('Authentication: login, logout, session info');
auth.addCommand(loginCommand());
auth.addCommand(logoutCommand());
program.addCommand(auth);
program.addCommand(whoamiCommand()); // shortcut: `lkw whoami`

const client = new Command('client').description('Client / organization + CLI profile lifecycle');
client.addCommand(clientInitCommand());
client.addCommand(clientDoctorCommand());
client.addCommand(clientSwitchCommand());
program.addCommand(client);

const project = new Command('project').description('Projects');
project.addCommand(projectListCommand());
program.addCommand(project);

const workflow = new Command('workflow').description('Workflow authoring, execution, observability');
workflow.addCommand(workflowListCommand());
workflow.addCommand(workflowExportCommand());
workflow.addCommand(workflowImportCommand());
workflow.addCommand(workflowTriggerCommand());
workflow.addCommand(workflowWatchCommand());
workflow.addCommand(workflowValidateCommand());
workflow.addCommand(workflowDiffCommand());
workflow.addCommand(workflowDevCommand());
workflow.addCommand(workflowLogsCommand());
workflow.addCommand(workflowDeleteCommand());
program.addCommand(workflow);

const template = new Command('template').description('Workflow templates (catálogo + clone)');
template.addCommand(templateListCommand());
template.addCommand(templateUseCommand());
program.addCommand(template);

const mocks = new Command('mocks').description('Interact with the lkw-mocks service');
mocks.addCommand(mocksPingCommand());
program.addCommand(mocks);

// Shell completion (run once per machine):
//   lkw completion bash >> ~/.bashrc
//   lkw completion zsh  >> ~/.zshrc
program.addCommand(completionCommand());

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
