import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { CleanCompositionConfig, Violation } from '../types';

const traverse = (typeof _traverse === 'function' ? _traverse : (_traverse as any).default) as typeof _traverse;

export interface ScanCompositionOptions {
  filePath: string;
  code: string;
  config: CleanCompositionConfig;
}

function matchTargetPattern(pattern: string, filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  const regexStr = pattern
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\{([^}]+)\}/g, '($1)')
    .replace(/,/g, '|');
  return new RegExp(`${regexStr}$`, 'i').test(normalized);
}

/**
 * Kiểm tra chất lượng Composition của các file Page & Layout trong Next.js / React
 */
export function scanCompositionViolations(options: ScanCompositionOptions): Violation[] {
  const { filePath, code, config } = options;
  if (!config || !config.enabled || config.severity === 'off') {
    return [];
  }

  // 1. Kiểm tra xem file có thuộc targets của Page/Layout không
  const isTarget = config.targets.some((pattern) => matchTargetPattern(pattern, filePath));
  if (!isTarget) {
    return [];
  }

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
      ],
    });
  } catch {
    return [];
  }

  const violations: Violation[] = [];
  let maxRawDepthFound = 0;
  let deepestNodeLoc: any = null;
  let rawElementCount = 0;
  let customComponentCount = 0;

  function isRawHtmlTag(name: string): boolean {
    return /^[a-z][a-z0-9-]*$/.test(name);
  }

  traverse(ast, {
    JSXElement(path) {
      const opening = path.node.openingElement;
      if (!t.isJSXIdentifier(opening.name)) return;

      const tagName = opening.name.name;
      const isRaw = isRawHtmlTag(tagName);

      if (isRaw) {
        rawElementCount++;

        // Tính độ sâu lồng nhau của các thẻ HTML trần
        let depth = 1;
        let p: any = path.parentPath;
        while (p) {
          if (
            p.isJSXElement?.() &&
            t.isJSXIdentifier(p.node.openingElement.name) &&
            isRawHtmlTag(p.node.openingElement.name.name)
          ) {
            depth++;
          }
          p = p.parentPath;
        }

        if (depth > maxRawDepthFound) {
          maxRawDepthFound = depth;
          deepestNodeLoc = opening.loc;
        }
      } else {
        customComponentCount++;
      }
    },
  });

  const totalElements = rawElementCount + customComponentCount;

  // 1. Cảnh báo độ sâu lồng thẻ HTML trần (Deep nesting in Page/Layout)
  if (maxRawDepthFound > config.max_raw_jsx_depth && deepestNodeLoc) {
    violations.push({
      ruleId: 'composition-violation',
      severity: config.severity,
      message: `Page / Layout has deeply nested raw HTML elements (depth: ${maxRawDepthFound} > limit: ${config.max_raw_jsx_depth}). Extract inner structure into a sub-component to keep Page composition-only.`,
      file: filePath,
      loc: {
        line: deepestNodeLoc.start.line,
        column: deepestNodeLoc.start.column,
        start: 0,
        end: 0,
      },
      rawText: `<depth: ${maxRawDepthFound}>`,
      metadata: {
        type: 'deep-nesting',
        maxRawDepthFound,
        limit: config.max_raw_jsx_depth,
      },
    });
  }

  // 2. Cảnh báo tỷ lệ thẻ HTML trần quá cao (Page nhồi nhét UI thô thay vì import component)
  if (totalElements >= 8) {
    const rawRatio = rawElementCount / totalElements;
    if (rawRatio > config.max_raw_element_ratio) {
      violations.push({
        ruleId: 'composition-violation',
        severity: config.severity,
        message: `Page has ${Math.round(rawRatio * 100)}% raw HTML elements (${rawElementCount}/${totalElements}). Pages should focus on composing custom components rather than declaring inline DOM elements.`,
        file: filePath,
        loc: {
          line: 1,
          column: 1,
          start: 0,
          end: 0,
        },
        rawText: `Raw HTML Ratio: ${Math.round(rawRatio * 100)}%`,
        metadata: {
          type: 'high-raw-element-ratio',
          rawElementCount,
          customComponentCount,
          rawRatio,
        },
      });
    }
  }

  return violations;
}
