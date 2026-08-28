import pc from 'picocolors';
import type { ScanResult, Violation } from '../types';

export function formatConsoleReport(result: ScanResult): string {
  const { violations, filesScanned, durationMs } = result;

  if (violations.length === 0) {
    return `\n${pc.green(pc.bold('✔ No violations found!'))} Scanned ${filesScanned} files in ${durationMs}ms.\n`;
  }

  let out = `\n${pc.bold('agent-lint report:')}\n`;

  // Group by file
  const fileGroups = new Map<string, Violation[]>();
  for (const v of violations) {
    if (!fileGroups.has(v.file)) {
      fileGroups.set(v.file, []);
    }
    fileGroups.get(v.file)!.push(v);
  }

  let errorCount = 0;
  let warnCount = 0;

  for (const [file, items] of fileGroups.entries()) {
    out += `\n${pc.underline(pc.bold(file))}\n`;
    for (const v of items) {
      if (v.severity === 'error') errorCount++;
      if (v.severity === 'warn') warnCount++;

      const badge = v.severity === 'error' ? pc.red('error') : pc.yellow('warn ');
      const loc = pc.dim(`${v.loc.line}:${v.loc.column}`);
      const rule = pc.dim(`(${v.ruleId})`);

      out += `  ${badge}  ${loc}  ${v.message}  ${rule}\n`;
      if (v.suggestedFix?.replacement) {
        out += `         ${pc.cyan('↳ Suggested:')} ${pc.green(v.suggestedFix.replacement)}\n`;
      }
    }
  }

  out += `\n${pc.bold('Summary:')} `;
  if (errorCount > 0) out += `${pc.red(`${errorCount} errors`)} `;
  if (warnCount > 0) out += `${pc.yellow(`${warnCount} warnings`)} `;
  out += `across ${fileGroups.size} files (scanned ${filesScanned} files in ${durationMs}ms)\n`;

  return out;
}

export function formatJsonReport(result: ScanResult): string {
  return JSON.stringify(result, null, 2);
}

export function formatAgentPromptReport(result: ScanResult): string {
  const { violations, filesScanned } = result;

  let md = `# Agent-Lint Action Report\n\n`;
  md += `**Total Files Scanned:** ${filesScanned}\n`;
  md += `**Total Violations:** ${violations.length}\n\n`;

  if (violations.length === 0) {
    md += `All files passed compliance checks. No action required.\n`;
    return md;
  }

  md += `## Required Agent Actions\n\n`;

  const i18nViolations = violations.filter((v) => v.ruleId === 'i18n-hardcoded');
  if (i18nViolations.length > 0) {
    md += `### 1. i18n Hardcode Violations (${i18nViolations.length})\n`;
    md += `Please extract these hardcoded strings into your translation dictionaries and replace them with hook calls:\n\n`;
    for (const v of i18nViolations) {
      md += `- **File:** \`${v.file}:${v.loc.line}\`\n`;
      md += `  - **Raw Text:** \`"${v.rawText}"\`\n`;
      md += `  - **Suggested Key:** \`${v.suggestedFix?.generatedKey}\`\n`;
      md += `  - **Replacement:** \`${v.suggestedFix?.replacement}\`\n`;
    }
    md += `\n`;
  }

  const tokenViolations = violations.filter((v) => v.ruleId === 'token-violation');
  if (tokenViolations.length > 0) {
    md += `### 2. Design Token Violations (${tokenViolations.length})\n`;
    md += `Please replace arbitrary/hardcoded styles with system design tokens:\n\n`;
    for (const v of tokenViolations) {
      md += `- **File:** \`${v.file}:${v.loc.line}\`\n`;
      md += `  - **Message:** ${v.message}\n`;
      md += `  - **Original:** \`${v.rawText}\`\n`;
      if (v.suggestedFix?.replacement) {
        md += `  - **Recommended Token:** \`${v.suggestedFix.replacement}\`\n`;
      }
    }
    md += `\n`;
  }

  return md;
}
