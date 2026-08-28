#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init';
import { scanCommand } from './commands/scan';
import { fixCommand } from './commands/fix';

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
  .option('--format <format>', 'Output format: pretty | json | agent', 'pretty')
  .option('-o, --output <file>', 'Save output report to file')
  .action((files, options) => {
    scanCommand(files, options);
  });

program
  .command('fix [files...]')
  .description('Automatically fix i18n violations and sync keys into locale dictionaries')
  .option('-c, --config <path>', 'Path to custom config file')
  .action((files, options) => {
    fixCommand(files, options);
  });

program.parse(process.argv);
