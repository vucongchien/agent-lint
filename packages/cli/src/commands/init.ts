import fs from 'fs';
import path from 'path';
import pc from 'picocolors';

const DEFAULT_CONFIG_TEMPLATE = `# Cấu hình chuẩn cho Agent-Lint (i18n & Design Token Linter)
version: "1.0"

target:
  include:
    - "src/**/*.{tsx,jsx}"
  exclude:
    - "**/*.test.{tsx,jsx}"
    - "**/node_modules/**"
    - "**/.next/**"
    - "**/dist/**"

rules:
  # ==========================================
  # RULE 1: i18n HARDCODE DETECTION & AUTO-FIX
  # ==========================================
  i18n:
    enabled: true
    severity: "error" # "warn" | "error"
    
    locales:
      # "auto": Tự động phát hiện thư mục (locales, messages, src/messages...)
      dir: "auto"
      default: "auto"
      supported: "auto"
      file_format: "json"
    
    integration:
      # "auto": Tự phát hiện framework (next-intl, react-i18next) từ package.json
      framework: "auto"
      hook_name: "useTranslations"
      function_name: "t"
      auto_import: true
      import_source: "next-intl"
    
    key_generation:
      strategy: "slug" # "slug" | "camelCase" | "file_scoped" | "hash"
      max_length: 40
      prefix: ""
    
    attributes:
      - "placeholder"
      - "title"
      - "alt"
      - "aria-label"
      - "aria-description"
    
    whitelist:
      - "&times;"
      - "OK"
      - "Beta"
    
    ignore_patterns:
      - "^[0-9]+$"
      - "^[\\s\\-_/|:,.]+$"
      - "^https?://"
      - "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$"

  # ==========================================
  # RULE 2: DESIGN TOKEN COMPLIANCE
  # ==========================================
  design_tokens:
    enabled: true
    severity: "warn"
    provider: "tailwind"
    
    enforce:
      colors: true      # Bắt mã màu hex cứng (ví dụ: bg-[#1e293b], style={{ color: '#fff' }})
      spacing: true     # Bắt pixel cứng (ví dụ: p-[15px], margin: 15)
      font_sizes: true  # Bắt font size cứng (ví dụ: text-[18px])
    
    suggestion:
      auto_suggest: true
      color_tolerance: 0.85
`;

export function initCommand(options: { force?: boolean } = {}) {
  const targetPath = path.resolve(process.cwd(), '.agent-lint.yaml');

  if (fs.existsSync(targetPath) && !options.force) {
    console.log(pc.yellow(`⚠ .agent-lint.yaml already exists at ${targetPath}. Use --force to overwrite.`));
    return;
  }

  fs.writeFileSync(targetPath, DEFAULT_CONFIG_TEMPLATE, 'utf-8');
  console.log(pc.green(`✔ Created configuration file at: ${pc.bold(targetPath)}`));
  console.log(pc.cyan(`\nNext steps:`));
  console.log(`  1. Run ${pc.bold('npx agent-lint scan')} to check for violations.`);
  console.log(`  2. Run ${pc.bold('npx agent-lint fix')} to automatically sync i18n keys into your locale files.`);
}
