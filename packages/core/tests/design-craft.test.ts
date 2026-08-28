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
          <div className="rounded-lg p-4 bg-white dark:bg-slate-900 shadow border-l-4 border-indigo-600">
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

    expect(violations.some((v) => v.ruleId === 'side-accent-border')).toBe(true);
    expect(violations.find((v) => v.ruleId === 'side-accent-border')?.message).toContain('Avoid thick side-tab accent borders');
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
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-slate-900 shadow-sm">
            <h2>Parent Card</h2>
            <div className="rounded-lg border border-slate-100 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800 shadow-xs">
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

    expect(violations.some((v) => v.ruleId === 'nested-cards')).toBe(true);
    expect(violations.find((v) => v.ruleId === 'nested-cards')?.message).toContain('Nested card containers create visual noise');
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

  it('should flag critical alert missing visual signifier icons', () => {
    const code = `
      export function DangerAlert() {
        return (
          <div className="bg-red-500 text-white p-4 rounded-lg">
            <span>Critical error: database disconnected</span>
          </div>
        );
      }
    `;

    const violations = scanDesignCraftViolations({
      filePath: 'src/components/Alert.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('critical-alert-signifier');
    expect(violations[0].message).toContain('High-priority warning / danger alerts require an explicit visual anchor');
  });

  it('should flag flat type scale jumps between heading and body (only 1 step difference)', () => {
    const code = `
      export function FlatHeader() {
        return (
          <div>
            <h3 className="text-base font-semibold">User Details</h3>
            <p className="text-sm text-slate-500">Manage account information</p>
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
    expect(violations[0].ruleId).toBe('type-scale-jump');
    expect(violations[0].message).toContain('only differ by 1 scale step. Use at least a 2-step hierarchy jump');
  });

  it('should flag symmetrical vertical padding on large hero banners (optical centering)', () => {
    const code = `
      export function HeroBanner() {
        return (
          <section className="min-h-screen py-24 items-center justify-center bg-slate-950">
            <h1>Welcome to Future</h1>
          </section>
        );
      }
    `;

    const violations = scanDesignCraftViolations({
      filePath: 'src/components/Hero.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('optical-centering');
    expect(violations[0].message).toContain('Optical Vertical Centering: Large sections with symmetrical padding');
  });

  it('should flag entity grid gap when out of ratio (gap too tight on large cards)', () => {
    const code = `
      export function ProductGrid() {
        return (
          <div className="grid grid-cols-3 gap-2">
            <div className="w-72 rounded-xl bg-white dark:bg-slate-900 p-4">Card 1</div>
            <div className="w-72 rounded-xl bg-white dark:bg-slate-900 p-4">Card 2</div>
          </div>
        );
      }
    `;

    const violations = scanDesignCraftViolations({
      filePath: 'src/components/Grid.tsx',
      code,
      config,
    });

    expect(violations.some((v) => v.ruleId === 'entity-grid-gap')).toBe(true);
    expect(violations.find((v) => v.ruleId === 'entity-grid-gap')?.message).toContain('Entity Grid Gap Ratio: The spacing (gap-2) between w-72 cards is too crowded');
  });

  it('should flag hardcoded light surfaces missing dark mode variants', () => {
    const code = `
      export function Card() {
        return (
          <div className="bg-white border-slate-200 text-slate-900 p-6 rounded-xl">
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
    expect(violations[0].ruleId).toBe('missing-dark-mode');
    expect(violations[0].message).toContain('Dark Mode Integrity: Hardcoded light surface/border/text without a corresponding "dark:" variant');
  });

  it('should flag monospace font used as decorative costume on prose', () => {
    const code = `
      export function Intro() {
        return (
          <p className="font-mono text-sm text-indigo-400">
            {"// "}hello world
          </p>
        );
      }
    `;

    const violations = scanDesignCraftViolations({
      filePath: 'src/components/Intro.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('monospace-costume');
    expect(violations[0].message).toContain('Monospace font is used as a decorative dev-tool costume');
  });

  it('should flag empty rotated geometric floaters', () => {
    const code = `
      export function Hero() {
        return (
          <div className="relative">
            <div className="absolute top-20 right-16 w-3 h-3 bg-indigo-600 rotate-45 opacity-20" />
            <h1>Main Title</h1>
          </div>
        );
      }
    `;

    const violations = scanDesignCraftViolations({
      filePath: 'src/components/Hero.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('decorative-floaters');
    expect(violations[0].message).toContain('Empty rotated geometric shape detected');
  });

  it('should flag subjective 1-5 level dots on skill cards', () => {
    const code = `
      export function SkillBadge({ levelDots }) {
        return (
          <div className="flex gap-1">
            {levelDots.map((filled, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            ))}
          </div>
        );
      }
    `;

    const violations = scanDesignCraftViolations({
      filePath: 'src/components/Skill.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('subjective-level-dots');
    expect(violations[0].message).toContain('1-5 dot rating scales on skill cards are an unmeasurable CV anti-pattern');
  });

  it('should flag undersized text below 11px', () => {
    const code = `
      export function TechChip() {
        return (
          <span className="text-[10px] font-semibold text-slate-700">
            Next.js
          </span>
        );
      }
    `;

    const violations = scanDesignCraftViolations({
      filePath: 'src/components/Chip.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('undersized-ui-text');
    expect(violations[0].message).toContain('is below the 11px threshold');
  });
});
