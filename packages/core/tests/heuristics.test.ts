import { describe, it, expect } from 'vitest';
import { isTranslatableText } from '../src/i18n/heuristics';
import { scanI18nViolations } from '../src/i18n/scanner';
import { I18nRuleSchema } from '../src/config/schema';

describe('Heuristics & False-Positive Prevention', () => {
  it('should reject non-translatable technical strings', () => {
    expect(isTranslatableText('100%')).toBe(false);
    expect(isTranslatableText('16px')).toBe(false);
    expect(isTranslatableText('https://antigravity.google.com')).toBe(false);
    expect(isTranslatableText('/api/v1/users')).toBe(false);
    expect(isTranslatableText('icon_avatar.svg')).toBe(false);
    expect(isTranslatableText('#1e293b')).toBe(false);
    expect(isTranslatableText('user@example.com')).toBe(false);
    expect(isTranslatableText('SCREAMING_SNAKE_CASE')).toBe(false);
    expect(isTranslatableText('camelCaseIdentifier')).toBe(false);
    expect(isTranslatableText('2026-08-28')).toBe(false);
    expect(isTranslatableText('&copy;')).toBe(false);
  });

  it('should accept genuine natural language strings', () => {
    expect(isTranslatableText('Đăng nhập hệ thống')).toBe(true);
    expect(isTranslatableText('Welcome back, please sign in')).toBe(true);
    expect(isTranslatableText('Xác nhận mật khẩu')).toBe(true);
    expect(isTranslatableText('Invalid email format')).toBe(true);
  });

  it('should completely ignore technical tags (svg, code, script, style)', () => {
    const config = I18nRuleSchema.parse({ enabled: true });
    const code = `
      export function Tech() {
        return (
          <div>
            <code>const API_KEY = "SECRET_123";</code>
            <pre>git checkout -b feature/i18n</pre>
            <svg viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </div>
        );
      }
    `;

    const violations = scanI18nViolations({
      filePath: 'src/Tech.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(0);
  });

  it('should ignore technical attributes (type, id, className, data-testid)', () => {
    const config = I18nRuleSchema.parse({ enabled: true });
    const code = `
      export function Input() {
        return (
          <input
            type="submit"
            id="user-submit-btn"
            className="btn btn-primary"
            data-testid="submit-button"
            aria-hidden="true"
          />
        );
      }
    `;

    const violations = scanI18nViolations({
      filePath: 'src/Input.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(0);
  });
});
