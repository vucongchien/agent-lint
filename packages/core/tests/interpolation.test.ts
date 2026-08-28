import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { scanI18nViolations } from '../src/i18n/scanner';
import { transformI18nFile } from '../src/i18n/transformer';
import { LocaleFileManager } from '../src/i18n/locales';
import { I18nRuleSchema } from '../src/config/schema';

describe('Template Literal & Interpolation Support', () => {
  const tempDir = path.resolve(__dirname, '__temp_interpolation__');
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

  it('should detect dynamic template literals with variables in JSX', () => {
    const config = I18nRuleSchema.parse({ enabled: true });
    const code = `
      export function Banner({ user, count }) {
        return (
          <div>
            <h1>{\`Xin chào \${user.name}, bạn có \${count} thông báo mới\`}</h1>
          </div>
        );
      }
    `;

    const violations = scanI18nViolations({
      filePath: 'src/Banner.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(1);
    expect(violations[0].rawText).toBe('Xin chào {name}, bạn có {count} thông báo mới');
    expect(violations[0].suggestedFix?.replacement).toContain("t('xin_chao_name_ban_co_count_thong_bao_moi', { name: user.name, count })");
  });

  it('should auto-transform template literals and update dictionary with ICU format', () => {
    const config = I18nRuleSchema.parse({ enabled: true });
    const code = `export function Card({ title, index }) {
  return <div>{\`Mục thứ \${index + 1}: \${title}\`}</div>;
}`;

    const filePath = 'src/Card.tsx';
    const violations = scanI18nViolations({
      filePath,
      code,
      config,
    });

    const result = transformI18nFile({
      filePath,
      code,
      violations,
      config,
      localeManager,
    });

    expect(result.hasChanged).toBe(true);
    expect(result.code).toContain("t('muc_thu_val1_title', { val1: index + 1, title })");

    const viData = localeManager.readLocale('vi');
    expect(viData['muc_thu_val1_title']).toBe('Mục thứ {val1}: {title}');
  });
});
