import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import * as t from '@babel/types';

const traverse = (typeof _traverse === 'function' ? _traverse : (_traverse as any).default) as typeof _traverse;

export interface DeadKeyScanResult {
  usedKeys: Set<string>;
  totalKeysInLocales: number;
  deadKeys: string[];
  localeFiles: string[];
}

/**
 * Trích xuất tất cả các translation key được gọi trong mã nguồn
 */
export function extractUsedTranslationKeys(rootDir: string, includePatterns: string[] = ['src/**/*.{tsx,jsx,ts,js}']): Set<string> {
  const files = fg.sync(includePatterns, {
    cwd: rootDir,
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
    absolute: true,
  });

  const usedKeys = new Set<string>();

  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const code = fs.readFileSync(file, 'utf-8');

    let ast: any;
    try {
      ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'decorators-legacy'],
      });
    } catch {
      continue;
    }

    // Theo dõi namespaces từ hook, ví dụ: const t = useTranslations('auth')
    let defaultNamespace = '';

    traverse(ast, {
      CallExpression(path) {
        // 1. Kiểm tra useTranslations('auth')
        if (
          t.isIdentifier(path.node.callee) &&
          ['useTranslations', 'useTranslation'].includes(path.node.callee.name)
        ) {
          const firstArg = path.node.arguments[0];
          if (t.isStringLiteral(firstArg)) {
            defaultNamespace = firstArg.value;
          }
        }

        // 2. Kiểm tra hàm t('key') hoặc t.rich('key')
        const isTCall =
          (t.isIdentifier(path.node.callee) && path.node.callee.name === 't') ||
          (t.isMemberExpression(path.node.callee) &&
            t.isIdentifier(path.node.callee.object) &&
            path.node.callee.object.name === 't');

        if (isTCall) {
          const firstArg = path.node.arguments[0];
          if (t.isStringLiteral(firstArg)) {
            const rawKey = firstArg.value;
            usedKeys.add(rawKey);
            if (defaultNamespace) {
              usedKeys.add(`${defaultNamespace}.${rawKey}`);
            }
          }
        }
      },
    });
  }

  return usedKeys;
}

/**
 * Lấy tất cả các keys trong dictionary (bao gồm cả nested keys)
 */
export function flattenDictionaryKeys(obj: Record<string, any>, prefix: string = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      keys.push(...flattenDictionaryKeys(v, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/**
 * Tìm các key không còn được sử dụng (Dead Keys)
 */
export function findDeadTranslationKeys(
  rootDir: string,
  localesDir: string = 'locales',
  includePatterns?: string[]
): DeadKeyScanResult {
  const resolvedLocalesDir = path.isAbsolute(localesDir)
    ? localesDir
    : path.resolve(rootDir, localesDir);

  const usedKeys = extractUsedTranslationKeys(rootDir, includePatterns);
  const deadKeysSet = new Set<string>();
  let totalKeysInLocales = 0;
  const localeFiles: string[] = [];

  if (fs.existsSync(resolvedLocalesDir)) {
    const files = fs.readdirSync(resolvedLocalesDir).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      const fullPath = path.join(resolvedLocalesDir, file);
      localeFiles.push(fullPath);
      try {
        const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        const allKeys = flattenDictionaryKeys(content);
        totalKeysInLocales = Math.max(totalKeysInLocales, allKeys.length);

        for (const key of allKeys) {
          if (!usedKeys.has(key)) {
            deadKeysSet.add(key);
          }
        }
      } catch {
        // ignore
      }
    }
  }

  return {
    usedKeys,
    totalKeysInLocales,
    deadKeys: Array.from(deadKeysSet),
    localeFiles,
  };
}

/**
 * Xóa các key thừa (Prune) khỏi file từ điển JSON
 */
export function pruneDeadKeysFromFile(filePath: string, deadKeysToDelete: string[]): { removedCount: number } {
  if (!fs.existsSync(filePath)) return { removedCount: 0 };
  const deadSet = new Set(deadKeysToDelete);
  let removedCount = 0;

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    function removeKeys(obj: Record<string, any>, currentPath: string = ''): void {
      for (const key of Object.keys(obj)) {
        const fullKey = currentPath ? `${currentPath}.${key}` : key;
        if (deadSet.has(fullKey)) {
          delete obj[key];
          removedCount++;
        } else if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          removeKeys(obj[key], fullKey);
          if (Object.keys(obj[key]).length === 0) {
            delete obj[key];
          }
        }
      }
    }

    removeKeys(data);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    return { removedCount };
  } catch {
    return { removedCount: 0 };
  }
}
