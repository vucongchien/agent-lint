import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { SecurityMetrics, SecurityViolation } from '../types';

const SECRET_PATTERNS: { name: string; pattern: RegExp; severity: SecurityViolation['severity'] }[] = [
  {
    name: 'Stripe Secret Key',
    pattern: /sk_live_[0-9a-zA-Z]{24}/i,
    severity: 'critical',
  },
  {
    name: 'Database Connection String',
    pattern: /(?:postgres|postgresql|mongodb|mysql):\/\/[a-zA-Z0-9_-]+:[^@\s]+@[a-zA-Z0-9.-]+(?::\d+)?\/[^\s]+/i,
    severity: 'critical',
  },
  {
    name: 'Private Cryptographic Key',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
    severity: 'critical',
  },
  {
    name: 'Generic Hardcoded API Secret Token',
    pattern: /(?:api[_-]?key|secret[_-]?token|auth[_-]?token)\s*[:=]\s*["'][a-zA-Z0-9-_]{20,}["']/i,
    severity: 'high',
  },
  {
    name: 'Hardcoded JSON Web Token (JWT)',
    pattern: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/,
    severity: 'high',
  },
];

/**
 * Quét toàn diện An Ninh Tĩnh (SAST) và Rò Rỉ Bí Mật (Secret Sniffer)
 */
export function scanSecurityAndSecrets(rootDir: string = process.cwd()): SecurityMetrics {
  const resolvedRoot = path.resolve(rootDir);
  const targetFiles = fg.sync(['src/**/*.{tsx,jsx,ts,js,json}', '.env*', 'config/**/*.{ts,js,json}'], {
    cwd: resolvedRoot,
    absolute: true,
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/*.test.*', '**/*.spec.*'],
  });

  const violations: SecurityViolation[] = [];
  let secretsCount = 0;
  let sastCount = 0;

  for (const filePath of targetFiles) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf-8');
    const relPath = path.relative(resolvedRoot, filePath).replace(/\\/g, '/');

    // 1. Quét Secret Patterns
    for (const rule of SECRET_PATTERNS) {
      const match = rule.pattern.exec(content);
      if (match) {
        secretsCount++;
        const line = content.substring(0, match.index).split('\n').length;
        violations.push({
          id: `sec_leak_${violations.length + 1}`,
          type: 'secret_leak',
          severity: rule.severity,
          message: `Detected exposed ${rule.name}`,
          location: { file: relPath, line },
          evidence: match[0].substring(0, 30) + '...',
        });
      }
    }

    // 2. Quét AST SAST cho JS/TS
    const ext = path.extname(filePath);
    if (['.tsx', '.jsx', '.ts', '.js'].includes(ext)) {
      try {
        const ast = parse(content, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript'],
        });

        traverse(ast, {
          JSXAttribute(nodePath) {
            // Check dangerouslySetInnerHTML
            if (t.isJSXIdentifier(nodePath.node.name) && nodePath.node.name.name === 'dangerouslySetInnerHTML') {
              sastCount++;
              const loc = nodePath.node.loc?.start;
              violations.push({
                id: `sec_sast_${violations.length + 1}`,
                type: 'sast',
                severity: 'high',
                message: 'Use of dangerouslySetInnerHTML poses severe XSS injection risk',
                location: loc ? { file: relPath, line: loc.line } : undefined,
              });
            }

            // Check javascript: href
            if (
              t.isJSXIdentifier(nodePath.node.name) &&
              nodePath.node.name.name === 'href' &&
              t.isStringLiteral(nodePath.node.value) &&
              nodePath.node.value.value.toLowerCase().startsWith('javascript:')
            ) {
              sastCount++;
              const loc = nodePath.node.loc?.start;
              violations.push({
                id: `sec_sast_${violations.length + 1}`,
                type: 'sast',
                severity: 'critical',
                message: 'javascript: pseudo-protocol in href allows arbitrary script execution',
                location: loc ? { file: relPath, line: loc.line } : undefined,
              });
            }
          },

          CallExpression(nodePath) {
            // Check eval()
            if (t.isIdentifier(nodePath.node.callee) && nodePath.node.callee.name === 'eval') {
              sastCount++;
              const loc = nodePath.node.loc?.start;
              violations.push({
                id: `sec_sast_${violations.length + 1}`,
                type: 'sast',
                severity: 'critical',
                message: 'Use of eval() is strictly prohibited due to code injection vulnerabilities',
                location: loc ? { file: relPath, line: loc.line } : undefined,
              });
            }
          },
        });
      } catch {
        // Skip parse errors
      }
    }
  }

  // Tính điểm bảo mật (0 - 100)
  let score = 100;
  for (const v of violations) {
    if (v.severity === 'critical') score -= 30;
    else if (v.severity === 'high') score -= 15;
    else if (v.severity === 'medium') score -= 5;
  }
  if (score < 0) score = 0;

  return {
    score,
    violations,
    secretsLeakedCount: secretsCount,
    sastIssuesCount: sastCount,
  };
}
