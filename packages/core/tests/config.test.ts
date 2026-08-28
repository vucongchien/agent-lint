import { describe, it, expect } from 'vitest';
import { AgentLintConfigSchema } from '../src/config/schema';
import { loadConfig } from '../src/config/loader';
import path from 'path';

describe('Config Loader & Schema Validation', () => {
  it('should provide default configurations when input is empty', () => {
    const parsed = AgentLintConfigSchema.parse({});
    expect(parsed.version).toBe('1.0');
    expect(parsed.rules.i18n.enabled).toBe(true);
    expect(parsed.rules.i18n.severity).toBe('error');
    expect(parsed.rules.i18n.locales.dir).toBe('auto');
    expect(parsed.rules.i18n.key_generation.strategy).toBe('slug');
    expect(parsed.rules.design_tokens.enabled).toBe(true);
    expect(parsed.rules.design_tokens.provider).toBe('tailwind');
  });

  it('should accept custom overrides in config schema', () => {
    const parsed = AgentLintConfigSchema.parse({
      rules: {
        i18n: {
          severity: 'warn',
          locales: {
            dir: 'messages',
            default: 'en',
            supported: ['en', 'vi'],
          },
          key_generation: {
            strategy: 'camelCase',
            prefix: 'app.',
          },
        },
      },
    });

    expect(parsed.rules.i18n.severity).toBe('warn');
    expect(parsed.rules.i18n.locales.dir).toBe('messages');
    expect(parsed.rules.i18n.locales.default).toBe('en');
    expect(parsed.rules.i18n.key_generation.strategy).toBe('camelCase');
    expect(parsed.rules.i18n.key_generation.prefix).toBe('app.');
  });

  it('should resolve default config when loading from root directory', () => {
    const rootDir = path.resolve(__dirname, '../../..');
    const { config } = loadConfig(undefined, rootDir);
    expect(config).toBeDefined();
    expect(config.rules.i18n.enabled).toBe(true);
  });
});
