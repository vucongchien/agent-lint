import { describe, it, expect } from 'vitest';
import { scanDesignCraftViolations } from '../src/tokens/craft-scanner';
import { DesignCraftSchema } from '../src/config/schema';

describe('Design Craft & Visual Quality Scanner (Anti-AI Slop)', () => {
  const config = DesignCraftSchema.parse({
    enabled: true,
    severity: 'warn',
    no_side_accent_border: true,
    no_gradient_text: true,
    no_glowing_shadows: true,
    no_nested_cards: true,
    no_eyebrow_kicker: true,
    no_fake_pulse_dot: true,
    no_ghost_card: true,
  });

  it('should flag side-tab accent borders (border-l-4 on cards)', () => {
    const code = `
      export function FeatureCard() {
        return (
          <div className="rounded-lg p-4 bg-white shadow border-l-4 border-indigo-600">
            <h3>Title</h3>
          </div>
        );
      }
    `;

    const violations = scanDesignCraftViolations({
      filePath: 'src/components/Card.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('side-accent-border');
    expect(violations[0].message).toContain('Avoid thick side-tab accent borders');
  });

  it('should flag gradient text (bg-clip-text text-transparent)', () => {
    const code = `
      export function Hero() {
        return (
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            Unleash Power
          </h1>
        );
      }
    `;

    const violations = scanDesignCraftViolations({
      filePath: 'src/components/Hero.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('gradient-text');
    expect(violations[0].message).toContain('Gradient text is considered decorative');
  });

  it('should flag glowing halo shadows on dark backgrounds', () => {
    const code = `
      export function GlowButton() {
        return (
          <button className="rounded-full px-4 py-2 bg-purple-600 shadow-[0_0_25px_rgba(168,85,247,0.5)]">
            Get Started
          </button>
        );
      }
    `;

    const violations = scanDesignCraftViolations({
      filePath: 'src/components/Button.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('glowing-shadow');
  });

  it('should flag nested container cards (card inside card)', () => {
    const code = `
      export function NestedWrapper() {
        return (
          <div className="rounded-xl border border-slate-200 p-6 bg-white shadow-sm">
            <h2>Parent Card</h2>
            <div className="rounded-lg border border-slate-100 p-4 bg-slate-50 shadow-xs">
              <p>Child Card</p>
            </div>
          </div>
        );
      }
    `;

    const violations = scanDesignCraftViolations({
      filePath: 'src/components/Wrapper.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('nested-cards');
    expect(violations[0].message).toContain('Nested card containers create visual noise');
  });

  it('should flag eyebrow kicker labels directly preceding headings', () => {
    const code = `
      export function SectionHeader() {
        return (
          <div>
            <span className="uppercase text-xs font-semibold tracking-wider text-indigo-600">
              NEW RELEASE
            </span>
            <h1 className="text-3xl font-bold">Everything you need</h1>
          </div>
        );
      }
    `;

    const violations = scanDesignCraftViolations({
      filePath: 'src/components/Header.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('eyebrow-kicker');
  });

  it('should flag decorative fake pulse status dots', () => {
    const code = `
      export function StatusBadge() {
        return (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
            <span>Operational</span>
          </div>
        );
      }
    `;

    const violations = scanDesignCraftViolations({
      filePath: 'src/components/Status.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('fake-pulse-dot');
  });

  it('should flag ghost cards combining heavy borders with heavy shadows', () => {
    const code = `
      export function HeavyCard() {
        return (
          <div className="rounded-2xl border-2 border-slate-900 shadow-2xl p-6">
            <h3>Over-elevated</h3>
          </div>
        );
      }
    `;

    const violations = scanDesignCraftViolations({
      filePath: 'src/components/Card.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('ghost-card');
  });

  it('should flag optical kerning errors (negative tracking on small text)', () => {
    const code = `
      export function SmallBadge() {
        return (
          <span className="text-xs tracking-tight font-medium">
            Colliding glyphs
          </span>
        );
      }
    `;

    const violations = scanDesignCraftViolations({
      filePath: 'src/components/Badge.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('optical-kerning');
    expect(violations[0].message).toContain('Small text sizes (text-xs / ≤12px) require neutral or expanded letter-spacing');
  });

  it('should flag dark mode optical compensation violations (same heavy bold in dark mode)', () => {
    const code = `
      export function HeavyHeader() {
        return (
          <h2 className="font-bold dark:font-bold text-slate-900 dark:text-white">
            Uncompensated Glare
          </h2>
        );
      }
    `;

    const violations = scanDesignCraftViolations({
      filePath: 'src/components/HeavyHeader.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('dark-mode-optical-compensation');
    expect(violations[0].message).toContain('Due to visual irradiation, bright text on dark backgrounds appears ~10% heavier');
  });
});
