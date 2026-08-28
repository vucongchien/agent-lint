# agent-lint

<p align="center">
  <strong>AI-Native Codebase & Architecture Governance Engine for React, Next.js & TypeScript</strong>
</p>

<p align="center">
  <a href="https://github.com/vucongchien/agent-lint/actions/workflows/ci.yml"><img src="https://github.com/vucongchien/agent-lint/actions/workflows/ci.yml/badge.svg" alt="CI Status"></a>
  <a href="https://github.com/vucongchien/agent-lint/actions"><img src="https://img.shields.io/badge/tests-67%20passed-brightgreen" alt="Tests"></a>
  <a href="https://www.npmjs.com/package/agent-lint"><img src="https://img.shields.io/badge/npm-v0.1.0-blue" alt="npm version"></a>
  <a href="https://github.com/vucongchien/agent-lint/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.9+-blue" alt="TypeScript"></a>
</p>

---

## ⚡ Highlights

- **🏛️ 1-Click Architecture Presets**: Enforce Clean Architecture, FSD, DDD, and Next.js Server/Client boundaries with zero boilerplate.
- **✨ Design Craft & Optical Physics**: Optical kerning on small text, Dark Mode visual irradiation compensation ($x - x/16$), 2-step type scale jumps, optical vertical centering, and sensory danger alert anchors.
- **⚡ Direct i18n Auto-Sync & ICU**: Auto-extracts static text & dynamic template literals (`` `Hello ${user}` ``) $\rightarrow$ updates dictionary files in real time.
- **🧹 Dead Keys Cleaner**: Detects and prunes orphaned translation keys (`agent-lint clean-keys --prune`).
- **🎨 Design Tokens & Custom Components**: Flags arbitrary hex/pixels, while auto-replacing raw `<button>`, `<a>`, `<img>` with Design System components.
- **📐 Clean Page Composition**: Keeps `page.tsx` composition-first (max DOM depth $\le 3$) and flags duplicate layout skeletons via Rule of Three.
- **🤖 AI Agent Native & SARIF**: Outputs structured prompts for Cursor/Claude and SARIF v2.1.0 for Oxlint & GitHub CodeQL.

---

## 🚀 Visual Demos (Before vs After)

### 1. ⚡ 1-Second Auto-Fix (`npx agent-lint fix`)
Converts ad-hoc markup into localized, token-compliant code and updates dictionaries automatically:

```tsx
// ❌ BEFORE
export function UserProfileHeader({ user, unreadCount }) {
  return (
    <div className="bg-[#1e293b] p-[15px]">
      <h1>{`Xin chào ${user.name}, bạn có ${unreadCount} thông báo mới!`}</h1>
      <button onClick={user.logout}>Đăng xuất</button>
    </div>
  );
}
```
$$\Big\Downarrow \text{ npx agent-lint fix }$$
```tsx
// ✅ AFTER (Auto-injected hooks, ICU interpolation, tokens, and Custom Components)
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export function UserProfileHeader({ user, unreadCount }) {
  const t = useTranslations();
  return (
    <div className="bg-slate-800 p-4">
      <h1>{t('xin_chao_name_ban_co_unread_count_thong_bao_moi', { name: user.name, unreadCount })}</h1>
      <Button onClick={user.logout}>{t('dang_xuat')}</Button>
    </div>
  );
}
```
```json
// 📁 messages/vi.json (Auto-appended)
{
  "xin_chao_name_ban_co_unread_count_thong_bao_moi": "Xin chào {name}, bạn có {unreadCount} thông báo mới!",
  "dang_xuat": "Đăng xuất"
}
```

---

### 2. 🏛️ Architecture & Domain Purity Governance
Catch AI or human errors contaminating Domain layers or leaking Server secrets into Client Components:

```typescript
// ❌ src/domain/entities/Order.ts (ORM contamination in Domain)
import { Entity, Column } from 'typeorm'; // 🚨 PROHIBITED

// ❌ src/app/profile.client.tsx (Secret server leak in Client Component)
"use client";
import { prisma } from '@/lib/db'; // 🚨 PROHIBITED
```
```text
  error  src/domain/entities/Order.ts:1:1
         ↳ Domain Purity Violation: Layer "domain" is prohibited from importing "typeorm".

  error  src/app/profile.client.tsx:2:1
         ↳ Server/Client Boundary Violation: Client Component cannot import server module "@/lib/db".
```

---

## 📦 Installation

```bash
# pnpm / npm / bun
pnpm add -D agent-lint @chien_swe/core eslint-plugin-agent-lint
npm install -D agent-lint @chien_swe/core eslint-plugin-agent-lint
bun add -d agent-lint @chien_swe/core eslint-plugin-agent-lint
```

---

## 💻 CLI Usage

```bash
npx agent-lint init                  # Generate .agent-lint.yaml with smart defaults
npx agent-lint scan                  # Scan codebase for violations
npx agent-lint scan --format=agent   # Output actionable prompt for AI Agents (Cursor/Claude)
npx agent-lint scan --format=sarif   # Generate SARIF report for Oxlint / GitHub CodeQL
npx agent-lint fix                   # Automatically fix violations & sync translations
npx agent-lint clean-keys --prune    # Detect and prune dead translation keys
```

---

## ⚙️ Configuration (`.agent-lint.yaml`)

```yaml
version: "1.0"

# 1-Click Presets: "nextjs" | "clean-architecture" | "fsd" | "ddd" | "custom"
preset: "nextjs"

target:
  include: ["src/**/*.{tsx,jsx,ts,js}"]
  exclude: ["**/*.test.{tsx,ts}", "**/node_modules/**", "**/.next/**", "**/dist/**"]

rules:
  # 1. i18n Auto-Sync
  i18n:
    enabled: true
    severity: "error"
    locales: { dir: "auto", default: "auto", supported: "auto", file_format: "json" }
    integration: { framework: "auto", hook_name: "useTranslations", auto_import: true }

  # 2. Design Tokens & Component Enforcer
  design_tokens:
    enabled: true
    severity: "warn"
    provider: "tailwind"
    enforce: { colors: true, spacing: true, font_sizes: true }
    enforce_components:
      enabled: true
      severity: "error"
      restricted_elements:
        button: { use: "Button", from: "@/components/ui/button" }
        a: { use: "Link", from: "next/link" }
        img: { use: "Image", from: "next/image" }

  # 3. Clean Page Composition
  clean_composition:
    enabled: true
    severity: "warn"
    targets: ["**/page.{tsx,jsx}", "**/layout.{tsx,jsx}"]
    max_raw_jsx_depth: 3
    max_raw_element_ratio: 0.6

  # 4. Component Deduplication (Rule of Three)
  component_deduplication:
    enabled: true
    severity: "warn"
    min_occurrences: 3
    similarity_threshold: 0.80

  # 5. Architecture & Layer Boundaries
  architecture:
    enabled: true
    preset: "nextjs"
    severity: "error"
    allow_type_imports: true

  # 6. Design Craft & Visual Quality (Anti-AI Slop)
  design_craft:
    enabled: true
    severity: "warn"
    no_side_accent_border: true
    no_gradient_text: true
    no_glowing_shadows: true
    no_nested_cards: true
    no_eyebrow_kicker: true
    no_fake_pulse_dot: true
    no_ghost_card: true
```

---

## 🔌 Integrations

### ESLint 9 Flat Config (`eslint.config.mjs`)
```js
import agentLint from 'eslint-plugin-agent-lint';

export default [
  {
    plugins: { 'agent-lint': agentLint },
    rules: {
      'agent-lint/no-hardcoded-i18n': 'error',
      'agent-lint/enforce-design-tokens': 'warn',
    },
  },
];
```

### Oxlint & GitHub Actions CI
```yaml
- name: Run Oxlint & Agent-Lint
  run: |
    npx oxlint .
    npx agent-lint scan --format=sarif --output=report.sarif

- name: Upload to GitHub Security
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: report.sarif
```

---

## 📄 License

MIT © [vucongchien](https://github.com/vucongchien)
