import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import type {
  AgentLintConfig,
  FixResult,
  ScanResult,
  Violation,
} from './types';
import { loadConfig } from './config/loader';
import { scanI18nViolations } from './i18n/scanner';
import { transformI18nFile } from './i18n/transformer';
import { LocaleFileManager } from './i18n/locales';
import { scanTokenViolations } from './tokens/scanner';

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

  /**
   * Quét toàn bộ project tìm vi phạm
   */
  public scan(files?: string[]): ScanResult {
    const startTime = Date.now();
    const targetFiles = files && files.length > 0 ? files : this.getTargetFiles();
    const violations: Violation[] = [];

    for (const filePath of targetFiles) {
      if (!fs.existsSync(filePath)) continue;
      const code = fs.readFileSync(filePath, 'utf-8');

      // 1. Scan i18n hardcodes
      if (this.config.rules.i18n.enabled) {
        const i18nViolations = scanI18nViolations({
          filePath,
          code,
          config: this.config.rules.i18n,
        });
        violations.push(...i18nViolations);
      }

      // 2. Scan Design Token violations
      if (this.config.rules.design_tokens.enabled) {
        const tokenViolations = scanTokenViolations({
          filePath,
          code,
          config: this.config.rules.design_tokens,
        });
        violations.push(...tokenViolations);
      }
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
   * Tự động sửa các vi phạm i18n và cập nhật vào file từ điển
   */
  public fix(files?: string[]): FixResult {
    const scanRes = this.scan(files);
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

      const i18nRule = this.config.rules.i18n;
      if (i18nRule.enabled) {
        const result = transformI18nFile({
          filePath,
          code,
          violations: fileViolations,
          config: i18nRule,
          localeManager: this.localeManager,
        });

        if (result.hasChanged) {
          fs.writeFileSync(filePath, result.code, 'utf-8');
          filesModified.push(filePath);
          keysAdded.push(...result.keysAdded);
          violationsFixed += fileViolations.filter((v) => v.ruleId === 'i18n-hardcoded').length;
        }
      }
    }

    return {
      filesModified,
      keysAdded,
      violationsFixed,
    };
  }
}
