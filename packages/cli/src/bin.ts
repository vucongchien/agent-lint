#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init';
import { scanCommand } from './commands/scan';
import { fixCommand } from './commands/fix';
import { cleanKeysCommand } from './commands/clean-keys';

const program = new Command();

program
  .name('agent-lint')
  .description('AI-ready Linter and Auto-fixer for i18n and Design Tokens in React/Next.js')
  .version('0.1.0');

program
  .command('init')
  .description('Create default .agent-lint.yaml configuration file')
  .option('-f, --force', 'Overwrite existing configuration file')
  .action((options) => {
    initCommand(options);
  });

program
  .command('scan [files...]')
  .description('Scan project or specific files for violations')
  .option('-c, --config <path>', 'Path to custom config file')
  .option('--format <format>', 'Output format: pretty | json | agent | sarif', 'pretty')
  .option('--only <categories>', 'Only scan specific categories (e.g. craft, i18n, arch, tokens)')
  .option('--skip <categories>', 'Skip specific categories (e.g. craft, i18n, arch, tokens)')
  .option('-o, --output <file>', 'Save output report to file')
  .action((files, options) => {
    scanCommand(files, options);
  });

program
  .command('fix [files...]')
  .description('Automatically fix i18n violations and sync keys into locale dictionaries')
  .option('-c, --config <path>', 'Path to custom config file')
  .option('--only <categories>', 'Only fix specific categories (e.g. i18n, tokens)')
  .option('--skip <categories>', 'Skip specific categories')
  .action((files, options) => {
    fixCommand(files, options);
  });

program
  .command('clean-keys')
  .description('Find and remove dead/unused translation keys from dictionary files')
  .option('-c, --config <path>', 'Path to custom config file')
  .option('-p, --prune', 'Automatically delete dead keys from JSON files')
  .action((options) => {
    cleanKeysCommand(options);
  });

program.parse(process.argv);
