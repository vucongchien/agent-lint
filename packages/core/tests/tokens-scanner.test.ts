import { describe, it, expect } from 'vitest';
import { scanTokenViolations } from '../src/tokens/scanner';
import { DesignTokensRuleSchema } from '../src/config/schema';

describe('Design Token Scanner', () => {
  const config = DesignTokensRuleSchema.parse({
    enabled: true,
    severity: 'warn',
    provider: 'tailwind',
    enforce: {
      colors: true,
      spacing: true,
      font_sizes: true,
    },
    suggestion: {
      auto_suggest: true,
      color_tolerance: 0.85,
    },
  });

  it('should detect Tailwind arbitrary colors and suggest nearest token', () => {
    const code = `
      export function Card() {
        return <div className="bg-[#1e293b] text-[#ffffff] border-[#ef4444]">Card</div>;
      }
    `;

    const violations = scanTokenViolations({
      filePath: 'src/Card.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(3);
    expect(violations[0].suggestedFix?.replacement).toBe('bg-slate-800');
    expect(violations[1].suggestedFix?.replacement).toBe('text-white');
    expect(violations[2].suggestedFix?.replacement).toBe('border-red-500');
  });

  it('should detect Tailwind arbitrary spacing and suggest nearest token', () => {
    const code = `
      export function Container() {
        return <div className="p-[15px] m-[31px]">Container</div>;
      }
    `;

    const violations = scanTokenViolations({
      filePath: 'src/Container.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(2);
    expect(violations[0].suggestedFix?.replacement).toBe('p-4'); // 15px is nearest 16px (p-4)
    expect(violations[1].suggestedFix?.replacement).toBe('m-8'); // 31px is nearest 32px (m-8)
  });

  it('should detect inline style hardcodes', () => {
    const code = `
      export function Box() {
        return <div style={{ color: '#1e293b', margin: 15, fontSize: 18 }}>Box</div>;
      }
    `;

    const violations = scanTokenViolations({
      filePath: 'src/Box.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(3);
    const msgs = violations.map((v) => v.message);
    expect(msgs.some((m) => m.includes('color'))).toBe(true);
    expect(msgs.some((m) => m.includes('margin'))).toBe(true);
    expect(msgs.some((m) => m.includes('fontSize'))).toBe(true);
  });

  it('should NOT flag CSS variables or token references as hardcoded', () => {
    const code = `
      export function ValidThemedComponent() {
        return (
          <div
            className="bg-[var(--primary-color)] p-[var(--spacing-md)] text-slate-800"
            style={{ color: 'var(--brand-color)', padding: 'var(--space-4)' }}
          >
            Valid Content
          </div>
        );
      }
    `;

    const violations = scanTokenViolations({
      filePath: 'src/ValidThemedComponent.tsx',
      code,
      config,
    });

    // CSS variables are legitimate Design Tokens, so violations should be 0!
    expect(violations.length).toBe(0);
  });
});
