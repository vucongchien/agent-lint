import pc from 'picocolors';
import { AgentLintEngine } from '@chien_swe/core';

export interface FixCommandOptions {
  config?: string;
}

export function fixCommand(files: string[], options: FixCommandOptions) {
  try {
    const engine = new AgentLintEngine({
      configPath: options.config,
    });

    console.log(pc.cyan(`\n🔍 Scanning and auto-fixing violations...`));
    const result = engine.fix(files.length > 0 ? files : undefined);

    if (result.filesModified.length === 0) {
      console.log(pc.green(`✔ No files needed fixing. Everything is up to date!`));
      return;
    }

    console.log(`\n${pc.bold(pc.green('✔ Successfully fixed:'))}`);
    for (const file of result.filesModified) {
      console.log(`  ${pc.cyan('↳ Modified file:')} ${file}`);
    }

    if (result.keysAdded.length > 0) {
      console.log(`\n${pc.bold('Added keys to dictionary:')}`);
      for (const item of result.keysAdded) {
        console.log(`  ${pc.yellow('+')} [${item.file}] ${pc.bold(item.key)}: "${item.value}"`);
      }
    }

    console.log(
      `\n${pc.bold('Summary:')} Fixed ${result.violationsFixed} violations across ${result.filesModified.length} files.\n`
    );
  } catch (err: any) {
    console.error(pc.red(`Error during fix: ${err.message}`));
    process.exit(1);
  }
}
