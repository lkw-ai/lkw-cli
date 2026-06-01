/**
 * lkw client init <name> — bootstrap a new client setup:
 *   1. Create an organization
 *   2. Create an admin user inside the org
 *   3. Create a starter project
 *
 * Prints the credentials at the end. Idempotent? Currently no — running
 * twice will create a second org with the same name (the API allows it).
 */
import { Command } from 'commander';
import prompts from 'prompts';
import { makeClient } from '../../client.js';
import { colors, die, spinner, symbols } from '../../ui.js';

export function clientInitCommand(): Command {
  return new Command('init')
    .description('Bootstrap a new client (org + admin user + starter project)')
    .argument('<name>', 'client name (used for the organization)')
    .option('--slug <slug>', 'organization slug (defaults to slugified name)')
    .option('--admin-email <email>', 'admin user email (otherwise prompted)')
    .option('--admin-name <name>', 'admin display name (defaults to "<Name> Admin")')
    .option('--admin-password <pw>', 'admin password (otherwise generated; printed at the end)')
    .option('--project-name <name>', 'starter project name', 'Onboarding')
    .action(
      async (
        clientName: string,
        opts: { slug?: string; adminEmail?: string; adminName?: string; adminPassword?: string; projectName: string },
      ) => {
        if (!opts.adminEmail) {
          const ans = await prompts({ type: 'text', name: 'email', message: 'Admin email' }, { onCancel: () => die('Cancelled') });
          opts.adminEmail = ans.email as string;
        }
        if (!opts.adminEmail) die('Admin email is required');

        const password = opts.adminPassword ?? generatePassword(20);
        const slug = opts.slug ?? slugify(clientName);
        const adminName = opts.adminName ?? `${clientName} Admin`;

        const lkw = makeClient();
        const sp = spinner('').start();

        try {
          sp.text = 'Creating organization...';
          const org = await lkw.organizations.create({ name: clientName, slug });
          sp.succeed(`${symbols.success} Organization "${org.name}" (${org.id})`);

          sp.start('Creating admin user...');
          const user = await lkw.users.create({
            email: opts.adminEmail,
            name: adminName,
            password,
            role: 'ADMIN',
            organizationId: org.id,
          });
          sp.succeed(`${symbols.success} Admin user ${user.email} (${user.id})`);

          sp.start('Creating starter project...');
          const project = await lkw.projects.create({ name: opts.projectName, organizationId: org.id });
          sp.succeed(`${symbols.success} Project "${project.name}" (${project.id})`);

          console.log();
          console.log(colors.bold('Client bootstrapped. Pass these credentials to the client TI team:'));
          console.log();
          console.log(`  Organization: ${colors.cyan(org.name)} (${org.id})`);
          console.log(`  Login URL:    https://app.lkw.digital`);
          console.log(`  Email:        ${colors.cyan(opts.adminEmail)}`);
          console.log(`  Password:     ${colors.cyan(password)}`);
          console.log(`  Project:      ${colors.cyan(project.name)} (${project.id})`);
          console.log();
          console.log(colors.warn('Have the admin change the password on first login.'));
        } catch (err) {
          sp.fail();
          die((err as Error).message);
        }
      },
    );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function generatePassword(len: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%&*';
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
