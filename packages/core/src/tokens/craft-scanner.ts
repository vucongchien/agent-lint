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

      // 8. Kiểm tra Optical Kerning & Tracking (Chữ nhỏ thì kerning/tracking phải càng rộng)
      if (config.optical_kerning !== false) {
        const isSmallText = classes.some((c) =>
          /text-(?:xs|\[10px\]|\[11px\]|\[12px\])/.test(c)
        );
        const hasNegativeTracking = classes.some((c) =>
          /tracking-(?:tight|tighter|\[-[^\]]+\])/.test(c)
        );
        const isUppercase = classes.includes('uppercase');
        const hasNoPositiveTracking = !classes.some((c) =>
          /tracking-(?:wide|wider|widest)/.test(c)
        );

        // Trường hợp A: Chữ nhỏ mà bị co tracking âm -> Dính nét, rất khó đọc
        if (isSmallText && hasNegativeTracking) {
          violations.push({
            ruleId: 'optical-kerning',
            severity: config.severity,
            message:
              'Optical Typography: Small text sizes (text-xs / ≤12px) require neutral or expanded letter-spacing (tracking-normal / tracking-wide). Avoid negative tracking (tracking-tight) to prevent illegible glyph collisions.',
            file: filePath,
            loc: {
              line: loc.start.line,
              column: loc.start.column,
              start: opening.start ?? 0,
              end: opening.end ?? 0,
            },
            rawText: classStr,
            metadata: { type: 'optical-kerning-small-negative', classes },
          });
        }
        // Trường hợp B: Nhãn in hoa nhỏ (Uppercase badge/caption) mà không tăng kerning
        else if (isSmallText && isUppercase && hasNoPositiveTracking) {
          violations.push({
            ruleId: 'optical-kerning',
            severity: config.severity,
            message:
              'Optical Typography: Uppercase captions and badges require expanded letter-spacing (tracking-wider or tracking-wide) for optical balance and readability.',
            file: filePath,
            loc: {
              line: loc.start.line,
              column: loc.start.column,
              start: opening.start ?? 0,
              end: opening.end ?? 0,
            },
            rawText: classStr,
            metadata: { type: 'optical-kerning-uppercase-missing-wide', classes },
          });
        }
      }

      // 9. Kiểm tra Dark Mode Optical Compensation (Giảm 1 bậc font-weight / kích thước khi sang Dark Mode)
      if (config.dark_mode_optical_compensation !== false) {
        const hasExplicitSameHeavyDarkWeight =
          classes.some((c) => /font-(?:bold|extrabold|black)/.test(c)) &&
          classes.some((c) => /dark:font-(?:bold|extrabold|black)/.test(c));

        if (hasExplicitSameHeavyDarkWeight) {
          violations.push({
            ruleId: 'dark-mode-optical-compensation',
            severity: config.severity,
            message:
              'Optical Compensation: Due to visual irradiation, bright text on dark backgrounds appears ~10% heavier and larger. Reduce font-weight by 1 step in Dark Mode (e.g. font-bold → dark:font-semibold) and compensate sizing: Text (x - x/16), Icon (x - x/15).',
            file: filePath,
            loc: {
              line: loc.start.line,
              column: loc.start.column,
              start: opening.start ?? 0,
              end: opening.end ?? 0,
            },
            rawText: classStr,
            metadata: { type: 'dark-mode-optical-compensation', classes },
          });
        }
      }

      // 10. Kiểm tra Critical Alert Signifiers (Khung cảnh báo nguy hiểm phải có Icon chỉ dẫn)
      if (config.critical_alert_signifiers !== false) {
        const isAlertBg = classes.some((c) =>
          /^bg-(?:red|rose|amber|orange|yellow)-(?:50|100|200|500|600|700|800|900)$/.test(c)
        );
        const isAlertRole = opening.attributes.some(
          (attr) =>
            t.isJSXAttribute(attr) &&
            attr.name.name === 'role' &&
            t.isStringLiteral(attr.value) &&
            (attr.value.value === 'alert' || attr.value.value === 'status')
        );

        if (isAlertBg || isAlertRole) {
          // Kiểm tra xem container có chứa SVG icon hoặc Icon component con không
          let hasIconChild = false;
          path.traverse({
            JSXElement(childPath) {
              if (childPath === path) return;
              const childName = childPath.node.openingElement.name;
              if (t.isJSXIdentifier(childName)) {
                const name = childName.name.toLowerCase();
                if (
                  name === 'svg' ||
                  name.includes('icon') ||
                  name.includes('alert') ||
                  name.includes('warning') ||
                  name.includes('danger')
                ) {
                  hasIconChild = true;
                }
              }
            },
          });

          if (!hasIconChild) {
            violations.push({
              ruleId: 'critical-alert-signifier',
              severity: config.severity,
              message:
                'Critical Alert Signifier: High-priority warning / danger alerts require an explicit visual anchor (Icon / SVG symbol) alongside strong border contrast so users register critical information immediately.',
              file: filePath,
              loc: {
                line: loc.start.line,
                column: loc.start.column,
                start: opening.start ?? 0,
                end: opening.end ?? 0,
              },
              rawText: classStr,
              metadata: { type: 'critical-alert-missing-icon', classes },
            });
          }
        }
      }

      // 11. Kiểm tra Type Scale Jump (Tiêu đề và nội dung phụ phải nhảy tối thiểu 2 bậc cỡ chữ)
      if (config.type_scale_jump !== false) {
        const tagName = t.isJSXIdentifier(opening.name) ? opening.name.name.toLowerCase() : '';
        if (/^h[1-6]$/.test(tagName)) {
          const SCALE_STEPS: Record<string, number> = {
            'text-xs': 1,
            'text-sm': 2,
            'text-base': 3,
            'text-lg': 4,
            'text-xl': 5,
            'text-2xl': 6,
            'text-3xl': 7,
            'text-4xl': 8,
            'text-5xl': 9,
          };

          const headingSizeClass = classes.find((c) => c in SCALE_STEPS);
          if (headingSizeClass) {
            const headingStep = SCALE_STEPS[headingSizeClass];

            // Tìm sibling paragraph hoặc span mô tả tiếp theo
            const parent = path.parent;
            if (t.isJSXElement(parent)) {
              const siblings = parent.children.filter(t.isJSXElement);
              const index = siblings.indexOf(path.node);
              if (index >= 0 && index < siblings.length - 1) {
                const nextSibling = siblings[index + 1];
                const nextTag = t.isJSXIdentifier(nextSibling.openingElement.name)
                  ? nextSibling.openingElement.name.name.toLowerCase()
                  : '';

                if (nextTag === 'p' || nextTag === 'span' || nextTag === 'div') {
                  const nextClasses = extractClassNames(nextSibling.openingElement);
                  const bodySizeClass = nextClasses.find((c) => c in SCALE_STEPS);

                  if (bodySizeClass) {
                    const bodyStep = SCALE_STEPS[bodySizeClass];
                    if (headingStep - bodyStep < 2 && headingStep >= bodyStep) {
                      violations.push({
                        ruleId: 'type-scale-jump',
                        severity: config.severity,
                        message: `Type Scale Hierarchy Jump: Heading (${headingSizeClass}) and supporting body (${bodySizeClass}) only differ by 1 scale step. Use at least a 2-step hierarchy jump (e.g. text-xl with text-sm) to prevent flat typography.`,
                        file: filePath,
                        loc: {
                          line: loc.start.line,
                          column: loc.start.column,
                          start: opening.start ?? 0,
                          end: opening.end ?? 0,
                        },
                        rawText: `${headingSizeClass} -> ${bodySizeClass}`,
                        metadata: { type: 'type-scale-flat-jump', headingSizeClass, bodySizeClass },
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }

      // 12. Kiểm tra Optical Centering (Căn giữa quang học: Padding Top < Padding Bottom: 1 : 1.2)
      if (config.optical_centering !== false) {
        const isHeroOrBanner = classes.some((c) =>
          /min-h-(?:screen|\[.+?\])|h-screen|max-w-screen/.test(c) ||
          (classes.includes('items-center') && classes.includes('justify-center'))
        );
        const hasEqualHeavyVerticalPadding = classes.some((c) =>
          /^py-(?:10|12|14|16|20|24|28|32|36|40|48|56|64)$/.test(c)
        );

        if (isHeroOrBanner && hasEqualHeavyVerticalPadding) {
          const pyClass = classes.find((c) => /^py-(?:10|12|14|16|20|24|28|32|36|40|48|56|64)$/.test(c));
          violations.push({
            ruleId: 'optical-centering',
            severity: config.severity,
            message: `Optical Vertical Centering: Large sections with symmetrical padding (${pyClass}) feel bottom-heavy due to visual gravity. Shift weight slightly upward by applying an optical ratio (pt < pb: ~1 : 1.2, e.g. pt-10 pb-12 or pt-16 pb-20).`,
            file: filePath,
            loc: {
              line: loc.start.line,
              column: loc.start.column,
              start: opening.start ?? 0,
              end: opening.end ?? 0,
            },
            rawText: classStr,
            metadata: { type: 'optical-centering-symmetrical', classes },
          });
        }
      }

      // 13. Kiểm tra Entity / Product Grid Gap Ratio (Gap ≈ 1/3 Card Width)
      if (config.entity_grid_gap_ratio !== false) {
        const isGrid = classes.some((c) => c === 'grid' || c.startsWith('grid-cols-') || c === 'flex');
        const gapClass = classes.find((c) => /^gap-(?:1|2|3|24|28|32|36|40|48)$/.test(c));

        if (isGrid && gapClass) {
          // Kiểm tra xem các con có width cố định dạng Card không
          let hasCardChild = false;
          let cardWidth = '';

          for (const child of path.node.children) {
            if (t.isJSXElement(child)) {
              const childClasses = extractClassNames(child.openingElement);
              const wClass = childClasses.find((c) => /^w-(?:56|60|64|72|80|96|\[\d+px\])$/.test(c));
              if (wClass) {
                hasCardChild = true;
                cardWidth = wClass;
                break;
              }
            }
          }

          if (hasCardChild) {
            const isTooTight = /^gap-[123]$/.test(gapClass);
            const isTooLoose = /^gap-(?:24|28|32|36|40|48)$/.test(gapClass);

            if (isTooTight || isTooLoose) {
              violations.push({
                ruleId: 'entity-grid-gap',
                severity: config.severity,
                message: `Entity Grid Gap Ratio: The spacing (${gapClass}) between ${cardWidth} cards is ${isTooTight ? 'too crowded' : 'too disconnected'}. Golden visual rhythm recommends gap ≈ 1/3 item width (e.g. w-72 [288px] cards pair best with gap-6 to gap-8 [24-32px]).`,
                file: filePath,
                loc: {
                  line: loc.start.line,
                  column: loc.start.column,
                  start: opening.start ?? 0,
                  end: opening.end ?? 0,
                },
                rawText: `${gapClass} on ${cardWidth}`,
                metadata: { type: 'entity-grid-gap-out-of-ratio', gapClass, cardWidth },
              });
            }
          }
        }
      }

      // 14. Kiểm tra Missing Dark Mode Variants (Tránh vỡ giao diện nền tối)
      if (config.no_missing_dark_mode !== false) {
        const hasLightBg = classes.some((c) => /^(?:bg-white|bg-slate-50|bg-gray-50)$/.test(c));
        const hasLightBorder = classes.some((c) => /^(?:border-slate-200|border-gray-200)$/.test(c));
        const hasLightText = classes.some((c) => /^(?:text-slate-900|text-gray-900)$/.test(c));
        const hasDarkModeClass = classes.some((c) => c.startsWith('dark:'));

        if ((hasLightBg || hasLightBorder || hasLightText) && !hasDarkModeClass) {
          violations.push({
            ruleId: 'missing-dark-mode',
            severity: config.severity,
            message:
              'Dark Mode Integrity: Hardcoded light surface/border/text without a corresponding "dark:" variant causes severe glare and broken contrast when users switch to Dark Mode. Add dark variants (e.g. dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100).',
            file: filePath,
            loc: {
              line: loc.start.line,
              column: loc.start.column,
              start: opening.start ?? 0,
              end: opening.end ?? 0,
            },
            rawText: classStr,
            metadata: { type: 'missing-dark-mode-variants', classes },
          });
        }
      }

      // 15. Kiểm tra Monospace Costume (Cấm font mono làm màu trên text thông thường)
      if (config.no_monospace_costume !== false) {
        const hasMono = classes.includes('font-mono');
        if (hasMono) {
          // Bỏ qua nếu là <code>, <pre>, <kbd>
          const tagName = t.isJSXIdentifier(opening.name) ? opening.name.name.toLowerCase() : '';
          if (tagName !== 'code' && tagName !== 'pre' && tagName !== 'kbd') {
            // Kiểm tra xem nội dung bên trong có phải narrative text hoặc fake dev prefix ("//")
            const textContent = path.node.children
              .filter(t.isJSXText)
              .map((t) => t.value)
              .join(' ');

            if (textContent.includes('//') || /hello|world|welcome|about|subtitle/i.test(textContent) || tagName === 'h1' || tagName === 'h2' || tagName === 'p') {
              violations.push({
                ruleId: 'monospace-costume',
                severity: config.severity,
                message:
                  'Monospace Costume: Monospace font is used as a decorative dev-tool costume on non-code prose. Reserve monospace strictly for real code snippets, measurements, or terminal output.',
                file: filePath,
                loc: {
                  line: loc.start.line,
                  column: loc.start.column,
                  start: opening.start ?? 0,
                  end: opening.end ?? 0,
                },
                rawText: classStr,
                metadata: { type: 'monospace-costume-on-prose', classes },
              });
            }
          }
        }
      }

      // 16. Kiểm tra Decorative Floaters (Cấm hình học rỗng xoay 45 độ trôi nổi vô nghĩa)
      if (config.no_decorative_floaters !== false) {
        const isAbsolute = classes.includes('absolute');
        const isRotated = classes.some((c) => /rotate-(?:45|12|\[.+?\])/.test(c));
        const hasOpacity = classes.some((c) => /^opacity-\d+$/.test(c));
        const isEmptyElement = path.node.children.length === 0;

        if (isAbsolute && isRotated && hasOpacity && isEmptyElement) {
          violations.push({
            ruleId: 'decorative-floaters',
            severity: config.severity,
            message:
              'Decorative Floater: Empty rotated geometric shape detected. Avoid floating decorative diamonds/squares as they create visual noise and represent generic AI template styling.',
            file: filePath,
            loc: {
              line: loc.start.line,
              column: loc.start.column,
              start: opening.start ?? 0,
              end: opening.end ?? 0,
            },
            rawText: classStr,
            metadata: { type: 'decorative-rotated-floater', classes },
          });
        }
      }

      // 17. Kiểm tra Subjective Level Dots (Cấm vòng lặp 5 chấm level kỹ năng trong CV)
      if (config.no_subjective_level_dots !== false) {
        // Kiểm tra xem có map qua level dots không (e.g. key={i} với rounded-full w-1 h-1)
        const isTinyDot = classes.includes('rounded-full') && classes.some((c) => /^[wh]-(?:1|1\.5|2)$/.test(c));
        if (isTinyDot) {
          let parent: any = path.parentPath;
          let isInsideLevelLoop = false;
          while (parent) {
            if (parent.isCallExpression?.()) {
              const callee = parent.node.callee;
              if (t.isMemberExpression(callee) && t.isIdentifier(callee.property) && callee.property.name === 'map') {
                const callerName = (callee.object as any)?.name || '';
                if (/level|dot|rating|score/i.test(callerName)) {
                  isInsideLevelLoop = true;
                  break;
                }
              }
            }
            parent = parent.parentPath;
          }

          if (isInsideLevelLoop) {
            violations.push({
              ruleId: 'subjective-level-dots',
              severity: config.severity,
              message:
                'Subjective Level Dots: 1-5 dot rating scales on skill cards are an unmeasurable CV anti-pattern. Use categorized skill lists with crisp SVG icons and project proofs instead.',
              file: filePath,
              loc: {
                line: loc.start.line,
                column: loc.start.column,
                start: opening.start ?? 0,
                end: opening.end ?? 0,
              },
              rawText: classStr,
              metadata: { type: 'subjective-skill-dots', classes },
            });
          }
        }
      }

      // 18. Kiểm tra Undersized UI Text (< 11px)
      if (config.no_undersized_ui_text !== false) {
        const undersizedClass = classes.find((c) => /text-\[(?:[6789]|10)px\]/.test(c));
        if (undersizedClass) {
          violations.push({
            ruleId: 'undersized-ui-text',
            severity: config.severity,
            message: `Undersized UI Text: Font size "${undersizedClass}" is below the 11px threshold, causing severe readability failure on high-DPI mobile devices. Use at least text-xs (12px) for UI badges and tags.`,
            file: filePath,
            loc: {
              line: loc.start.line,
              column: loc.start.column,
              start: opening.start ?? 0,
              end: opening.end ?? 0,
            },
            rawText: undersizedClass,
            metadata: { type: 'undersized-font', undersizedClass },
          });
        }
      }

      // 19. Vercel Taste: Cấm transition-all (Gây quá tải GPU và giật chuyển động)
      if (config.no_transition_all !== false) {
        const hasTransitionAll = classes.includes('transition-all');
        if (hasTransitionAll) {
          violations.push({
            ruleId: 'transition-all',
            severity: config.severity,
            message:
              'Vercel Taste / Performance: Avoid "transition-all" as it animates every layout/paint property blindly. Declare transitions explicitly (e.g. "transition-colors", "transition-opacity", "transition-transform") for smooth 60fps compositor performance.',
            file: filePath,
            loc: {
              line: loc.start.line,
              column: loc.start.column,
              start: opening.start ?? 0,
              end: opening.end ?? 0,
            },
            rawText: classStr,
            metadata: { type: 'banned-transition-all', classes },
          });
        }
      }

      // 20. Vercel Taste: Cấm outline-none trần trụi nếu không có focus-visible thay thế
      if (config.no_bare_outline_none !== false) {
        const hasOutlineNone = classes.some((c) => /^(?:outline-none|focus:outline-none)$/.test(c));
        const hasFocusRing = classes.some((c) => /^focus(?:-visible)?:ring/.test(c));

        if (hasOutlineNone && !hasFocusRing) {
          violations.push({
            ruleId: 'bare-outline-none',
            severity: config.severity,
            message:
              'Vercel Taste / Accessibility: Never remove focus rings with "outline-none" without a visible keyboard replacement. Add "focus-visible:ring-2 focus-visible:ring-offset-2" to preserve accessibility for keyboard navigation.',
            file: filePath,
            loc: {
              line: loc.start.line,
              column: loc.start.column,
              start: opening.start ?? 0,
              end: opening.end ?? 0,
            },
            rawText: classStr,
            metadata: { type: 'bare-outline-none', classes },
          });
        }
      }

      // 21. Vercel Taste: Yêu cầu text-balance hoặc text-pretty trên Heading dài
      if (config.heading_text_balance !== false) {
        const tagName = t.isJSXIdentifier(opening.name) ? opening.name.name.toLowerCase() : '';
        const isHeadingTag = /^(?:h1|h2|h3)$/.test(tagName);
        const isHeadingSize = classes.some((c) => /^text-(?:2xl|3xl|4xl|5xl|6xl)$/.test(c));

        if (isHeadingTag || isHeadingSize) {
          const hasBalance = classes.some((c) => /^(?:text-balance|text-pretty)$/.test(c));
          const textContent = path.node.children
            .filter(t.isJSXText)
            .map((t) => t.value)
            .join(' ')
            .trim();

          if (!hasBalance && textContent.length > 25) {
            violations.push({
              ruleId: 'heading-text-balance',
              severity: config.severity,
              message:
                'Vercel Taste / Editorial Typography: Headings should include "text-balance" or "text-pretty" to prevent orphaned words (widows) from awkwardly breaking onto their own line across dynamic viewport widths.',
              file: filePath,
              loc: {
                line: loc.start.line,
                column: loc.start.column,
                start: opening.start ?? 0,
                end: opening.end ?? 0,
              },
              rawText: textContent,
              metadata: { type: 'missing-text-balance', textContent },
            });
          }
        }
      }

      // 22. Vercel Taste: Bắt buộc tabular-nums trên số liệu/giá cả/timer
      if (config.tabular_numbers !== false) {
        const hasTabular = classes.includes('tabular-nums') || classes.includes('font-mono');
        if (!hasTabular) {
          const textContent = path.node.children
            .filter(t.isJSXText)
            .map((t) => t.value)
            .join(' ')
            .trim();

          const isNumericMetric = /^(?:[$€₫£¥]\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?%|\d{1,2}:\d{2}(?::\d{2})?|\d{1,3}(?:,\d{3})*\s*(?:users|reqs|ms|k|m|b)?)$/i.test(
            textContent
          );

          if (isNumericMetric && textContent.length > 0) {
            violations.push({
              ruleId: 'tabular-numbers',
              severity: config.severity,
              message:
                'Vercel Taste / Layout Stability: Numeric metrics, pricing currency, and timers should use "tabular-nums" or "font-mono" to align digit widths and eliminate layout jitter during number changes.',
              file: filePath,
              loc: {
                line: loc.start.line,
                column: loc.start.column,
                start: opening.start ?? 0,
                end: opening.end ?? 0,
              },
              rawText: textContent,
              metadata: { type: 'missing-tabular-nums', textContent },
            });
          }
        }
      }

      // 23. Vercel Taste: Bắt buộc min-w-0 trên flex child có truncate
      if (config.flex_truncate_min_w_0 !== false) {
        const hasTruncate = classes.includes('truncate') || classes.some((c) => /^line-clamp-/.test(c));
        const hasMinW0 = classes.includes('min-w-0');
        const hasFixedW = classes.some((c) => /^w-(?:[0-9]+|\[.+?\])$/.test(c));

        if (hasTruncate && !hasMinW0 && !hasFixedW) {
          // Kiểm tra xem thẻ cha có phải là flex container không
          let parent: any = path.parentPath;
          let isInsideFlex = false;

          while (parent) {
            if (parent.isJSXElement?.()) {
              const parentClasses = extractClassNames(parent.node.openingElement);
              if (parentClasses.includes('flex') || parentClasses.includes('inline-flex')) {
                isInsideFlex = true;
                break;
              }
            }
            parent = parent.parentPath;
          }

          if (isInsideFlex) {
            violations.push({
              ruleId: 'flex-truncate-min-w-0',
              severity: config.severity,
              message:
                'Vercel Taste / Flexbox Safety: Flex children with "truncate" must include "min-w-0". In standard CSS flexbox, flex items default to "min-width: auto", which prevents text truncation from shrinking properly and causes container overflow.',
              file: filePath,
              loc: {
                line: loc.start.line,
                column: loc.start.column,
                start: opening.start ?? 0,
                end: opening.end ?? 0,
              },
              rawText: classStr,
              metadata: { type: 'flex-truncate-overflow', classes },
            });
          }
        }
      }
    },
  });

  return violations;
}
