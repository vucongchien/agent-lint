import { scanTokenViolations, loadConfig } from '@chien_swe/core';

export const enforceDesignTokensRule = {
  meta: {
    type: 'suggestion' as const,
    docs: {
      description: 'Enforce using Design Tokens instead of hardcoded colors, spacing, and font sizes',
      category: 'Styling',
      recommended: true,
    },
    fixable: 'code' as const,
    schema: [],
  },
  create(context: any) {
    const filename = context.filename || context.getFilename?.() || 'unknown.tsx';
    const sourceCode = context.sourceCode?.text || context.getSourceCode?.()?.text || '';

    let config;
    try {
      config = loadConfig(undefined, process.cwd()).config.rules.design_tokens;
    } catch {
      return {};
    }

    if (!config.enabled || config.severity === 'off') {
      return {};
    }

    const violations = scanTokenViolations({
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
      });
    }

    return {};
  },
};
