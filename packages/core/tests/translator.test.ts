import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  MockTranslationProvider,
  CachedTranslationProvider,
} from '../src/i18n/translator';
import { LocaleFileManager } from '../src/i18n/locales';

describe('AI Auto-Translation Provider & Cache', () => {
  const tempDir = path.resolve(__dirname, '__temp_translator__');

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

  it('should translate known strings using MockTranslationProvider', async () => {
    const mock = new MockTranslationProvider();
    const translated = await mock.translate('Đăng nhập', 'vi', 'en');
    expect(translated).toBe('Sign in');
  });

  it('should cache translations to avoid redundant provider calls', async () => {
    const mock = new MockTranslationProvider();
    const cached = new CachedTranslationProvider(mock);

    const first = await cached.translate('Xác nhận', 'vi', 'en');
    const second = await cached.translate('Xác nhận', 'vi', 'en');

    expect(first).toBe('Confirm');
    expect(second).toBe('Confirm');
  });

  it('should auto-populate translated values into secondary locale files via addKeyAsync', async () => {
    const manager = new LocaleFileManager({
      rootDir: tempDir,
      localesDir: 'locales',
      defaultLocale: 'vi',
      supportedLocales: ['vi', 'en'],
      fileFormat: 'json',
    });

    const mock = new MockTranslationProvider();
    await manager.addKeyAsync('btn_sign_up', 'Đăng ký', { translator: mock });

    const viData = manager.readLocale('vi');
    const enData = manager.readLocale('en');

    expect(viData['btn_sign_up']).toBe('Đăng ký');
    expect(enData['btn_sign_up']).toBe('Sign up');
  });
});
