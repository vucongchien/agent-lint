import path from 'path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { ArchitectureRuleConfig, Violation, LayerConfig } from '../types';

const traverse = (typeof _traverse === 'function' ? _traverse : (_traverse as any).default) as typeof _traverse;

export interface ScanArchitectureOptions {
  filePath: string;
  code: string;
  config: ArchitectureRuleConfig;
  rootDir?: string;
}

function matchGlobPattern(pattern: string, filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  const cleanPattern = pattern.replace(/^\.\//, '');

  const regexStr = cleanPattern
    .replace(/\*\*/g, '___DOUBLESTAR___')
    .replace(/\*/g, '[^/]*')
    .replace(/___DOUBLESTAR___/g, '.*')
    .replace(/\{([^}]+)\}/g, '($1)')
    .replace(/,/g, '|');
  return new RegExp(`^${regexStr}$`, 'i').test(normalized) || new RegExp(`${regexStr}$`, 'i').test(normalized);
}

/**
 * Xác định Layer mà một file thuộc về dựa trên danh sách layers đã cấu hình
 */
export function resolveFileLayer(filePath: string, layers: LayerConfig[]): LayerConfig | null {
  const normalized = filePath.replace(/\\/g, '/');
  for (const layer of layers) {
    if (matchGlobPattern(layer.path, normalized)) {
      return layer;
    }
  }
  return null;
}

/**
 * Xác định Layer từ chuỗi import (hỗ trợ path alias '@/...' và relative path '../...')
 */
export function resolveImportTargetLayer(
  importSource: string,
  currentFilePath: string,
  layers: LayerConfig[]
): { layer: LayerConfig | null; resolvedPath: string } {
  let resolved = importSource;

  // Xử lý path alias @/
  if (importSource.startsWith('@/')) {
    resolved = `src/${importSource.slice(2)}`;
  } else if (importSource.startsWith('.')) {
    // Xử lý relative import
    const dir = path.dirname(currentFilePath).replace(/\\/g, '/');
    resolved = path.posix.join(dir, importSource);
  }

  const layer = resolveFileLayer(resolved, layers);
  return { layer, resolvedPath: resolved };
}

/**
 * Quét vi phạm ranh giới kiến trúc (DDD, Hexagonal, Clean Architecture, FSD, Server/Client)
 */
export function scanArchitectureViolations(options: ScanArchitectureOptions): Violation[] {
  const { filePath, code, config } = options;
  if (!config || !config.enabled || config.severity === 'off') {
    return [];
  }

  const normalizedFilePath = filePath.replace(/\\/g, '/');
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

  const isClientComponent =
    code.includes('"use client"') ||
    code.includes("'use client'") ||
    normalizedFilePath.includes('.client.') ||
    normalizedFilePath.includes('/use-') ||
    normalizedFilePath.includes('/hooks/');

  const layers = config.layers || [];
  const currentLayer = resolveFileLayer(normalizedFilePath, layers);

  traverse(ast, {
    ImportDeclaration(path) {
      const importSource = path.node.source.value;
      const isTypeOnly = path.node.importKind === 'type';
      const loc = path.node.loc;
      if (!loc) return;

      // 1. Kiểm tra Ranh giới Server / Client trong Next.js
      if (isClientComponent && config.server_client_boundary?.enabled) {
        const disallowed = config.server_client_boundary.disallowed_imports || [];
        for (const badImport of disallowed) {
          const isMatch =
            importSource === badImport ||
            importSource.startsWith(`${badImport}/`) ||
            matchGlobPattern(badImport, importSource);

          if (isMatch) {
            violations.push({
              ruleId: 'server-client-boundary',
              severity: config.severity,
              message: `Server/Client Boundary Violation: Client Component cannot import server module "${importSource}".`,
              file: filePath,
              loc: {
                line: loc.start.line,
                column: loc.start.column,
                start: path.node.start ?? 0,
                end: path.node.end ?? 0,
              },
              rawText: `import from '${importSource}'`,
              metadata: {
                type: 'server-module-in-client',
                importSource,
              },
            });
          }
        }
      }

      // 2. Kiểm tra Domain Purity (Cấm ORM, Framework, Message Broker trong Domain)
      if (currentLayer && currentLayer.disallowed_packages) {
        for (const badPkg of currentLayer.disallowed_packages) {
          const isBad =
            importSource === badPkg ||
            importSource.startsWith(`${badPkg}/`) ||
            matchGlobPattern(badPkg, importSource);

          if (isBad) {
            violations.push({
              ruleId: 'domain-purity-violation',
              severity: config.severity,
              message: `Domain Purity Violation: Layer "${currentLayer.name}" is prohibited from importing package "${importSource}". ${currentLayer.message || ''}`,
              file: filePath,
              loc: {
                line: loc.start.line,
                column: loc.start.column,
                start: path.node.start ?? 0,
                end: path.node.end ?? 0,
              },
              rawText: `import from '${importSource}'`,
              metadata: {
                type: 'domain-contamination',
                layer: currentLayer.name,
                prohibitedPackage: importSource,
              },
            });
          }
        }
      }

      // 3. Kiểm tra Ma trận Phân tầng (Layer Hierarchy / FSD / Clean Arch)
      if (currentLayer) {
        const { layer: targetLayer, resolvedPath } = resolveImportTargetLayer(
          importSource,
          normalizedFilePath,
          layers
        );

        if (targetLayer && targetLayer.name !== currentLayer.name) {
          // Bỏ qua nếu là import type và bật allow_type_imports
          if (isTypeOnly && config.allow_type_imports) {
            return;
          }

          const isAllowed = currentLayer.can_import.includes(targetLayer.name);
          if (!isAllowed) {
            const customMsg = currentLayer.message ||
              `Layer Hierarchy Violation: Layer "${currentLayer.name}" cannot import from layer "${targetLayer.name}".`;

            violations.push({
              ruleId: 'architecture-layer-inversion',
              severity: config.severity,
              message: `${customMsg} (from: "${resolvedPath}")`,
              file: filePath,
              loc: {
                line: loc.start.line,
                column: loc.start.column,
                start: path.node.start ?? 0,
                end: path.node.end ?? 0,
              },
              rawText: `import from '${importSource}'`,
              metadata: {
                type: 'layer-inversion',
                sourceLayer: currentLayer.name,
                targetLayer: targetLayer.name,
                resolvedPath,
              },
            });
          }
        }
      }

      // 4. Kiểm tra Public API Encapsulation (Cấm chọc sâu vào ruột module khác)
      if (config.public_api?.enabled && (importSource.startsWith('@/features/') || importSource.startsWith('@/entities/'))) {
        const parts = importSource.split('/');
        // Ví dụ: @/features/auth/internal/secret -> length 4 > 3
        if (parts.length > 3 && !parts.slice(3).includes('index')) {
          violations.push({
            ruleId: 'public-api-violation',
            severity: config.severity,
            message: `Public API Violation: Deep internal import "${importSource}" is prohibited. Import from module root instead ("@/${parts[1]}/${parts[2]}").`,
            file: filePath,
            loc: {
              line: loc.start.line,
              column: loc.start.column,
              start: path.node.start ?? 0,
              end: path.node.end ?? 0,
            },
            rawText: `import from '${importSource}'`,
            metadata: {
              type: 'deep-internal-import',
              importSource,
              suggestedRoot: `@/${parts[1]}/${parts[2]}`,
            },
          });
        }
      }
    },
  });

  return violations;
}
