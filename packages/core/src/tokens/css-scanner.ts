import type { DesignTokensRuleConfig, Violation } from '../types';
import { findNearestColorToken } from './color-utils';
import {
  TAILWIND_COLORS,
  findNearestSpacingToken,
  findNearestFontSizeToken,
} from './tailwind-tokens';

export interface ScanCssOptions {
  filePath: string;
  code: string;
  config: DesignTokensRuleConfig;
}

/**
 * Quét các file CSS / SCSS / CSS Modules (.module.css) tìm mã hex/pixel thô
 */
export function scanCssFileViolations(options: ScanCssOptions): Violation[] {
  const { filePath, code, config } = options;
  if (!config.enabled || config.severity === 'off') {
    return [];
  }

  const violations: Violation[] = [];
  const colorTokenMap = config.tokens?.colors || TAILWIND_COLORS;

  // Tách dòng để tính line & column chính xác
  const lines = code.split('\n');

  let inComment = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const lineNum = lineIndex + 1;

    // Handle multiline comments /* ... */
    if (line.includes('/*')) inComment = true;
    if (inComment) {
      if (line.includes('*/')) inComment = false;
      continue;
    }
    if (line.trim().startsWith('//')) continue;

    // 1. Quét mã màu thô: #1e293b, #fff, rgb(...) không nằm trong var(--...)
    if (config.enforce.colors) {
      const hexMatches = line.matchAll(/(?<!var\([^)]*)#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g);
      for (const match of hexMatches) {
        const rawHex = match[0];
        const col = (match.index ?? 0) + 1;
        const nearest = findNearestColorToken(rawHex, colorTokenMap, config.suggestion.color_tolerance);

        violations.push({
          ruleId: 'token-violation',
          severity: config.severity,
          message: `Hardcoded hex color "${rawHex}" in CSS property. Use CSS variable var(--...) or design token.`,
          file: filePath,
          loc: {
            line: lineNum,
            column: col,
            start: 0,
            end: 0,
          },
          rawText: rawHex,
          suggestedFix: nearest
            ? {
                type: 'token-replace',
                replacement: `var(--color-${nearest.tokenName})`,
              }
            : undefined,
          metadata: {
            type: 'css-file-color',
            rawColor: rawHex,
            suggestedToken: nearest?.tokenName,
          },
        });
      }
    }

    // 2. Quét khoảng cách / pixel thô: margin: 15px; padding: 23px; font-size: 17px
    if (config.enforce.spacing || config.enforce.font_sizes) {
      const pxMatches = line.matchAll(/(margin|padding|gap|font-size|height|width)\s*:\s*([0-9]+)px/g);
      for (const match of pxMatches) {
        const propName = match[1];
        const pxVal = parseInt(match[2], 10);
        const col = (match.index ?? 0) + 1;

        if (propName === 'font-size' && config.enforce.font_sizes) {
          const nearest = findNearestFontSizeToken(pxVal);
          violations.push({
            ruleId: 'token-violation',
            severity: config.severity,
            message: `Hardcoded font-size "${pxVal}px" in CSS property. Use CSS variable or font-size token.`,
            file: filePath,
            loc: {
              line: lineNum,
              column: col,
              start: 0,
              end: 0,
            },
            rawText: `${propName}: ${pxVal}px`,
            suggestedFix: {
              type: 'token-replace',
              replacement: `var(--font-size-${nearest.tokenName})`,
            },
            metadata: {
              type: 'css-file-font-size',
              pxVal,
            },
          });
        } else if (config.enforce.spacing) {
          const nearest = findNearestSpacingToken(pxVal);
          violations.push({
            ruleId: 'token-violation',
            severity: config.severity,
            message: `Hardcoded size "${pxVal}px" in CSS property "${propName}". Use CSS variable or spacing token.`,
            file: filePath,
            loc: {
              line: lineNum,
              column: col,
              start: 0,
              end: 0,
            },
            rawText: `${propName}: ${pxVal}px`,
            suggestedFix: {
              type: 'token-replace',
              replacement: `var(--spacing-${nearest.tokenName})`,
            },
            metadata: {
              type: 'css-file-spacing',
              pxVal,
            },
          });
        }
      }
    }
  }

  return violations;
}
