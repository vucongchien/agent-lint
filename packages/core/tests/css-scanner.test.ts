import { describe, it, expect } from 'vitest';
import { scanCssFileViolations } from '../src/tokens/css-scanner';
import { DesignTokensRuleSchema } from '../src/config/schema';

describe('CSS & SCSS File Token Scanner', () => {
  const config = DesignTokensRuleSchema.parse({
    enabled: true,
    severity: 'warn',
    enforce: {
      colors: true,
      spacing: true,
      font_sizes: true,
    },
  });

  it('should detect raw hex colors and pixel values in .css / .module.css', () => {
    const cssCode = `
      .headerContainer {
        background-color: #1e293b;
        color: #ffffff;
        margin: 15px;
        font-size: 18px;
      }
    `;

    const violations = scanCssFileViolations({
      filePath: 'src/styles/Header.module.css',
      code: cssCode,
      config,
    });

    expect(violations.length).toBe(4);
    expect(violations[0].suggestedFix?.replacement).toBe('var(--color-slate-800)');
    expect(violations[1].suggestedFix?.replacement).toBe('var(--color-white)');
    expect(violations[2].suggestedFix?.replacement).toBe('var(--spacing-4)');
    expect(violations[3].suggestedFix?.replacement).toBe('var(--font-size-lg)');
  });

  it('should ignore CSS variables and comments in CSS files', () => {
    const cssCode = `
      /* This is a comment: color: #ff0000; */
      .validCard {
        background: var(--color-primary);
        padding: var(--spacing-md);
      }
    `;

    const violations = scanCssFileViolations({
      filePath: 'src/styles/Card.css',
      code: cssCode,
      config,
    });

    expect(violations.length).toBe(0);
  });
});
