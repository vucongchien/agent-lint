import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { scanI18nViolations } from '../src/i18n/scanner';
import { transformI18nFile } from '../src/i18n/transformer';
import { LocaleFileManager } from '../src/i18n/locales';
import { I18nRuleSchema } from '../src/config/schema';

describe('i18n Code Transformer', () => {
  const tempDir = path.resolve(__dirname, '__temp_transform__');
  let localeManager: LocaleFileManager;

  beforeEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    localeManager = new LocaleFileManager({
      rootDir: tempDir,
      localesDir: 'locales',
      defaultLocale: 'vi',
      supportedLocales: ['vi', 'en'],
      fileFormat: 'json',
    });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should replace hardcoded text with hook calls and auto-inject import and hook', () => {
    const config = I18nRuleSchema.parse({
      enabled: true,
      integration: {
        framework: 'next-intl',
        hook_name: 'useTranslations',
        function_name: 't',
        auto_import: true,
        import_source: 'next-intl',
      },
    });

    const originalCode = `export function Header() {
  return (
    <header>
      <h1>Trang chủ</h1>
    </header>
  );
}`;

    const filePath = 'src/Header.tsx';
    const violations = scanI18nViolations({
      filePath,
      code: originalCode,
      config,
    });

    expect(violations.length).toBe(1);

    const result = transformI18nFile({
      filePath,
      code: originalCode,
      violations,
      config,
      localeManager,
    });

    expect(result.hasChanged).toBe(true);
    expect(result.code).toContain("import { useTranslations } from 'next-intl';");
    expect(result.code).toContain("const t = useTranslations();");
    expect(result.code).toContain("{t('trang_chu')}");

    // Verify locale files updated
    const viData = localeManager.readLocale('vi');
    expect(viData['trang_chu']).toBe('Trang chủ');
  });
});
