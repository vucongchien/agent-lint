import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { DesignCraftConfig, Violation } from '../types';

const traverse = (typeof _traverse === 'function' ? _traverse : (_traverse as any).default) as typeof _traverse;

export interface ScanDesignCraftOptions {
  filePath: string;
  code: string;
  config: DesignCraftConfig;
}

function extractClassNames(openingElement: t.JSXOpeningElement): string[] {
  const classNames: string[] = [];
  for (const attr of openingElement.attributes) {
    if (t.isJSXAttribute(attr) && attr.name.name === 'className') {
      if (t.isStringLiteral(attr.value)) {
        classNames.push(...attr.value.value.split(/\s+/).filter(Boolean));
      } else if (
        t.isJSXExpressionContainer(attr.value) &&
        t.isStringLiteral(attr.value.expression)
      ) {
        classNames.push(...attr.value.expression.value.split(/\s+/).filter(Boolean));
      }
    }
  }
  return classNames;
}

function isContainerCard(classes: string[]): boolean {
  const hasRounding = classes.some((c) => /rounded-(?:md|lg|xl|2xl|3xl)/.test(c));
  const hasBorder = classes.some((c) => c === 'border' || /^border-/.test(c));
  const hasShadow = classes.some((c) => /^shadow(?:-[a-z0-9]+)?$/.test(c));
  const hasBg = classes.some((c) => /^bg-/.test(c));
  const hasPadding = classes.some((c) => /^p[xy]?-\d+/.test(c));

  return (hasRounding && hasBorder && (hasBg || hasPadding)) || (hasRounding && hasShadow && hasBg);
}

/**
 * Quét các lỗi vi phạm thẩm mỹ và Design Craft (Anti-AI Slop & Visual Quality)
 */
export function scanDesignCraftViolations(options: ScanDesignCraftOptions): Violation[] {
  const { filePath, code, config } = options;
  if (!config || !config.enabled || config.severity === 'off') {
    return [];
  }

  const violations: Violation[] = [];

  let ast: any;
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy'],
    });
  } catch {
    return [];
  }

  traverse(ast, {
    JSXElement(path) {
      const opening = path.node.openingElement;
      const loc = opening.loc;
      if (!loc) return;

      const classes = extractClassNames(opening);
      const classStr = classes.join(' ');

      // 1. Kiểm tra Side-Tab Accent Border (Vệt màu dày 1 bên mép card)
      if (config.no_side_accent_border !== false) {
        const hasSideBorder = classes.some((c) =>
          /^border-[lr]-(?:2|4|8|\[\d+px\])$/.test(c)
        );
        const hasContainerStyle = classes.some((c) =>
          /rounded|shadow|bg-|p[xy]?-/.test(c)
        );

        if (hasSideBorder && hasContainerStyle) {
          violations.push({
            ruleId: 'side-accent-border',
            severity: config.severity,
            message:
              'Design Craft: Avoid thick side-tab accent borders (e.g. border-l-4) on cards. Use subtle neutral borders or typography hierarchy instead.',
            file: filePath,
            loc: {
              line: loc.start.line,
              column: loc.start.column,
              start: opening.start ?? 0,
              end: opening.end ?? 0,
            },
            rawText: classStr,
            metadata: { type: 'side-accent-border', classes },
          });
        }
      }

      // 2. Kiểm tra Gradient Text (Chữ dải màu lòe loẹt)
      if (config.no_gradient_text !== false) {
        const hasClip = classes.includes('bg-clip-text');
        const hasTransparent = classes.includes('text-transparent');
        const hasGradient = classes.some((c) => c.startsWith('bg-gradient-'));

        if (hasClip && hasTransparent && hasGradient) {
          violations.push({
            ruleId: 'gradient-text',
            severity: config.severity,
            message:
              'Design Craft: Gradient text is considered decorative and impairs readability. Use solid text with clear font-weight or size scale instead.',
            file: filePath,
            loc: {
              line: loc.start.line,
              column: loc.start.column,
              start: opening.start ?? 0,
              end: opening.end ?? 0,
            },
            rawText: classStr,
            metadata: { type: 'gradient-text', classes },
          });
        }
      }

      // 3. Kiểm tra Glowing Shadow (Bóng phát sáng màu mè)
      if (config.no_glowing_shadows !== false) {
        const hasGlow = classes.some(
          (c) =>
            /^shadow-\[0_0_\d+px[^\s\]]*\]$/.test(c) ||
            /^drop-shadow-\[0_0_\d+px[^\s\]]*\]$/.test(c) ||
            /^shadow-(?:indigo|purple|blue|cyan|violet|pink)-500\/\d+$/.test(c)
        );

        if (hasGlow) {
          violations.push({
            ruleId: 'glowing-shadow',
            severity: config.severity,
            message:
              'Design Craft: Glowing halo shadows reduce UI clarity. Use subtle, neutral elevation shadows with soft vertical offsets instead.',
            file: filePath,
            loc: {
              line: loc.start.line,
              column: loc.start.column,
              start: opening.start ?? 0,
              end: opening.end ?? 0,
            },
            rawText: classStr,
            metadata: { type: 'glowing-shadow', classes },
          });
        }
      }

      // 4. Kiểm tra Nested Cards (Card lồng trong Card)
      if (config.no_nested_cards !== false) {
        if (isContainerCard(classes)) {
          let parent: any = path.parentPath;
          while (parent) {
            if (parent.isJSXElement?.()) {
              const parentClasses = extractClassNames(parent.node.openingElement);
              if (isContainerCard(parentClasses)) {
                violations.push({
                  ruleId: 'nested-cards',
                  severity: config.severity,
                  message:
                    'Design Craft: Nested card containers create visual noise. Flatten the hierarchy using spacing, subtle dividers, or typography.',
                  file: filePath,
                  loc: {
                    line: loc.start.line,
                    column: loc.start.column,
                    start: opening.start ?? 0,
                    end: opening.end ?? 0,
                  },
                  rawText: classStr,
                  metadata: { type: 'nested-cards', classes },
                });
                break;
              }
            }
            parent = parent.parentPath;
          }
        }
      }

      // 5. Kiểm tra Floating Eyebrow / Kicker trên Heading
      if (config.no_eyebrow_kicker !== false) {
        const tagName = t.isJSXIdentifier(opening.name) ? opening.name.name.toLowerCase() : '';
        if (tagName === 'h1' || tagName === 'h2') {
          // Kiểm tra sibling ngay trước heading
          const parent = path.parent;
          if (t.isJSXElement(parent)) {
            const siblings = parent.children.filter(t.isJSXElement);
            const index = siblings.indexOf(path.node);
            if (index > 0) {
              const prevSibling = siblings[index - 1];
              const prevClasses = extractClassNames(prevSibling.openingElement);
              const isEyebrow =
                prevClasses.includes('uppercase') &&
                prevClasses.some((c) => /text-(?:xs|\[10px\]|\[11px\])/.test(c)) &&
                prevClasses.some((c) => /tracking-(?:wider|widest)/.test(c));

              if (isEyebrow) {
                const prevLoc = prevSibling.openingElement.loc;
                if (prevLoc) {
                  violations.push({
                    ruleId: 'eyebrow-kicker',
                    severity: config.severity,
                    message:
                      'Design Craft: Eyebrow / kicker label above heading dilutes the main headline. Delete the label and let the heading carry the message.',
                    file: filePath,
                    loc: {
                      line: prevLoc.start.line,
                      column: prevLoc.start.column,
                      start: prevSibling.openingElement.start ?? 0,
                      end: prevSibling.openingElement.end ?? 0,
                    },
                    rawText: prevClasses.join(' '),
                    metadata: { type: 'eyebrow-kicker' },
                  });
                }
              }
            }
          }
        }
      }

      // 6. Kiểm tra Fake Pulse Dot (Chấm nhấp nháy giả vờ)
      if (config.no_fake_pulse_dot !== false) {
        const isDot = classes.some((c) => /w-[123]\s+h-[123]/.test(classStr) || (classes.includes('w-2') && classes.includes('h-2')));
        const hasPulse = classes.some((c) => c === 'animate-ping' || c === 'animate-pulse');

        if (isDot && hasPulse && classes.includes('rounded-full')) {
          violations.push({
            ruleId: 'fake-pulse-dot',
            severity: config.severity,
            message:
              'Design Craft: Decorative pulsing status dot creates unnecessary motion distraction. Use a calm static status indicator instead.',
            file: filePath,
            loc: {
              line: loc.start.line,
              column: loc.start.column,
              start: opening.start ?? 0,
              end: opening.end ?? 0,
            },
            rawText: classStr,
            metadata: { type: 'fake-pulse-dot', classes },
          });
        }
      }

      // 7. Kiểm tra Ghost Card (Vừa viền dày vừa bóng to)
      if (config.no_ghost_card !== false) {
        const hasHeavyBorder = classes.some((c) => /border-(?:2|4)/.test(c));
        const hasHeavyShadow = classes.some((c) => /shadow-(?:lg|xl|2xl)/.test(c));

        if (hasHeavyBorder && hasHeavyShadow && classes.some((c) => c.startsWith('rounded-'))) {
          violations.push({
            ruleId: 'ghost-card',
            severity: config.severity,
            message:
              'Design Craft: Ghost card detected. Choose either a crisp border OR a soft elevation shadow, not both simultaneously.',
            file: filePath,
            loc: {
              line: loc.start.line,
              column: loc.start.column,
              start: opening.start ?? 0,
              end: opening.end ?? 0,
            },
            rawText: classStr,
            metadata: { type: 'ghost-card', classes },
          });
        }
      }
    },
  });

  return violations;
}
