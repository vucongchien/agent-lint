import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { I18nRuleConfig, Violation } from '../types';
import { generateI18nKey } from './slug';
import { parseTemplateLiteralInterpolation } from './interpolation';
import {
  isTranslatableText,
  TECHNICAL_JSX_TAGS,
  NON_USER_FACING_PROPS,
} from './heuristics';

const traverse = (typeof _traverse === 'function' ? _traverse : (_traverse as any).default) as typeof _traverse;

export interface ScanI18nOptions {
  filePath: string;
  code: string;
  config: I18nRuleConfig;
}

export function scanI18nViolations(options: ScanI18nOptions): Violation[] {
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
      tokens: true,
    });
  } catch (err) {
    // If syntax parsing fails on non-standard JS, return empty to prevent crash
    return [];
  }

  const compiledRegexes = config.ignore_patterns.map((p) => new RegExp(p));
  const whitelistSet = new Set(config.whitelist.map((w) => w.trim().toLowerCase()));
  const targetAttributes = new Set(config.attributes.map((a) => a.toLowerCase()));

  traverse(ast, {
    // 1. Quét JSX Text: <div>Xin chào bạn</div>
    JSXText(path) {
      const rawText = path.node.value;
      const trimmed = rawText.replace(/\s+/g, ' ').trim();

      // Kiểm tra heuristic thông minh
      if (!isTranslatableText(trimmed, { whitelist: whitelistSet, customIgnorePatterns: compiledRegexes })) {
        return;
      }

      // Kiểm tra parent JSXElement có phải thẻ kỹ thuật không (style, script, svg, code, pre...)
      let currentParent: any = path.parent;
      while (currentParent) {
        if (t.isJSXElement(currentParent)) {
          const opening = currentParent.openingElement;
          if (t.isJSXIdentifier(opening.name)) {
            const tagName = opening.name.name.toLowerCase();
            if (TECHNICAL_JSX_TAGS.has(tagName)) {
              return;
            }
          }
        }
        currentParent = currentParent.parent;
      }

      const loc = path.node.loc;
      if (!loc) return;

      const generatedKey = generateI18nKey(trimmed, {
        strategy: config.key_generation.strategy,
        maxLength: config.key_generation.max_length,
        prefix: config.key_generation.prefix,
        filePath,
      });

      violations.push({
        ruleId: 'i18n-hardcoded',
        severity: config.severity,
        message: `Hardcoded string found in JSX: "${trimmed}"`,
        file: filePath,
        loc: {
          line: loc.start.line,
          column: loc.start.column,
          start: path.node.start ?? 0,
          end: path.node.end ?? 0,
        },
        rawText: trimmed,
        suggestedFix: {
          type: 'replace',
          replacement: `{${config.integration.function_name}('${generatedKey}')}`,
          generatedKey,
        },
        metadata: {
          nodeType: 'JSXText',
          originalRaw: rawText,
        },
      });
    },

    // 2. Quét JSX Attributes: <input placeholder="Nhập email" />
    JSXAttribute(path) {
      const attrName = path.node.name;
      if (!t.isJSXIdentifier(attrName)) return;

      const nameStr = attrName.name.toLowerCase();

      // Bỏ qua tuyệt đối các props kỹ thuật (className, style, key, id, ref, type, href, src...)
      if (NON_USER_FACING_PROPS.has(nameStr) || nameStr.startsWith('data-') || nameStr.startsWith('aria-hidden')) {
        return;
      }

      // Chỉ bắt nếu thuộc targetAttributes đã cấu hình (mặc định: placeholder, title, alt, aria-label, aria-description, label, helperText...)
      if (!targetAttributes.has(nameStr)) {
        return;
      }

      const valueNode = path.node.value;
      let rawText = '';
      let nodeLoc: any = null;
      let start = 0;
      let end = 0;

      if (t.isStringLiteral(valueNode)) {
        rawText = valueNode.value;
        nodeLoc = valueNode.loc;
        start = valueNode.start ?? 0;
        end = valueNode.end ?? 0;
      } else if (
        t.isJSXExpressionContainer(valueNode) &&
        t.isStringLiteral(valueNode.expression)
      ) {
        rawText = valueNode.expression.value;
        nodeLoc = valueNode.expression.loc;
        start = valueNode.expression.start ?? 0;
        end = valueNode.expression.end ?? 0;
      }

      const trimmed = rawText.trim();
      if (!isTranslatableText(trimmed, { whitelist: whitelistSet, customIgnorePatterns: compiledRegexes }) || !nodeLoc) {
        return;
      }

      const generatedKey = generateI18nKey(trimmed, {
        strategy: config.key_generation.strategy,
        maxLength: config.key_generation.max_length,
        prefix: config.key_generation.prefix,
        filePath,
      });

      violations.push({
        ruleId: 'i18n-hardcoded',
        severity: config.severity,
        message: `Hardcoded string found in attribute "${attrName.name}": "${trimmed}"`,
        file: filePath,
        loc: {
          line: nodeLoc.start.line,
          column: nodeLoc.start.column,
          start,
          end,
        },
        rawText: trimmed,
        suggestedFix: {
          type: 'replace',
          replacement: `{${config.integration.function_name}('${generatedKey}')}`,
          generatedKey,
        },
        metadata: {
          nodeType: 'JSXAttribute',
          attrName: attrName.name,
        },
      });
    },

    // 3. Quét TemplateLiteral có biến trong JSX: <div>{`Chào ${name}`}</div> hoặc attr={<TemplateLiteral>}
    TemplateLiteral(path) {
      // Bỏ qua nếu là tagged template literal như css`...` hoặc styled.div`...`
      if (t.isTaggedTemplateExpression(path.parent)) {
        return;
      }

      // Kiểm tra xem có nằm trong context JSX không
      let isInsideJSX = false;
      let p: any = path.parentPath;
      while (p) {
        if (p.isJSXAttribute?.()) {
          const attrName = p.node.name?.name?.toLowerCase?.();
          if (
            attrName &&
            (NON_USER_FACING_PROPS.has(attrName) ||
              attrName.startsWith('data-') ||
              attrName.startsWith('aria-hidden'))
          ) {
            // Nằm trong className, style, href, key... -> Bỏ qua không quét i18n
            return;
          }
          isInsideJSX = true;
          break;
        }
        if (p.isJSXElement?.()) {
          const opening = p.node.openingElement;
          if (t.isJSXIdentifier(opening.name)) {
            const tagName = opening.name.name.toLowerCase();
            if (TECHNICAL_JSX_TAGS.has(tagName)) {
              return;
            }
          }
          isInsideJSX = true;
          break;
        }
        p = p.parentPath;
      }
      if (!isInsideJSX) return;

      const nodeLoc = path.node.loc;
      if (!nodeLoc) return;

      const parsedInterpolation = parseTemplateLiteralInterpolation(path.node, code, {
        funcName: config.integration.function_name,
        filePath,
        strategy: config.key_generation.strategy,
        maxLength: config.key_generation.max_length,
        prefix: config.key_generation.prefix,
      });

      if (!parsedInterpolation) return;

      // Kiểm tra xem phần chuỗi tĩnh có translatable không
      if (!isTranslatableText(parsedInterpolation.icuString, { whitelist: whitelistSet, customIgnorePatterns: compiledRegexes })) {
        return;
      }

      const start = path.node.start ?? 0;
      const end = path.node.end ?? 0;

      violations.push({
        ruleId: 'i18n-hardcoded',
        severity: config.severity,
        message: `Hardcoded dynamic template string found in JSX: \`${parsedInterpolation.icuString}\``,
        file: filePath,
        loc: {
          line: nodeLoc.start.line,
          column: nodeLoc.start.column,
          start,
          end,
        },
        rawText: parsedInterpolation.icuString,
        suggestedFix: {
          type: 'replace',
          replacement: parsedInterpolation.replacementCode,
          generatedKey: parsedInterpolation.generatedKey,
        },
        metadata: {
          nodeType: 'TemplateLiteral',
          icuString: parsedInterpolation.icuString,
          params: parsedInterpolation.params,
        },
      });
    },
  });

  return violations;
}
