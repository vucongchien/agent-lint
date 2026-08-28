import { describe, it, expect } from 'vitest';
import { scanI18nViolations } from '../src/i18n/scanner';
import { I18nRuleSchema } from '../src/config/schema';

describe('i18n Scanner', () => {
  const config = I18nRuleSchema.parse({
    enabled: true,
    severity: 'error',
    attributes: ['placeholder', 'title', 'alt', 'aria-label'],
    whitelist: ['&times;', 'OK'],
    ignore_patterns: ['^[0-9]+$', '^https?://'],
  });

  it('should detect hardcoded JSXText', () => {
    const code = `
      export function Greeting() {
        return (
          <div>
            <h1>Xin chào quý khách</h1>
            <p>Chào mừng đến với hệ sinh thái</p>
          </div>
        );
      }
    `;

    const violations = scanI18nViolations({
      filePath: 'src/Greeting.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(2);
    expect(violations[0].rawText).toBe('Xin chào quý khách');
    expect(violations[1].rawText).toBe('Chào mừng đến với hệ sinh thái');
  });

  it('should detect hardcoded JSXAttributes', () => {
    const code = `
      export function Form() {
        return (
          <input
            type="text"
            placeholder="Nhập họ và tên của bạn"
            title="Trường bắt buộc"
            aria-label="Tên người dùng"
          />
        );
      }
    `;

    const violations = scanI18nViolations({
      filePath: 'src/Form.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(3);
    const texts = violations.map((v) => v.rawText);
    expect(texts).toContain('Nhập họ và tên của bạn');
    expect(texts).toContain('Trường bắt buộc');
    expect(texts).toContain('Tên người dùng');
  });

  it('should ignore whitelisted strings, pure numbers, and URLs', () => {
    const code = `
      export function Sample() {
        return (
          <div>
            <span>OK</span>
            <span>12345</span>
            <a href="https://example.com">https://example.com</a>
          </div>
        );
      }
    `;

    const violations = scanI18nViolations({
      filePath: 'src/Sample.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(0);
  });
});
