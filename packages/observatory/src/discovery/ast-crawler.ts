import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { ActionElement, RouteDiscoveryInfo } from '../types';
import { classifyActionRisk } from '../planner/risk-classifier';

/**
 * Tự động quét và lập bản đồ toàn bộ Routes & Tương tác trong project
 */
export function crawlProjectRoutes(rootDir: string = process.cwd()): RouteDiscoveryInfo[] {
  const resolvedRoot = path.resolve(rootDir);
  const routeFiles = fg.sync(
    [
      'src/app/**/page.{tsx,jsx,js}',
      'app/**/page.{tsx,jsx,js}',
      'src/pages/**/*.{tsx,jsx,js}',
      'pages/**/*.{tsx,jsx,js}',
      'src/app/api/**/route.{ts,js}',
      'app/api/**/route.{ts,js}',
    ],
    {
      cwd: resolvedRoot,
      absolute: true,
      ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
    }
  );

  const results: RouteDiscoveryInfo[] = [];

  for (const filePath of routeFiles) {
    const relPath = path.relative(resolvedRoot, filePath).replace(/\\/g, '/');
    let routePath = '/';
    let isApi = false;

    // Phân tích đường dẫn route Next.js
    if (relPath.includes('/api/')) {
      isApi = true;
      routePath = relPath
        .replace(/^(src\/)?app/, '')
        .replace(/^(src\/)?pages/, '')
        .replace(/\/route\.[a-z]+$/, '')
        .replace(/\.[a-z]+$/, '');
    } else {
      routePath = relPath
        .replace(/^(src\/)?app/, '')
        .replace(/^(src\/)?pages/, '')
        .replace(/\/page\.[a-z]+$/, '')
        .replace(/\.[a-z]+$/, '');
      if (!routePath) routePath = '/';
    }

    const isDynamic = routePath.includes('[') || routePath.includes(':');

    // Phân tích AST của file để bóc tách buttons, forms, links
    const elements: ActionElement[] = [];
    if (!isApi && fs.existsSync(filePath)) {
      try {
        const code = fs.readFileSync(filePath, 'utf-8');
        const ast = parse(code, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript'],
        });

        traverse(ast, {
          JSXElement(nodePath) {
            const opening = nodePath.node.openingElement;
            if (!t.isJSXIdentifier(opening.name)) return;
            const tagName = opening.name.name;

            if (['button', 'Button', 'a', 'Link', 'input', 'select', 'textarea'].includes(tagName)) {
              let textContent = '';
              let href = '';
              let ariaLabel = '';

              for (const attr of opening.attributes) {
                if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
                  if (attr.name.name === 'href' && t.isStringLiteral(attr.value)) {
                    href = attr.value.value;
                  }
                  if (attr.name.name === 'aria-label' && t.isStringLiteral(attr.value)) {
                    ariaLabel = attr.value.value;
                  }
                }
              }

              // Lấy text trực tiếp trong node con
              for (const child of nodePath.node.children) {
                if (t.isJSXText(child)) {
                  textContent += child.value.trim() + ' ';
                }
              }
              textContent = textContent.trim();

              const loc = nodePath.node.loc?.start;
              const classification = classifyActionRisk({
                tag: tagName.toLowerCase(),
                text: textContent,
                href,
                ariaLabel,
              });

              elements.push({
                id: `act_${elements.length + 1}`,
                tag: tagName,
                text: textContent || ariaLabel || href || tagName,
                location: loc ? { file: relPath, line: loc.line, column: loc.column } : undefined,
                riskLevel: classification.riskLevel,
                riskReason: classification.reason,
              });
            }
          },
        });
      } catch {
        // Fallback gracefully nếu có lỗi parse file đơn lẻ
      }
    }

    results.push({
      path: routePath,
      filePath: relPath,
      type: isApi ? 'api' : 'page',
      elements,
      isDynamic,
    });
  }

  return results;
}
