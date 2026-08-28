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

export interface CleanCompositionConfig {
  enabled: boolean;
  severity: Severity;
  targets: string[];            // Pattern các file áp dụng (mặc định: ["**/page.{tsx,jsx}", "**/layout.{tsx,jsx}"])
  max_raw_jsx_depth: number;    // Độ sâu tối đa của thẻ HTML trần (mặc định: 3)
  max_raw_element_ratio: number; // Tỷ lệ thẻ HTML trần tối đa trong cây render (mặc định: 0.6)
}

export interface ComponentDeduplicationConfig {
  enabled: boolean;
  severity: Severity;
  min_occurrences: number;      // Quy tắc số 3: Lặp lại từ 3 lần trở lên mới cảnh báo (mặc định: 3)
  min_element_count: number;    // Số thẻ tối thiểu trong một khối để xét trùng (mặc định: 4)
  similarity_threshold: number; // Ngưỡng giống nhau về class CSS (mặc định: 0.8)
}

export type ArchitecturePreset = 'nextjs' | 'clean-architecture' | 'fsd' | 'ddd' | 'custom';

export interface LayerConfig {
  name: string;
  path: string;
  can_import: string[];
  disallowed_packages?: string[];
  message?: string;
}

export interface ServerClientBoundaryConfig {
  enabled: boolean;
  client_identifiers?: string[];
  disallowed_imports: string[];
}

export interface PublicApiConfig {
  enabled: boolean;
  modules: string[];
  entry_files?: string[];
}

export interface ArchitectureRuleConfig {
  enabled: boolean;
  severity: Severity;
  preset?: ArchitecturePreset;
  allow_type_imports?: boolean;
  layers?: LayerConfig[];
  server_client_boundary?: ServerClientBoundaryConfig;
  public_api?: PublicApiConfig;
}

export interface DesignCraftConfig {
  enabled: boolean;
  severity: Severity;
  no_side_accent_border?: boolean;           // Cấm viền màu dày 1 bên mép card
  no_gradient_text?: boolean;                // Cấm chữ dải màu lòe loẹt
  no_glowing_shadows?: boolean;              // Cấm bóng đổ phát sáng màu mè
  no_nested_cards?: boolean;                 // Cấm card lồng trong card
  no_eyebrow_kicker?: boolean;               // Cấm nhãn in hoa đè trên heading
  no_fake_pulse_dot?: boolean;               // Cấm animate-ping/pulse trên status dot tĩnh
  no_ghost_card?: boolean;                   // Cấm vừa viền dày vừa bóng mờ trên cùng 1 card
  optical_kerning?: boolean;                 // Chữ càng nhỏ thì tracking/kerning phải càng rộng (tránh dính nét)
  dark_mode_optical_compensation?: boolean;  // Giảm 1 bậc font-weight/kích thước trong Dark Mode (quang sai phát xạ)
  critical_alert_signifiers?: boolean;       // Khung cảnh báo nguy hiểm phải có Icon chỉ dẫn và viền phân cấp mạnh
  type_scale_jump?: boolean;                 // Tiêu đề và nội dung phụ phải nhảy tối thiểu 2 bậc cỡ chữ (tránh flat hierarchy)
  optical_centering?: boolean;               // Căn giữa quang học mắt người (Padding top < Padding bottom: 1 : 1.2)
  entity_grid_gap_ratio?: boolean;           // Khoảng cách Grid giữa các sản phẩm/thực thể bằng 1/3 Card Width
  no_missing_dark_mode?: boolean;            // Cảnh báo thẻ có màu nền/chữ cố định thiếu biến thể dark: (tránh vỡ dark mode)
  no_monospace_costume?: boolean;            // Cấm dùng font-mono cho text thông thường làm màu kỹ thuật
  no_decorative_floaters?: boolean;          // Cấm khối hình học trống rỗng xoay rotate-45 trôi nổi rác thị giác
  no_subjective_level_dots?: boolean;        // Cấm vòng lặp 5 chấm level kỹ năng đánh giá chủ quan trong CV
  no_misleading_affordance?: boolean;        // Cấm nút gửi giả lập chatbox kích hoạt mở popup ngoài mà không có chỉ báo ↗
  no_undersized_ui_text?: boolean;           // Cấm cỡ chữ < 11px gây khó đọc trên thiết bị di động
}

export interface AgentLintConfig {
  version: string;
  preset?: ArchitecturePreset;
  target: {
    include: string[];
    exclude: string[];
  };
  rules: {
    i18n: I18nRuleConfig;
    design_tokens: DesignTokensRuleConfig;
    clean_composition?: CleanCompositionConfig;
    component_deduplication?: ComponentDeduplicationConfig;
    architecture?: ArchitectureRuleConfig;
    design_craft?: DesignCraftConfig;
  };
}

export interface SourceLocation {
  line: number;
  column: number;
  start: number;
  end: number;
}

export interface Violation {
  ruleId:
    | 'i18n-hardcoded'
    | 'token-violation'
    | 'restricted-element'
    | 'composition-violation'
    | 'duplicate-layout'
    | 'architecture-layer-inversion'
    | 'domain-purity-violation'
    | 'server-client-boundary'
    | 'public-api-violation'
    | 'side-accent-border'
    | 'gradient-text'
    | 'glowing-shadow'
    | 'nested-cards'
    | 'eyebrow-kicker'
    | 'fake-pulse-dot'
    | 'ghost-card'
    | 'optical-kerning'
    | 'dark-mode-optical-compensation'
    | 'critical-alert-signifier'
    | 'type-scale-jump'
    | 'optical-centering'
    | 'entity-grid-gap'
    | 'missing-dark-mode'
    | 'monospace-costume'
    | 'decorative-floaters'
    | 'subjective-level-dots'
    | 'misleading-affordance'
    | 'undersized-ui-text';
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
