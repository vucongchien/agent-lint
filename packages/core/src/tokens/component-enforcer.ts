import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import * as t from '@babel/types';
import MagicString from 'magic-string';
import type { EnforceComponentsConfig, Violation } from '../types';

const traverse = (typeof _traverse === 'function' ? _traverse : (_traverse as any).default) as typeof _traverse;

export interface ScanComponentEnforceOptions {
  filePath: string;
  code: string;
  config: EnforceComponentsConfig;
}

/**
 * Quét các thẻ HTML trần bị hạn chế và yêu cầu dùng Custom Component từ Design System
 */
export function scanRestrictedComponents(options: ScanComponentEnforceOptions): Violation[] {
  const { filePath, code, config } = options;
  if (!config || !config.enabled || config.severity === 'off') {
    return [];
  }

  const restrictedMap = config.restricted_elements || {};
  if (Object.keys(restrictedMap).length === 0) {
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
      ],
    });
  } catch {
    return [];
  }

  // Chuẩn hóa filePath để check exemption (ví dụ: không bắt <button> bên trong Button.tsx)
  const normalizedFilePath = filePath.replace(/\\/g, '/').toLowerCase();

  traverse(ast, {
    JSXElement(path) {
      const opening = path.node.openingElement;
      if (!t.isJSXIdentifier(opening.name)) return;

      const tagName = opening.name.name;
      const restrictedConfig = restrictedMap[tagName.toLowerCase()];
      if (!restrictedConfig) return;

      // Miễn trừ nếu file hiện tại chính là file định nghĩa custom component đó
      const fromPathLower = restrictedConfig.from.toLowerCase();
      if (
        normalizedFilePath.includes(fromPathLower.replace(/^@\//, '')) ||
        normalizedFilePath.endsWith(`${restrictedConfig.use.toLowerCase()}.tsx`) ||
        normalizedFilePath.endsWith(`${restrictedConfig.use.toLowerCase()}.jsx`)
      ) {
        return;
      }

      const loc = opening.loc;
      if (!loc) return;

      const customMessage = restrictedConfig.message ||
        `Raw HTML element <${tagName}> is restricted by Design System. Use <${restrictedConfig.use} /> imported from "${restrictedConfig.from}".`;

      violations.push({
        ruleId: 'restricted-element',
        severity: config.severity,
        message: customMessage,
        file: filePath,
        loc: {
          line: loc.start.line,
          column: loc.start.column,
          start: path.node.start ?? 0,
          end: path.node.end ?? 0,
        },
        rawText: `<${tagName}>`,
        suggestedFix: {
          type: 'replace-tag',
          replacement: restrictedConfig.use,
          targetComponent: restrictedConfig.use,
          importFrom: restrictedConfig.from,
        },
        metadata: {
          originalTag: tagName,
          targetComponent: restrictedConfig.use,
          importFrom: restrictedConfig.from,
          openingStart: opening.name.start,
          openingEnd: opening.name.end,
          closingStart: path.node.closingElement?.name?.start,
          closingEnd: path.node.closingElement?.name?.end,
        },
      });
    },
  });

  return violations;
}

/**
 * Tự động sửa thẻ HTML trần sang Custom Component và inject import
 */
export function transformRestrictedComponents(
  code: string,
  violations: Violation[]
): { code: string; hasChanged: boolean } {
  const compViolations = violations.filter((v) => v.ruleId === 'restricted-element' && v.metadata);
  if (compViolations.length === 0) {
    return { code, hasChanged: false };
  }

  const s = new MagicString(code);
  const importsToInject = new Map<string, Set<string>>(); // from -> Set of component names

  for (const v of compViolations) {
    const meta = v.metadata!;
    const targetComp = meta.targetComponent;
    const importFrom = meta.importFrom;

    if (meta.openingStart !== undefined && meta.openingEnd !== undefined) {
      s.overwrite(meta.openingStart, meta.openingEnd, targetComp);
    }
    if (meta.closingStart !== undefined && meta.closingEnd !== undefined) {
      s.overwrite(meta.closingStart, meta.closingEnd, targetComp);
    }

    if (importFrom && targetComp) {
      if (!importsToInject.has(importFrom)) {
        importsToInject.set(importFrom, new Set());
      }
      importsToInject.get(importFrom)!.add(targetComp);
    }
  }

  // Inject imports at top of file
  let importStatements = '';
  for (const [from, compSet] of importsToInject.entries()) {
    const comps = Array.from(compSet).join(', ');
    // Kiểm tra xem đã có import từ source này chưa
    if (!code.includes(`from '${from}'`) && !code.includes(`from "${from}"`)) {
      importStatements += `import { ${comps} } from '${from}';\n`;
    }
  }

  if (importStatements) {
    s.prepend(importStatements);
  }

  return {
    code: s.toString(),
    hasChanged: true,
  };
}
