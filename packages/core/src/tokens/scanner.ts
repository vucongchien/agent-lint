import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { DesignTokensRuleConfig, Violation } from '../types';
import { findNearestColorToken } from './color-utils';
import {
  TAILWIND_COLORS,
  findNearestSpacingToken,
  findNearestFontSizeToken,
} from './tailwind-tokens';

const traverse = (typeof _traverse === 'function' ? _traverse : (_traverse as any).default) as typeof _traverse;

export interface ScanTokensOptions {
  filePath: string;
  code: string;
  config: DesignTokensRuleConfig;
}

export function scanTokenViolations(options: ScanTokensOptions): Violation[] {
  const { filePath, code, config } = options;
  if (!config.enabled || config.severity === 'off') {
    return [];
  }

  const violations: Violation[] = [];

  let ast: any;
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
        'decorators-legacy',
        'classProperties',
        'dynamicImport',
        'exportDefaultFrom',
      ],
    });
  } catch (err) {
    return [];
  }

  const colorTokenMap = config.tokens?.colors || TAILWIND_COLORS;

  traverse(ast, {
    JSXAttribute(path) {
      const attrNameNode = path.node.name;
      if (!t.isJSXIdentifier(attrNameNode)) return;
      const attrName = attrNameNode.name;

      // 1. Quét className chứa Tailwind arbitrary values (vd: bg-[#1e293b], p-[15px], text-[18px])
      if (attrName === 'className' || attrName === 'class') {
        const valNode = path.node.value;
        let classStr = '';
        let nodeLoc: any = null;

        if (t.isStringLiteral(valNode)) {
          classStr = valNode.value;
          nodeLoc = valNode.loc;
        } else if (
          t.isJSXExpressionContainer(valNode) &&
          t.isStringLiteral(valNode.expression)
        ) {
          classStr = valNode.expression.value;
          nodeLoc = valNode.expression.loc;
        }

        if (!classStr || !nodeLoc) return;

        const classList = classStr.split(/\s+/).filter(Boolean);

        for (const cls of classList) {
          // Check arbitrary color: bg-[#1e293b], text-[#ff0000], border-[rgb(...)]
          const colorMatch = cls.match(/^(bg|text|border|ring|fill|stroke)-\[((?:#|rgb)[^\]]+)\]$/i);
          if (colorMatch && config.enforce.colors) {
            const prefix = colorMatch[1];
            const rawColor = colorMatch[2];
            const nearest = findNearestColorToken(
              rawColor,
              colorTokenMap,
              config.suggestion.color_tolerance
            );
            const suggestedClass = nearest ? `${prefix}-${nearest.tokenName}` : '';

            violations.push({
              ruleId: 'token-violation',
              severity: config.severity,
              message: `Hardcoded color "${rawColor}" in class "${cls}". Use design token instead.`,
              file: filePath,
              loc: {
                line: nodeLoc.start.line,
                column: nodeLoc.start.column,
                start: valNode?.start ?? 0,
                end: valNode?.end ?? 0,
              },
              rawText: cls,
              suggestedFix: suggestedClass
                ? {
                    type: 'token-replace',
                    replacement: suggestedClass,
                  }
                : undefined,
              metadata: {
                type: 'arbitrary-color',
                originalClass: cls,
                suggestedToken: nearest?.tokenName,
              },
            });
          }

          // Check arbitrary spacing: p-[15px], m-[13px], gap-[21px], h-[35px], w-[50px]
          const spacingMatch = cls.match(/^(p|m|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|h|w)-\[(\d+)px\]$/i);
          if (spacingMatch && config.enforce.spacing) {
            const prefix = spacingMatch[1];
            const pxVal = parseInt(spacingMatch[2], 10);
            const nearest = findNearestSpacingToken(pxVal);
            const suggestedClass = `${prefix}-${nearest.tokenName}`;

            violations.push({
              ruleId: 'token-violation',
              severity: config.severity,
              message: `Hardcoded spacing "${pxVal}px" in class "${cls}". Use design token instead.`,
              file: filePath,
              loc: {
                line: nodeLoc.start.line,
                column: nodeLoc.start.column,
                start: valNode?.start ?? 0,
                end: valNode?.end ?? 0,
              },
              rawText: cls,
              suggestedFix: {
                type: 'token-replace',
                replacement: suggestedClass,
              },
              metadata: {
                type: 'arbitrary-spacing',
                originalClass: cls,
                nearestPx: nearest.tokenPx,
              },
            });
          }

          // Check arbitrary font-size: text-[18px]
          const fontMatch = cls.match(/^text-\[(\d+)px\]$/i);
          if (fontMatch && config.enforce.font_sizes) {
            const pxVal = parseInt(fontMatch[1], 10);
            const nearest = findNearestFontSizeToken(pxVal);
            const suggestedClass = `text-${nearest.tokenName}`;

            violations.push({
              ruleId: 'token-violation',
              severity: config.severity,
              message: `Hardcoded font size "${pxVal}px" in class "${cls}". Use design token instead.`,
              file: filePath,
              loc: {
                line: nodeLoc.start.line,
                column: nodeLoc.start.column,
                start: valNode?.start ?? 0,
                end: valNode?.end ?? 0,
              },
              rawText: cls,
              suggestedFix: {
                type: 'token-replace',
                replacement: suggestedClass,
              },
              metadata: {
                type: 'arbitrary-font-size',
                originalClass: cls,
                nearestPx: nearest.tokenPx,
              },
            });
          }
        }
      }

      // 2. Quét inline styles: style={{ color: '#1e293b', fontSize: 18 }}
      if (attrName === 'style') {
        const valNode = path.node.value;
        if (
          t.isJSXExpressionContainer(valNode) &&
          t.isObjectExpression(valNode.expression)
        ) {
          for (const prop of valNode.expression.properties) {
            if (t.isObjectProperty(prop)) {
              let propName = '';
              if (t.isIdentifier(prop.key)) propName = prop.key.name;
              if (t.isStringLiteral(prop.key)) propName = prop.key.value;

              // Check inline color
              if (['color', 'backgroundColor', 'borderColor'].includes(propName) && config.enforce.colors) {
                if (t.isStringLiteral(prop.value) && (prop.value.value.startsWith('#') || prop.value.value.startsWith('rgb'))) {
                  const rawColor = prop.value.value;
                  const nearest = findNearestColorToken(rawColor, colorTokenMap);
                  violations.push({
                    ruleId: 'token-violation',
                    severity: config.severity,
                    message: `Hardcoded inline color "${rawColor}" in style property "${propName}". Use design token class instead.`,
                    file: filePath,
                    loc: {
                      line: prop.loc?.start.line ?? 0,
                      column: prop.loc?.start.column ?? 0,
                      start: prop.start ?? 0,
                      end: prop.end ?? 0,
                    },
                    rawText: `${propName}: '${rawColor}'`,
                    suggestedFix: nearest
                      ? {
                          type: 'token-replace',
                          replacement: `Use token: ${nearest.tokenName} (${nearest.tokenValue})`,
                        }
                      : undefined,
                    metadata: {
                      type: 'inline-style-color',
                      property: propName,
                      suggestedToken: nearest?.tokenName,
                    },
                  });
                }
              }

              // Check inline spacing/sizes
              if (['margin', 'padding', 'gap', 'height', 'width', 'fontSize'].includes(propName)) {
                let pxVal: number | null = null;
                if (t.isNumericLiteral(prop.value)) {
                  pxVal = prop.value.value;
                } else if (t.isStringLiteral(prop.value) && prop.value.value.endsWith('px')) {
                  pxVal = parseInt(prop.value.value, 10);
                }

                if (pxVal !== null && pxVal > 0) {
                  violations.push({
                    ruleId: 'token-violation',
                    severity: config.severity,
                    message: `Hardcoded inline size "${pxVal}px" in style property "${propName}". Use Tailwind token classes instead.`,
                    file: filePath,
                    loc: {
                      line: prop.loc?.start.line ?? 0,
                      column: prop.loc?.start.column ?? 0,
                      start: prop.start ?? 0,
                      end: prop.end ?? 0,
                    },
                    rawText: `${propName}: ${pxVal}`,
                    metadata: {
                      type: 'inline-style-size',
                      property: propName,
                      value: pxVal,
                    },
                  });
                }
              }
            }
          }
        }
      }
    },
  });

  return violations;
}
