import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { AgentLintConfigSchema, type AgentLintConfigOutput } from './schema';
import type { AgentLintConfig } from '../types';
import { ARCHITECTURE_PRESETS } from './presets';

const DEFAULT_CONFIG_FILENAMES = [
  '.agent-lint.yaml',
  '.agent-lint.yml',
  'agent-lint.yaml',
  'agent-lint.yml',
  'agent-lint.config.yaml',
];

const COMMON_LOCALE_DIRS = [
  'locales',
  'messages',
  'src/locales',
  'src/messages',
  'public/locales',
  'i18n',
];

/**
 * Tìm file config YAML từ cwd hoặc thư mục cha
 */
export function findConfigFile(startDir: string = process.cwd()): string | null {
  let currentDir = path.resolve(startDir);
  while (true) {
    for (const filename of DEFAULT_CONFIG_FILENAMES) {
      const fullPath = path.join(currentDir, filename);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }
  return null;
}

/**
 * Tự động nhận diện thư mục locales trong project
 */
export function autoDetectLocalesDir(rootDir: string = process.cwd()): string {
  for (const dir of COMMON_LOCALE_DIRS) {
    const fullPath = path.join(rootDir, dir);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      return dir;
    }
  }
  return 'locales'; // Fallback mặc định
}

/**
 * Tự động phát hiện các ngôn ngữ hỗ trợ từ các file trong thư mục locales
 */
export function autoDetectSupportedLocales(localesDirFull: string): {
  defaultLocale: string;
  supportedLocales: string[];
} {
  if (!fs.existsSync(localesDirFull)) {
    return { defaultLocale: 'vi', supportedLocales: ['vi', 'en'] };
  }

  const files = fs.readdirSync(localesDirFull);
  const detected: string[] = [];

  for (const file of files) {
    const ext = path.extname(file);
    if (['.json', '.yaml', '.yml'].includes(ext)) {
      const lang = path.basename(file, ext);
      if (lang && !detected.includes(lang)) {
        detected.push(lang);
      }
    }
  }

  if (detected.length === 0) {
    return { defaultLocale: 'vi', supportedLocales: ['vi', 'en'] };
  }

  const defaultLocale = detected.includes('vi')
    ? 'vi'
    : detected.includes('en')
    ? 'en'
    : detected[0];

  return { defaultLocale, supportedLocales: detected };
}

/**
 * Tự động phát hiện framework i18n trong package.json
 */
export function autoDetectFramework(rootDir: string = process.cwd()): {
  framework: 'next-intl' | 'react-i18next' | 'custom';
  hook_name: string;
  import_source: string;
} {
  const pkgPath = path.join(rootDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps['next-intl']) {
        return {
          framework: 'next-intl',
          hook_name: 'useTranslations',
          import_source: 'next-intl',
        };
      }
      if (deps['react-i18next'] || deps['i18next']) {
        return {
          framework: 'react-i18next',
          hook_name: 'useTranslation',
          import_source: 'react-i18next',
        };
      }
    } catch {
      // ignore
    }
  }

  // Mặc định cho Next.js hiện đại
  return {
    framework: 'next-intl',
    hook_name: 'useTranslations',
    import_source: 'next-intl',
  };
}

/**
 * Đọc, merge preset, và validate file cấu hình
 */
export function loadConfig(
  customConfigPath?: string,
  rootDir: string = process.cwd()
): { config: AgentLintConfig; resolvedConfigPath: string | null } {
  let configPath = customConfigPath
    ? path.resolve(rootDir, customConfigPath)
    : findConfigFile(rootDir);

  let rawContent = '';
  let parsedYaml: any = {};

  if (configPath && fs.existsSync(configPath)) {
    try {
      rawContent = fs.readFileSync(configPath, 'utf-8');
      parsedYaml = YAML.parse(rawContent) || {};
    } catch (err: any) {
      throw new Error(`Failed to parse config file ${configPath}: ${err.message}`);
    }
  }

  // 1. Mở rộng Preset nếu có (preset ở root hoặc rules.architecture.preset)
  const presetKey = parsedYaml.preset || parsedYaml.rules?.architecture?.preset;
  if (!parsedYaml.rules) parsedYaml.rules = {};

  if (presetKey === 'craft-only') {
    parsedYaml.rules.design_craft = { enabled: true, ...parsedYaml.rules.design_craft };
    parsedYaml.rules.i18n = { enabled: false, ...parsedYaml.rules.i18n };
    parsedYaml.rules.design_tokens = { enabled: false, ...parsedYaml.rules.design_tokens };
    parsedYaml.rules.architecture = { enabled: false, ...parsedYaml.rules.architecture };
  } else if (presetKey === 'i18n-only') {
    parsedYaml.rules.i18n = { enabled: true, ...parsedYaml.rules.i18n };
    parsedYaml.rules.design_craft = { enabled: false, ...parsedYaml.rules.design_craft };
    parsedYaml.rules.design_tokens = { enabled: false, ...parsedYaml.rules.design_tokens };
    parsedYaml.rules.architecture = { enabled: false, ...parsedYaml.rules.architecture };
  } else if (presetKey === 'arch-only') {
    parsedYaml.rules.architecture = { enabled: true, ...parsedYaml.rules.architecture };
    parsedYaml.rules.design_craft = { enabled: false, ...parsedYaml.rules.design_craft };
    parsedYaml.rules.i18n = { enabled: false, ...parsedYaml.rules.i18n };
    parsedYaml.rules.design_tokens = { enabled: false, ...parsedYaml.rules.design_tokens };
  } else if (presetKey === 'tokens-only') {
    parsedYaml.rules.design_tokens = { enabled: true, ...parsedYaml.rules.design_tokens };
    parsedYaml.rules.design_craft = { enabled: false, ...parsedYaml.rules.design_craft };
    parsedYaml.rules.i18n = { enabled: false, ...parsedYaml.rules.i18n };
    parsedYaml.rules.architecture = { enabled: false, ...parsedYaml.rules.architecture };
  } else if (presetKey && ARCHITECTURE_PRESETS[presetKey as keyof typeof ARCHITECTURE_PRESETS]) {
    const presetDefaults = ARCHITECTURE_PRESETS[presetKey as keyof typeof ARCHITECTURE_PRESETS];
    if (!parsedYaml.rules.architecture) parsedYaml.rules.architecture = {};

    parsedYaml.rules.architecture = {
      ...presetDefaults,
      ...parsedYaml.rules.architecture,
      preset: presetKey,
    };
  }

  // Validate qua Zod với default values
  const validated: AgentLintConfigOutput = AgentLintConfigSchema.parse(parsedYaml);

  // Tự động đọc thêm .gitignore và .agentlintignore nếu có
  const ignoreFiles = ['.gitignore', '.agentlintignore'];
  for (const ignoreFile of ignoreFiles) {
    const ignorePath = path.join(rootDir, ignoreFile);
    if (fs.existsSync(ignorePath)) {
      try {
        const lines = fs
          .readFileSync(ignorePath, 'utf-8')
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('#'));
        for (const line of lines) {
          const globPattern = line.endsWith('/') ? `**/${line}**` : `**/${line}`;
          if (!validated.target.exclude.includes(globPattern)) {
            validated.target.exclude.push(globPattern);
          }
        }
      } catch {
        // ignore read error
      }
    }
  }

  // Auto-detection logic cho i18n
  const i18nConfig = validated.rules.i18n;
  if (i18nConfig.enabled) {
    if (i18nConfig.locales.dir === 'auto') {
      i18nConfig.locales.dir = autoDetectLocalesDir(rootDir);
    }

    const resolvedLocalesFull = path.resolve(rootDir, i18nConfig.locales.dir);
    const autoDetectedLocales = autoDetectSupportedLocales(resolvedLocalesFull);

    if (i18nConfig.locales.default === 'auto') {
      i18nConfig.locales.default = autoDetectedLocales.defaultLocale;
    }
    if (i18nConfig.locales.supported === 'auto') {
      i18nConfig.locales.supported = autoDetectedLocales.supportedLocales;
    }

    if (i18nConfig.integration.framework === 'auto') {
      const autoFramework = autoDetectFramework(rootDir);
      i18nConfig.integration.framework = autoFramework.framework;
      i18nConfig.integration.hook_name = autoFramework.hook_name;
      i18nConfig.integration.import_source = autoFramework.import_source;
    }
  }

  return {
    config: validated as AgentLintConfig,
    resolvedConfigPath: configPath,
  };
}
