import fs from 'fs';
import path from 'path';
import type { TranslationProvider } from './translator';

export interface LocaleFileManagerOptions {
  rootDir: string;
  localesDir: string;
  defaultLocale: string;
  supportedLocales: string[];
  fileFormat: 'json' | 'nested-json' | 'ts' | 'js';
}

export class LocaleFileManager {
  private rootDir: string;
  private localesDirFull: string;
  private defaultLocale: string;
  private supportedLocales: string[];
  private fileFormat: string;
  private cache: Map<string, Record<string, any>> = new Map();

  constructor(options: LocaleFileManagerOptions) {
    this.rootDir = options.rootDir;
    this.localesDirFull = path.isAbsolute(options.localesDir)
      ? options.localesDir
      : path.resolve(options.rootDir, options.localesDir);
    this.defaultLocale = options.defaultLocale;
    this.supportedLocales = options.supportedLocales.length > 0
      ? options.supportedLocales
      : [options.defaultLocale];
    this.fileFormat = options.fileFormat;
  }

  public getLocalesDir(): string {
    return this.localesDirFull;
  }

  private getLocaleFilePath(locale: string): string {
    return path.join(this.localesDirFull, `${locale}.json`);
  }

  /**
   * Đọc nội dung từ điển của một locale
   */
  public readLocale(locale: string): Record<string, any> {
    if (this.cache.has(locale)) {
      return this.cache.get(locale)!;
    }

    const filePath = this.getLocaleFilePath(locale);
    if (!fs.existsSync(filePath)) {
      const empty = {};
      this.cache.set(locale, empty);
      return empty;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      this.cache.set(locale, data);
      return data;
    } catch {
      const empty = {};
      this.cache.set(locale, empty);
      return empty;
    }
  }

  /**
   * Tìm xem một chuỗi text đã có key nào trong từ điển default chưa
   */
  public findKeyByValue(value: string, locale: string = this.defaultLocale): string | null {
    const data = this.readLocale(locale);
    
    function search(obj: Record<string, any>, currentPath: string = ''): string | null {
      for (const [k, v] of Object.entries(obj)) {
        const fullKey = currentPath ? `${currentPath}.${k}` : k;
        if (typeof v === 'string' && v.trim() === value.trim()) {
          return fullKey;
        }
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          const nested = search(v, fullKey);
          if (nested) return nested;
        }
      }
      return null;
    }

    return search(data);
  }

  /**
   * Thêm key và value vào dictionary
   */
  public addKey(
    key: string,
    value: string,
    options: { overwrite?: boolean } = {}
  ): { targetFiles: string[]; keyAdded: string } {
    if (!fs.existsSync(this.localesDirFull)) {
      fs.mkdirSync(this.localesDirFull, { recursive: true });
    }

    const targetFiles: string[] = [];

    for (const locale of this.supportedLocales) {
      const isDefault = locale === this.defaultLocale;
      const data = this.readLocale(locale);
      const filePath = this.getLocaleFilePath(locale);

      const targetValue = isDefault
        ? value
        : `[TODO: TRANSLATE] ${value}`;

      this.setNestedValue(data, key, targetValue, options.overwrite);
      this.writeLocaleFile(filePath, data);
      targetFiles.push(filePath);
    }

    return { targetFiles, keyAdded: key };
  }

  /**
   * Thêm key và tự động dịch sang các locale phụ qua TranslationProvider
   */
  public async addKeyAsync(
    key: string,
    value: string,
    options: { overwrite?: boolean; translator?: TranslationProvider } = {}
  ): Promise<{ targetFiles: string[]; keyAdded: string }> {
    if (!fs.existsSync(this.localesDirFull)) {
      fs.mkdirSync(this.localesDirFull, { recursive: true });
    }

    const targetFiles: string[] = [];

    for (const locale of this.supportedLocales) {
      const isDefault = locale === this.defaultLocale;
      const data = this.readLocale(locale);
      const filePath = this.getLocaleFilePath(locale);

      let targetValue = value;
      if (!isDefault) {
        if (options.translator) {
          targetValue = await options.translator.translate(value, this.defaultLocale, locale);
        } else {
          targetValue = `[TODO: TRANSLATE] ${value}`;
        }
      }

      this.setNestedValue(data, key, targetValue, options.overwrite);
      this.writeLocaleFile(filePath, data);
      targetFiles.push(filePath);
    }

    return { targetFiles, keyAdded: key };
  }

  private setNestedValue(
    obj: Record<string, any>,
    pathStr: string,
    value: any,
    overwrite: boolean = false
  ): void {
    if (!pathStr.includes('.')) {
      if (obj[pathStr] === undefined || overwrite) {
        obj[pathStr] = value;
      }
      return;
    }

    const parts = pathStr.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (typeof current[part] !== 'object' || current[part] === null) {
        current[part] = {};
      }
      current = current[part];
    }
    const lastPart = parts[parts.length - 1];
    if (current[lastPart] === undefined || overwrite) {
      current[lastPart] = value;
    }
  }

  private writeLocaleFile(filePath: string, data: Record<string, any>): void {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  }
}
