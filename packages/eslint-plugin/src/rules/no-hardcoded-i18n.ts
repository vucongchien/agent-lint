import { scanI18nViolations, loadConfig } from '@agent-lint/core';

export const noHardcodedI18nRule = {
  meta: {
    type: 'problem' as const,
    docs: {
      description: 'Disallow hardcoded strings in JSX and specified attributes to enforce i18n',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code' as const,
    schema: [],
  },
  create(context: any) {
    const filename = context.filename || context.getFilename?.() || 'unknown.tsx';
    const sourceCode = context.sourceCode?.text || context.getSourceCode?.()?.text || '';

    // Load config
    let config;
    try {
      config = loadConfig(undefined, process.cwd()).config.rules.i18n;
    } catch {
      return {};
    }

    if (!config.enabled || config.severity === 'off') {
      return {};
    }

    const violations = scanI18nViolations({
      filePath: filename,
      code: sourceCode,
      config,
    });

    for (const v of violations) {
      context.report({
        loc: {
          start: { line: v.loc.line, column: v.loc.column },
          end: { line: v.loc.line, column: v.loc.column + v.rawText.length },
        },
        message: v.message,
        fix(fixer: any) {
          if (v.suggestedFix?.replacement) {
            return fixer.replaceTextRange([v.loc.start, v.loc.end], v.suggestedFix.replacement);
          }
          return null;
        },
      });
    }

    return {};
  },
};
