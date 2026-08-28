import { describe, it, expect } from 'vitest';
import { removeVietnameseAccents, generateI18nKey } from '../src/i18n/slug';

describe('i18n Slug & Key Generation', () => {
  it('should remove Vietnamese accents correctly', () => {
    expect(removeVietnameseAccents('Đăng nhập hệ thống')).toBe('Dang nhap he thong');
    expect(removeVietnameseAccents('Trang chủ & Cài đặt')).toBe('Trang chu & Cai dat');
  });

  it('should generate snake_case slug by default', () => {
    const key = generateI18nKey('Đăng nhập hệ thống');
    expect(key).toBe('dang_nhap_he_thong');
  });

  it('should generate camelCase keys when configured', () => {
    const key = generateI18nKey('Đăng nhập hệ thống', { strategy: 'camelCase' });
    expect(key).toBe('dangNhapHeThong');
  });

  it('should generate file_scoped keys when filePath is provided', () => {
    const key = generateI18nKey('Đăng nhập', {
      strategy: 'file_scoped',
      filePath: 'src/components/LoginForm.tsx',
    });
    expect(key).toBe('LoginForm.dang_nhap');
  });

  it('should respect prefix and maxLength settings', () => {
    const key = generateI18nKey('Đây là một tiêu đề rất dài cần phải cắt bớt', {
      prefix: 'common.',
      maxLength: 20,
    });
    expect(key.startsWith('common.')).toBe(true);
    expect(key.length).toBeLessThanOrEqual('common.'.length + 20);
  });
});
