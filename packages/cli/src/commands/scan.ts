import fs from 'fs';
import path from 'path';
import pc from 'picocolors';
import {
  AgentLintEngine,
  formatConsoleReport,
  formatJsonReport,
  formatAgentPromptReport,
  formatSarifReport,
} from '@chien_swe/core';

import type { RuleCategory } from '@chien_swe/core';

export interface ScanCommandOptions {
  config?: string;
  format?: 'pretty' | 'json' | 'agent' | 'sarif';
  output?: string;
  only?: string;
  skip?: string;
}

export function parseCategoryList(input?: string): RuleCategory[] | undefined {
  if (!input) return undefined;
  const aliasMap: Record<string, RuleCategory> = {
    craft: 'craft',
    design_craft: 'craft',
    taste: 'craft',
    i18n: 'i18n',
    arch: 'architecture',
    architecture: 'architecture',
    token: 'tokens',
    tokens: 'tokens',
    design_tokens: 'tokens',
    comp: 'composition',
    composition: 'composition',
    clean_composition: 'composition',
    dedup: 'deduplication',
    deduplication: 'deduplication',
  };

  return input
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .map((s) => aliasMap[s] || (s as RuleCategory))
    .filter(Boolean);
}

export function scanCommand(files: string[], options: ScanCommandOptions) {
  try {
    const engine = new AgentLintEngine({
      configPath: options.config,
    });

    const only = parseCategoryList(options.only);
    const skip = parseCategoryList(options.skip);

    const result = engine.scan(files.length > 0 ? files : undefined, { only, skip });
    const format = options.format || 'pretty';

    let outputContent = '';
    if (format === 'json') {
      outputContent = formatJsonReport(result);
    } else if (format === 'sarif') {
      outputContent = formatSarifReport(result);
    } else if (format === 'agent') {
      outputContent = formatAgentPromptReport(result);
    } else {
      outputContent = formatConsoleReport(result);
    }

    if (options.output) {
      const outPath = path.resolve(process.cwd(), options.output);
      fs.writeFileSync(outPath, outputContent, 'utf-8');
      console.log(pc.green(`✔ Scan report saved to: ${outPath}`));
    } else {
      console.log(outputContent);
    }

    const hasErrors = result.violations.some((v) => v.severity === 'error');
    if (hasErrors) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error(pc.red(`Error during scan: ${err.message}`));
    process.exit(1);
  }
}
