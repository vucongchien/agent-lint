export type Severity = 'warn' | 'error' | 'off';

export interface I18nLocalesConfig {
  dir: string; // 'auto' or custom path
  default: string; // 'auto' or 'vi', 'en', etc.
  supported: string[] | 'auto'; // ['vi', 'en'] or 'auto'
  file_format: 'json' | 'nested-json' | 'ts' | 'js';
}

export interface I18nIntegrationConfig {
  framework: 'auto' | 'next-intl' | 'react-i18next' | 'custom';
  hook_name: string; // e.g. 'useTranslations' or 'useTranslation'
  function_name: string; // e.g. 't'
  auto_import: boolean;
  import_source: string; // e.g. 'next-intl' or 'react-i18next'
}

export interface I18nKeyGenConfig {
  strategy: 'slug' | 'camelCase' | 'file_scoped' | 'hash';
  max_length: number;
  prefix: string;
}

export interface I18nRuleConfig {
  enabled: boolean;
  severity: Severity;
  locales: I18nLocalesConfig;
  integration: I18nIntegrationConfig;
  key_generation: I18nKeyGenConfig;
  attributes: string[];
  whitelist: string[];
  ignore_patterns: string[];
}

export interface DesignTokensEnforceConfig {
  colors: boolean;
  spacing: boolean;
  font_sizes: boolean;
  radii?: boolean;        // Bo góc: rounded-[7px]
  shadows?: boolean;      // Đổ bóng: shadow-[...]
  font_weights?: boolean; // Độ đậm font: font-[650]
  line_heights?: boolean; // Chiều cao dòng: leading-[23px]
  z_indices?: boolean;    // Thứ tự hiển thị: z-[999]
}

export interface DesignTokensSuggestionConfig {
  auto_suggest: boolean;
  color_tolerance: number;
}

export interface CustomTokens {
  colors?: Record<string, string>;
  spacing?: Record<string, string | number>;
  font_sizes?: Record<string, string | number>;
  radii?: Record<string, string | number>;
  shadows?: Record<string, string>;
  font_weights?: Record<string, string | number>;
  line_heights?: Record<string, string | number>;
  z_indices?: Record<string, string | number>;
}

export interface RestrictedElementConfig {
  use: string;           // Tên custom component thay thế (ví dụ: "Button", "Image")
  from: string;          // Đường dẫn import (ví dụ: "@/components/ui/button", "next/image")
  message?: string;      // Thông báo giải thích lý do
}

export interface EnforceComponentsConfig {
  enabled: boolean;
  severity: Severity;
  restricted_elements: Record<string, RestrictedElementConfig>;
}

export interface DesignTokensRuleConfig {
  enabled: boolean;
  severity: Severity;
  provider: 'tailwind' | 'custom' | 'css-variables';
  enforce: DesignTokensEnforceConfig;
  suggestion: DesignTokensSuggestionConfig;
  tokens?: CustomTokens;
  enforce_components?: EnforceComponentsConfig;
}

export interface AgentLintConfig {
  version: string;
  target: {
    include: string[];
    exclude: string[];
  };
  rules: {
    i18n: I18nRuleConfig;
    design_tokens: DesignTokensRuleConfig;
  };
}

export interface SourceLocation {
  line: number;
  column: number;
  start: number;
  end: number;
}

export interface Violation {
  ruleId: 'i18n-hardcoded' | 'token-violation' | 'restricted-element';
  severity: Severity;
  message: string;
  file: string;
  loc: SourceLocation;
  rawText: string;
  suggestedFix?: {
    type: 'replace' | 'wrap-hook' | 'token-replace' | 'replace-tag';
    replacement: string;
    generatedKey?: string;
    targetLocaleFiles?: string[];
    importFrom?: string;
    targetComponent?: string;
  };
  metadata?: Record<string, any>;
}

export interface ScanResult {
  filesScanned: number;
  violations: Violation[];
  startTime: number;
  endTime: number;
  durationMs: number;
}

export interface FixResult {
  filesModified: string[];
  keysAdded: { file: string; key: string; value: string }[];
  violationsFixed: number;
}
