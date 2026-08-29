import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { AgentLintEngine } from '../src/engine';

describe('AgentLintEngine End-to-End', () => {
  const tempDir = path.resolve(__dirname, '__temp_engine__');

  beforeEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'locales'), { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should scan files and return structured violations', () => {
    const filePath = path.join(tempDir, 'src', 'App.tsx');
    fs.writeFileSync(
      filePath,
      `export function App() {
        return <div className="bg-[#1e293b]"><h1>Đăng nhập hệ thống</h1></div>;
      }`
    );

    const engine = new AgentLintEngine({ rootDir: tempDir });
    const result = engine.scan([filePath]);

    expect(result.filesScanned).toBe(1);
    expect(result.violations.length).toBe(2);
    expect(result.violations.some((v) => v.ruleId === 'i18n-hardcoded')).toBe(true);
    expect(result.violations.some((v) => v.ruleId === 'token-violation')).toBe(true);
  });

  it('should auto-fix i18n violations and write to dictionary', () => {
    const filePath = path.join(tempDir, 'src', 'Login.tsx');
    fs.writeFileSync(
      filePath,
      `export function Login() {
        return <div><button>Xác nhận</button></div>;
      }`
    );

    const engine = new AgentLintEngine({ rootDir: tempDir });
    const fixResult = engine.fix([filePath]);

    expect(fixResult.filesModified).toContain(filePath);
    expect(fixResult.violationsFixed).toBe(2); // 1 i18n + 1 restricted component (<button> -> <Button>)

    const updatedCode = fs.readFileSync(filePath, 'utf-8');
    expect(updatedCode).toContain("{t('xac_nhan')}");
    expect(updatedCode).toContain("useTranslations");
    expect(updatedCode).toContain("<Button>{t('xac_nhan')}</Button>");
    expect(updatedCode).toContain("import { Button } from '@/components/ui/button';");

    const viJsonPath = path.join(tempDir, 'locales', 'vi.json');
    expect(fs.existsSync(viJsonPath)).toBe(true);
    const viData = JSON.parse(fs.readFileSync(viJsonPath, 'utf-8'));
    expect(viData['xac_nhan']).toBe('Xác nhận');
  });

  it('should selectively scan only specified categories with options.only', () => {
    const filePath = path.join(tempDir, 'src', 'App.tsx');
    fs.writeFileSync(
      filePath,
      `export function App() {
        return <div className="bg-[#1e293b]"><h1>Đăng nhập hệ thống</h1></div>;
      }`
    );

    const engine = new AgentLintEngine({ rootDir: tempDir });

    // Chỉ quét i18n
    const i18nOnlyResult = engine.scan([filePath], { only: ['i18n'] });
    expect(i18nOnlyResult.violations.length).toBe(1);
    expect(i18nOnlyResult.violations[0].ruleId).toBe('i18n-hardcoded');

    // Chỉ quét tokens
    const tokensOnlyResult = engine.scan([filePath], { only: ['tokens'] });
    expect(tokensOnlyResult.violations.length).toBe(1);
    expect(tokensOnlyResult.violations[0].ruleId).toBe('token-violation');
  });
});
