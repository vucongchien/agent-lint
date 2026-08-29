import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { scanSecurityAndSecrets } from '../src/security/sast-scanner';

describe('Security & Secrets Scanner', () => {
  const tempDir = path.resolve(__dirname, '__temp_sec__');

  beforeEach(() => {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should detect exposed Stripe keys and database connection strings', () => {
    fs.writeFileSync(
      path.join(tempDir, 'src', 'config.ts'),
      `export const API_KEY = "secret_token_1234567890abcdefghijklmnop";
       export const DB_URI = "postgres://user:pass123@localhost:5432/production_db";`
    );

    const metrics = scanSecurityAndSecrets(tempDir);
    expect(metrics.secretsLeakedCount).toBe(2);
    expect(metrics.score).toBeLessThan(70);
  });

  it('should detect dangerouslySetInnerHTML and eval() SAST violations', () => {
    fs.writeFileSync(
      path.join(tempDir, 'src', 'Danger.tsx'),
      `export function Danger({ html, code }) {
         eval(code);
         return <div dangerouslySetInnerHTML={{ __html: html }} />;
       }`
    );

    const metrics = scanSecurityAndSecrets(tempDir);
    expect(metrics.sastIssuesCount).toBe(2);
    expect(metrics.violations.some((v) => v.message.includes('dangerouslySetInnerHTML'))).toBe(true);
    expect(metrics.violations.some((v) => v.message.includes('eval()'))).toBe(true);
  });
});
