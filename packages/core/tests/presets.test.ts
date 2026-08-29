import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ARCHITECTURE_PRESETS } from '../src/config/presets';
import { loadConfig } from '../src/config/loader';
import fs from 'fs';
import path from 'path';

describe('Architecture Presets Configuration', () => {
  const tempDir = path.resolve(__dirname, '__temp_presets__');

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

  it('should contain definitions for all 4 major architecture presets', () => {
    expect(ARCHITECTURE_PRESETS['nextjs']).toBeDefined();
    expect(ARCHITECTURE_PRESETS['clean-architecture']).toBeDefined();
    expect(ARCHITECTURE_PRESETS['fsd']).toBeDefined();
    expect(ARCHITECTURE_PRESETS['ddd']).toBeDefined();
  });

  it('should auto-expand preset: "clean-architecture" when loading config', () => {
    const yamlConfig = `
version: "1.0"
preset: "clean-architecture"
`;
    fs.writeFileSync(path.join(tempDir, '.agent-lint.yaml'), yamlConfig, 'utf-8');

    const { config } = loadConfig(undefined, tempDir);

    expect(config.rules.architecture?.enabled).toBe(true);
    expect(config.rules.architecture?.layers).toBeDefined();
    expect(config.rules.architecture?.layers?.length).toBe(4);
    expect(config.rules.architecture?.layers?.some((l) => l.name === 'domain')).toBe(true);
  });

  it('should auto-expand preset: "fsd" (Feature-Sliced Design) with 6 layers', () => {
    const yamlConfig = `
version: "1.0"
preset: "fsd"
`;
    fs.writeFileSync(path.join(tempDir, '.agent-lint.yaml'), yamlConfig, 'utf-8');

    const { config } = loadConfig(undefined, tempDir);

    expect(config.rules.architecture?.enabled).toBe(true);
    expect(config.rules.architecture?.layers?.length).toBe(6);
    expect(config.rules.architecture?.layers?.some((l) => l.name === 'shared')).toBe(true);
    expect(config.rules.architecture?.layers?.some((l) => l.name === 'features')).toBe(true);
  });

  it('should auto-configure preset: "craft-only" enabling design_craft and disabling other rules', () => {
    const yamlConfig = `
version: "1.0"
preset: "craft-only"
`;
    fs.writeFileSync(path.join(tempDir, '.agent-lint.yaml'), yamlConfig, 'utf-8');

    const { config } = loadConfig(undefined, tempDir);

    expect(config.rules.design_craft?.enabled).toBe(true);
    expect(config.rules.i18n.enabled).toBe(false);
    expect(config.rules.design_tokens.enabled).toBe(false);
    expect(config.rules.architecture?.enabled).toBe(false);
  });

  it('should auto-configure preset: "i18n-only" enabling i18n and disabling design_craft', () => {
    const yamlConfig = `
version: "1.0"
preset: "i18n-only"
`;
    fs.writeFileSync(path.join(tempDir, '.agent-lint.yaml'), yamlConfig, 'utf-8');

    const { config } = loadConfig(undefined, tempDir);

    expect(config.rules.i18n.enabled).toBe(true);
    expect(config.rules.design_craft?.enabled).toBe(false);
    expect(config.rules.design_tokens.enabled).toBe(false);
    expect(config.rules.architecture?.enabled).toBe(false);
  });
});
