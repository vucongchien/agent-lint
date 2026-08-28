import fs from 'fs';
import path from 'path';
import pc from 'picocolors';
import {
  AgentLintEngine,
  formatConsoleReport,
  formatJsonReport,
  formatAgentPromptReport,
  formatSarifReport,
} from '@agent-lint/core';

export interface ScanCommandOptions {
  config?: string;
  format?: 'pretty' | 'json' | 'agent' | 'sarif';
  output?: string;
}

export function scanCommand(files: string[], options: ScanCommandOptions) {
  try {
    const engine = new AgentLintEngine({
      configPath: options.config,
    });

    const result = engine.scan(files.length > 0 ? files : undefined);
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
