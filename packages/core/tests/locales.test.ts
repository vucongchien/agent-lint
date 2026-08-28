import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { LocaleFileManager } from '../src/i18n/locales';

describe('Locale File Manager', () => {
  const tempDir = path.resolve(__dirname, '__temp_locales__');

  beforeEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should create default and secondary locale files with correct content', () => {
    const manager = new LocaleFileManager({
      rootDir: tempDir,
      localesDir: 'locales',
      defaultLocale: 'vi',
      supportedLocales: ['vi', 'en'],
      fileFormat: 'json',
    });

    const { targetFiles, keyAdded } = manager.addKey('welcome_title', 'Chào mừng bạn');
    expect(keyAdded).toBe('welcome_title');
    expect(targetFiles.length).toBe(2);

    const viData = manager.readLocale('vi');
    const enData = manager.readLocale('en');

    expect(viData['welcome_title']).toBe('Chào mừng bạn');
    expect(enData['welcome_title']).toBe('[TODO: TRANSLATE] Chào mừng bạn');
  });

  it('should find existing key by value to avoid duplicate keys', () => {
    const manager = new LocaleFileManager({
      rootDir: tempDir,
      localesDir: 'locales',
      defaultLocale: 'vi',
      supportedLocales: ['vi'],
      fileFormat: 'json',
    });

    manager.addKey('btn_login', 'Đăng nhập');
    const foundKey = manager.findKeyByValue('Đăng nhập');
    expect(foundKey).toBe('btn_login');
  });

  it('should handle nested dot keys properly', () => {
    const manager = new LocaleFileManager({
      rootDir: tempDir,
      localesDir: 'locales',
      defaultLocale: 'vi',
      supportedLocales: ['vi'],
      fileFormat: 'json',
    });

    manager.addKey('auth.form.submit', 'Gửi yêu cầu');
    const viData = manager.readLocale('vi');
    expect(viData.auth?.form?.submit).toBe('Gửi yêu cầu');
  });
});
