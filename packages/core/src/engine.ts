import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import type {
  AgentLintConfig,
  FixOptions,
  FixResult,
  RuleCategory,
  ScanOptions,
  ScanResult,
  Violation,
} from './types';
import { loadConfig } from './config/loader';
import { scanI18nViolations } from './i18n/scanner';
import { transformI18nFile } from './i18n/transformer';
import { LocaleFileManager } from './i18n/locales';
import { scanTokenViolations } from './tokens/scanner';
import { scanCssFileViolations } from './tokens/css-scanner';
import {
  scanRestrictedComponents,
  transformRestrictedComponents,
} from './tokens/component-enforcer';
import { scanCompositionViolations } from './architecture/composition-scanner';
import { scanDuplicateLayoutViolations } from './architecture/deduplication-scanner';
import { scanArchitectureViolations } from './architecture/boundary-scanner';
import { scanDesignCraftViolations } from './tokens/craft-scanner';

export interface EngineOptions {
  rootDir?: string;
  configPath?: string;
  config?: AgentLintConfig;
}

export class AgentLintEngine {
  public rootDir: string;
  public config: AgentLintConfig;
  public configPath: string | null;
  public localeManager: LocaleFileManager;

  constructor(options: EngineOptions = {}) {
    this.rootDir = path.resolve(options.rootDir || process.cwd());

    if (options.config) {
      this.config = options.config;
      this.configPath = options.configPath || null;
    } else {
      const loaded = loadConfig(options.configPath, this.rootDir);
      this.config = loaded.config;
      this.configPath = loaded.resolvedConfigPath;
    }

    const i18n = this.config.rules.i18n;
    this.localeManager = new LocaleFileManager({
      rootDir: this.rootDir,
      localesDir: i18n.locales.dir,
      defaultLocale: i18n.locales.default,
      supportedLocales: Array.isArray(i18n.locales.supported)
        ? i18n.locales.supported
        : [i18n.locales.default],
      fileFormat: i18n.locales.file_format,
    });
  }

  /**
   * Lấy danh sách các file target cần quét
   */
  public getTargetFiles(): string[] {
    const patterns = this.config.target.include;
    const ignore = this.config.target.exclude;

    return fg.sync(patterns, {
      cwd: this.rootDir,
      ignore,
      absolute: true,
    });
  }

  private isCategoryActive(
    category: RuleCategory,
    options: ScanOptions = {}
  ): boolean {
    if (options.only && options.only.length > 0) {
      return options.only.includes(category);
    }
    if (options.skip && options.skip.length > 0) {
      return !options.skip.includes(category);
    }
    return true;
  }

  /**
   * Quét toàn bộ project tìm vi phạm (hỗ trợ cờ only/skip lọc theo category)
   */
  public scan(files?: string[], options: ScanOptions = {}): ScanResult {
    const startTime = Date.now();
    const targetFiles = files && files.length > 0 ? files : this.getTargetFiles();
    const violations: Violation[] = [];
    const scannedCodeList: { filePath: string; code: string }[] = [];

    for (const filePath of targetFiles) {
      if (!fs.existsSync(filePath)) continue;
      const code = fs.readFileSync(filePath, 'utf-8');
      scannedCodeList.push({ filePath, code });

      const ext = path.extname(filePath).toLowerCase();
      const isCss = ['.css', '.scss', '.sass', '.less'].includes(ext);

      if (isCss) {
        if (
          this.config.rules.design_tokens.enabled &&
          this.isCategoryActive('tokens', options)
        ) {
          const cssViolations = scanCssFileViolations({
            filePath,
            code,
            config: this.config.rules.design_tokens,
          });
          violations.push(...cssViolations);
        }
      } else {
        // 1. Scan i18n hardcodes
        if (
          this.config.rules.i18n.enabled &&
          this.isCategoryActive('i18n', options)
        ) {
          const i18nViolations = scanI18nViolations({
            filePath,
            code,
            config: this.config.rules.i18n,
          });
          violations.push(...i18nViolations);
        }

        // 2. Scan Design Token violations
        if (
          this.config.rules.design_tokens.enabled &&
          this.isCategoryActive('tokens', options)
        ) {
          const tokenViolations = scanTokenViolations({
            filePath,
            code,
            config: this.config.rules.design_tokens,
          });
          violations.push(...tokenViolations);

          // 3. Scan Restricted Custom Components
          if (this.config.rules.design_tokens.enforce_components?.enabled) {
            const compViolations = scanRestrictedComponents({
              filePath,
              code,
              config: this.config.rules.design_tokens.enforce_components,
            });
            violations.push(...compViolations);
          }
        }

        // 4. Scan Clean Composition in Page / Layout
        if (
          this.config.rules.clean_composition?.enabled &&
          this.isCategoryActive('composition', options)
        ) {
          const compViolations = scanCompositionViolations({
            filePath,
            code,
            config: this.config.rules.clean_composition,
          });
          violations.push(...compViolations);
        }

        // 5. Scan Architecture & Boundary Violations (Clean Arch, FSD, DDD, Server/Client)
        if (
          this.config.rules.architecture?.enabled &&
          this.isCategoryActive('architecture', options)
        ) {
          const archViolations = scanArchitectureViolations({
            filePath,
            code,
            config: this.config.rules.architecture,
            rootDir: this.rootDir,
          });
          violations.push(...archViolations);
        }

        // 6. Scan Design Craft & Visual Quality Violations (Anti-AI Slop & Vercel Taste)
        if (
          this.config.rules.design_craft?.enabled &&
          this.isCategoryActive('craft', options)
        ) {
          const craftViolations = scanDesignCraftViolations({
            filePath,
            code,
            config: this.config.rules.design_craft,
          });
          violations.push(...craftViolations);
        }
      }
    }

    // 7. Scan Component Deduplication across files (Rule of Three)
    if (
      this.config.rules.component_deduplication?.enabled &&
      this.isCategoryActive('deduplication', options)
    ) {
      const dedupViolations = scanDuplicateLayoutViolations(
        scannedCodeList,
        this.config.rules.component_deduplication
      );
      violations.push(...dedupViolations);
    }

    const endTime = Date.now();
    return {
      filesScanned: targetFiles.length,
      violations,
      startTime,
      endTime,
      durationMs: endTime - startTime,
    };
  }

  /**
   * Tự động sửa các vi phạm i18n và Custom Components
   */
  public fix(files?: string[], options: FixOptions = {}): FixResult {
    const scanRes = this.scan(files, options);
    const filesModified: string[] = [];
    const keysAdded: { file: string; key: string; value: string }[] = [];
    let violationsFixed = 0;

    const fileMap = new Map<string, Violation[]>();
    for (const v of scanRes.violations) {
      if (!fileMap.has(v.file)) {
        fileMap.set(v.file, []);
      }
      fileMap.get(v.file)!.push(v);
    }

    for (const [filePath, fileViolations] of fileMap.entries()) {
      if (!fs.existsSync(filePath)) continue;
      const code = fs.readFileSync(filePath, 'utf-8');
      let currentCode = code;
      let fileChanged = false;

      // 1. Fix i18n violations
      const i18nRule = this.config.rules.i18n;
      if (i18nRule.enabled && this.isCategoryActive('i18n', options)) {
        const result = transformI18nFile({
          filePath,
          code: currentCode,
          violations: fileViolations,
          config: i18nRule,
          localeManager: this.localeManager,
        });

        if (result.hasChanged) {
          currentCode = result.code;
          fileChanged = true;
          keysAdded.push(...result.keysAdded);
          violationsFixed += fileViolations.filter((v) => v.ruleId === 'i18n-hardcoded').length;
        }
      }

      // 2. Fix restricted components
      const compConfig = this.config.rules.design_tokens.enforce_components;
      if (compConfig?.enabled && this.isCategoryActive('tokens', options)) {
        const compRes = transformRestrictedComponents(currentCode, compConfig, filePath);
        if (compRes.hasChanged) {
          currentCode = compRes.code;
          fileChanged = true;
          violationsFixed += fileViolations.filter((v) => v.ruleId === 'restricted-element').length;
        }
      }

      if (fileChanged) {
        fs.writeFileSync(filePath, currentCode, 'utf-8');
        filesModified.push(filePath);
      }
    }

    return {
      filesModified,
      keysAdded,
      violationsFixed,
    };
  }
}
