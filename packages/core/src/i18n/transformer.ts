import MagicString from 'magic-string';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { I18nRuleConfig, Violation } from '../types';
import { LocaleFileManager } from './locales';

const traverse = (typeof _traverse === 'function' ? _traverse : (_traverse as any).default) as typeof _traverse;

export interface TransformI18nOptions {
  filePath: string;
  code: string;
  violations: Violation[];
  config: I18nRuleConfig;
  localeManager: LocaleFileManager;
}

export interface TransformResult {
  code: string;
  hasChanged: boolean;
  keysAdded: { file: string; key: string; value: string }[];
}

export function transformI18nFile(options: TransformI18nOptions): TransformResult {
  const { filePath, code, violations, config, localeManager } = options;

  const i18nViolations = violations.filter((v) => v.ruleId === 'i18n-hardcoded' && v.suggestedFix);
  if (i18nViolations.length === 0) {
    return { code, hasChanged: false, keysAdded: [] };
  }

  const s = new MagicString(code);
  const keysAdded: { file: string; key: string; value: string }[] = [];
  const hookName = config.integration.hook_name;
  const funcName = config.integration.function_name;
  const importSource = config.integration.import_source;

  // 1. Thay thế các đoạn code vi phạm
  for (const violation of i18nViolations) {
    const rawText = violation.rawText;
    let keyToUse = localeManager.findKeyByValue(rawText);

    if (!keyToUse) {
      keyToUse = violation.suggestedFix?.generatedKey || 'text';
      const { targetFiles } = localeManager.addKey(keyToUse, rawText);
      for (const targetFile of targetFiles) {
        keysAdded.push({ file: targetFile, key: keyToUse, value: rawText });
      }
    }

    const { start, end } = violation.loc;
    if (start >= 0 && end > start) {
      if (violation.metadata?.nodeType === 'JSXAttribute') {
        // attribute: placeholder="Text" -> placeholder={t('key')}
        s.overwrite(start, end, `{${funcName}('${keyToUse}')}`);
      } else {
        // JSXText: <div>Text</div> -> <div>{t('key')}</div>
        s.overwrite(start, end, `{${funcName}('${keyToUse}')}`);
      }
    }
  }

  // 2. Kiểm tra và inject import / hook nếu cần
  if (config.integration.auto_import) {
    let ast: any;
    try {
      ast = parse(s.toString(), {
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

      let hasImport = false;
      let hasHookCall = false;
      let firstComponentBodyStart: number | null = null;

      traverse(ast, {
        ImportDeclaration(path) {
          if (path.node.source.value === importSource) {
            const hasSpecifier = path.node.specifiers.some(
              (spec) =>
                t.isImportSpecifier(spec) &&
                t.isIdentifier(spec.imported) &&
                spec.imported.name === hookName
            );
            if (hasSpecifier) {
              hasImport = true;
            }
          }
        },
        CallExpression(path) {
          if (t.isIdentifier(path.node.callee) && path.node.callee.name === hookName) {
            hasHookCall = true;
          }
        },
        FunctionDeclaration(path) {
          if (firstComponentBodyStart === null && path.node.body && t.isBlockStatement(path.node.body)) {
            firstComponentBodyStart = path.node.body.start! + 1;
          }
        },
        ArrowFunctionExpression(path) {
          if (firstComponentBodyStart === null && path.node.body && t.isBlockStatement(path.node.body)) {
            firstComponentBodyStart = path.node.body.start! + 1;
          }
        },
        FunctionExpression(path) {
          if (firstComponentBodyStart === null && path.node.body && t.isBlockStatement(path.node.body)) {
            firstComponentBodyStart = path.node.body.start! + 1;
          }
        },
      });

      // Inject import if missing
      if (!hasImport) {
        s.prepend(`import { ${hookName} } from '${importSource}';\n`);
      }

      // Inject hook call: const t = useTranslations();
      if (!hasHookCall && firstComponentBodyStart !== null) {
        s.appendLeft(firstComponentBodyStart, `\n  const ${funcName} = ${hookName}();`);
      }
    } catch {
      // If AST re-parse fails, keep string transformations
    }
  }

  return {
    code: s.toString(),
    hasChanged: true,
    keysAdded,
  };
}
