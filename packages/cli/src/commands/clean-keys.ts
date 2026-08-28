import pc from 'picocolors';
import { findDeadTranslationKeys, pruneDeadKeysFromFile, loadConfig } from '@agent-lint/core';

export interface CleanKeysCommandOptions {
  config?: string;
  prune?: boolean;
}

export function cleanKeysCommand(options: CleanKeysCommandOptions) {
  try {
    const rootDir = process.cwd();
    const { config } = loadConfig(options.config, rootDir);

    console.log(pc.cyan(`\n🔍 Scanning for dead/unused translation keys...`));
    const result = findDeadTranslationKeys(
      rootDir,
      config.rules.i18n.locales.dir,
      config.target.include
    );

    if (result.deadKeys.length === 0) {
      console.log(pc.green(`✔ No dead translation keys found! All keys in dictionary are actively used.\n`));
      return;
    }

    console.log(`\n${pc.yellow(pc.bold(`Found ${result.deadKeys.length} dead/unused translation keys:`))}`);
    for (const key of result.deadKeys) {
      console.log(`  ${pc.red('✖')} ${pc.dim(key)}`);
    }

    if (options.prune) {
      console.log(pc.cyan(`\n🧹 Pruning dead keys from dictionary files...`));
      let totalPruned = 0;
      for (const file of result.localeFiles) {
        const { removedCount } = pruneDeadKeysFromFile(file, result.deadKeys);
        totalPruned += removedCount;
        console.log(`  ${pc.green('✔')} Pruned ${removedCount} keys from ${file}`);
      }
      console.log(`\n${pc.bold(pc.green('✔ Successfully cleaned:'))} Removed ${totalPruned} orphaned keys.\n`);
    } else {
      console.log(pc.dim(`\nTip: Run ${pc.bold('npx agent-lint clean-keys --prune')} to automatically remove them from your locale files.\n`));
    }
  } catch (err: any) {
    console.error(pc.red(`Error during dead keys cleanup: ${err.message}`));
    process.exit(1);
  }
}
