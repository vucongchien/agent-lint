import fs from 'fs';
import path from 'path';
import pc from 'picocolors';

/**
 * Tự động phân tích ngữ cảnh dự án để tạo file .agent-lint.yaml chính xác
 */
export function initCommand(options: { force?: boolean } = {}) {
  const rootDir = process.cwd();
  const targetPath = path.resolve(rootDir, '.agent-lint.yaml');

  if (fs.existsSync(targetPath) && !options.force) {
    console.log(pc.yellow(`⚠ .agent-lint.yaml already exists at ${targetPath}. Use --force to overwrite.`));
    return;
  }

  // 1. Phân tích package.json
  let hasI18n = false;
  let isNextJs = false;
  let hasServerDb = false;

  const pkgPath = path.join(rootDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (allDeps['next-intl'] || allDeps['react-i18next'] || allDeps['i18next']) {
        hasI18n = true;
      }
      if (allDeps['next']) {
        isNextJs = true;
      }
      if (allDeps['@neondatabase/serverless'] || allDeps['prisma'] || allDeps['@prisma/client'] || allDeps['mongoose'] || allDeps['typeorm']) {
        hasServerDb = true;
      }
    } catch {
      // ignore
    }
  }

  // 2. Tìm file Design Tokens hiện có
  let detectedTokensFile: string | null = null;
  const tokenCandidates = [
    'src/config/tokens.ts',
    'src/tokens.ts',
    'src/config/tokens.json',
    'tokens.ts',
    'tokens.json',
    'design-tokens.json',
  ];
  for (const cand of tokenCandidates) {
    if (fs.existsSync(path.join(rootDir, cand))) {
      detectedTokensFile = cand;
      break;
    }
  }

  // 3. Tìm custom Button component
  let detectedButtonComponent = '@/components/ui/Button';
  if (!fs.existsSync(path.join(rootDir, 'src/components/ui/Button.tsx')) &&
      !fs.existsSync(path.join(rootDir, 'src/components/ui/button.tsx')) &&
      !fs.existsSync(path.join(rootDir, 'components/ui/button.tsx'))) {
    detectedButtonComponent = '@/components/ui/button';
  }

  // 4. Sinh file YAML thông minh dựa trên phân tích thực tế
  const generatedConfig = `version: "1.0"
preset: "${isNextJs ? 'nextjs' : 'clean-architecture'}"

target:
  include:
    - "src/**/*.{tsx,jsx,ts,js}"
  exclude:
    - "**/*.test.{tsx,jsx,ts,js}"
    - "**/*.spec.{tsx,jsx,ts,js}"
    - "**/node_modules/**"
    - "**/.next/**"
    - "**/dist/**"
    - "scripts/**"

rules:
  # 1. i18n (${hasI18n ? 'Kích hoạt vì phát hiện thư viện i18n' : 'Tắt vì dự án không dùng thư viện đa ngôn ngữ runtime'})
  i18n:
    enabled: ${hasI18n ? 'true' : 'false'}
${hasI18n ? `    severity: "error"
    locales:
      dir: "auto"
      default: "auto"
      supported: "auto"
      file_format: "json"` : ''}

  # 2. Design Tokens (${detectedTokensFile ? `Tự động đọc từ ${detectedTokensFile}` : 'Dùng Tailwind Tokens'})
  design_tokens:
    enabled: true
    severity: "warn"
${detectedTokensFile ? `    source_file: "${detectedTokensFile}"\n` : ''}    enforce_components:
      raw_button: "${detectedButtonComponent}"
      raw_link: "next/link"

  # 3. Clean Page Composition (Độ sâu JSX <= 3 tầng)
  clean_composition:
    enabled: true
    severity: "warn"
    targets:
      - "src/app/**/page.{tsx,jsx}"
      - "src/app/**/layout.{tsx,jsx}"
    max_raw_jsx_depth: 3
    max_raw_element_ratio: 0.4

  # 4. Chống Trùng Lặp Giao Diện (Rule of Three)
  component_deduplication:
    enabled: true
    severity: "warn"
    min_occurrences: 3
    min_element_count: 4
    similarity_threshold: 0.8

  # 5. Quản Trị Ranh Giới Server/Client${hasServerDb ? ' & Bảo Vệ Database' : ''}
  architecture:
    enabled: true
    preset: "${isNextJs ? 'nextjs' : 'clean-architecture'}"
    severity: "error"
    allow_type_imports: true
    server_client_boundary:
      enabled: true
      client_identifiers:
        - '"use client"'
        - "'use client'"
      disallowed_imports:
${hasServerDb ? `        - "@/server/shared/db"
        - "@/server"
        - "@neondatabase/serverless"
        - "server-only"\n` : ''}        - "fs"
        - "path"

  # 6. Thẩm Mỹ UI/UX, Dark Mode Integrity & Vercel Taste (23 Quy Luật)
  design_craft:
    enabled: true
    severity: "warn"
    no_decorative_floaters: true
    no_gradient_text: true
    no_missing_dark_mode: true
    no_transition_all: true
    no_bare_outline_none: true
    no_monospace_costume: true
    dark_mode_optical_compensation: true
    optical_kerning: true
    type_scale_jump: true
    optical_centering: true
    heading_text_balance: true
    tabular_numbers: true
    flex_truncate_min_w_0: true
`;

  fs.writeFileSync(targetPath, generatedConfig, 'utf-8');
  console.log(pc.green(`✔ Phân tích dự án hoàn tất! Đã tạo file cấu hình thông minh tại: ${pc.bold(targetPath)}`));
  if (detectedTokensFile) {
    console.log(pc.cyan(`  🎨 Đã tự động liên kết file Design Tokens: ${pc.bold(detectedTokensFile)}`));
  }
  console.log(pc.cyan(`  🌐 Trạng thái i18n: ${hasI18n ? pc.green('Đã bật') : pc.yellow('Tắt (Dự án không dùng thư viện i18n)')}`));
  console.log(pc.cyan(`\nCác bước tiếp theo:`));
  console.log(`  1. Chạy ${pc.bold('pnpm run lint:fast')} để quét tức thì các lỗi thẩm mỹ & Dark Mode.`);
  console.log(`  2. Chạy ${pc.bold('pnpm run gate')} để kiểm tra Web Quality Gate với Playwright thật.`);
}
