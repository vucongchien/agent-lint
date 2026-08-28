# agent-lint

<p align="center">
  <strong>AI-Native Linter & Auto-Sync Engine for i18n and Design Tokens in React & Next.js</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/agent-lint"><img src="https://img.shields.io/npm/v/agent-lint.svg?color=blue" alt="npm version"></a>
  <a href="https://github.com/vucongchien/agent-lint/actions"><img src="https://img.shields.io/badge/tests-29%20passed-brightgreen" alt="Tests"></a>
  <a href="https://github.com/vucongchien/agent-lint/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.x-blue" alt="TypeScript"></a>
</p>

---

## 💡 Overview

Modern frontend codebases often suffer from two major scaling issues:
1. **Hardcoded UI Strings:** Unextracted copy in JSX prevents seamless localization (i18n) and costs weeks of manual refactoring during international expansion.
2. **Ad-hoc Styling & Rogue Values:** Arbitrary hex colors (`#1e293b`) and ad-hoc pixels (`p-[15px]`) break Design System consistency.

**`agent-lint`** is a high-performance AST linter and automated code transformer. It detects hardcoded text and design token violations with **zero false positives**, automatically syncs translation keys directly into your locale dictionary files (`locales/en.json`, `messages/vi.json`), and provides structured outputs tailored for **AI Coding Agents** (Antigravity, Cursor, Claude Code).

---

## ✨ Features

- **⚡ Direct i18n Auto-Sync:** Converts hardcoded JSX text and attributes (`placeholder`, `title`, `aria-label`) into translation keys, injects `useTranslations()` / `useTranslation()` hooks, and appends entries directly to your dictionary files.
- **🎨 Design Token Enforcement:** Flags arbitrary colors and spacing in Tailwind classes and inline styles, recommending the nearest token via $\Delta E$ (CIEDE2000) color distance matching.
- **🎯 Zero False Positives (Semantic Heuristics):** Intelligently ignores non-user-facing props (`id`, `key`, `type`, `className`), technical tags (`<svg>`, `<code>`, `<pre>`), CSS units, URLs, UUIDs, and CSS variables (`var(--...)`).
- **🤖 AI Agent Native:** Built-in `--format=agent` output and ready-to-use `SKILL.md` for seamless autonomous refactoring.
- **🔌 Dual Ecosystem:** Run as a standalone CLI or integrate into your IDE via `eslint-plugin-agent-lint`.

---

## 📦 Installation

```bash
# pnpm
pnpm add -D agent-lint eslint-plugin-agent-lint

# npm
npm install --save-dev agent-lint eslint-plugin-agent-lint

# yarn / bun
yarn add -D agent-lint eslint-plugin-agent-lint
bun add -d agent-lint eslint-plugin-agent-lint
```

---

## 🚀 Quick Start

### 1. Initialize Configuration
Generate a `.agent-lint.yaml` with smart defaults:
```bash
npx agent-lint init
```

### 2. Scan for Violations
```bash
# Pretty terminal output
npx agent-lint scan

# Machine-readable JSON output (for CI)
npx agent-lint scan --format=json

# Actionable Markdown prompt (for AI Agents)
npx agent-lint scan --format=agent
```

### 3. Automated Fix & Dictionary Sync
```bash
# Automatically extract strings, inject hooks, and update dictionary files
npx agent-lint fix
```

### 4. Find & Prune Dead Translation Keys
```bash
# Detect unused keys in dictionary files
npx agent-lint clean-keys

# Automatically prune orphaned keys from JSON files
npx agent-lint clean-keys --prune
```

---

## 🔍 Before & After

### Before `agent-lint fix`:
```tsx
// ❌ Hardcoded strings and arbitrary styling
export function WelcomeBanner() {
  return (
    <div className="bg-[#1e293b] p-[15px]">
      <h1>Welcome back!</h1>
      <input placeholder="Search products..." />
    </div>
  );
}
```

### After `agent-lint fix`:
```tsx
// ✅ Extracted, typed, and localized with Design Tokens
import { useTranslations } from 'next-intl';

export function WelcomeBanner() {
  const t = useTranslations();
  return (
    <div className="bg-slate-800 p-4">
      <h1>{t('welcome_back')}</h1>
      <input placeholder={t('search_products')} />
    </div>
  );
}
```

```json
// ✅ locales/en.json (Automatically updated)
{
  "welcome_back": "Welcome back!",
  "search_products": "Search products..."
}
```

---

## ⚙️ Configuration (`.agent-lint.yaml`)

```yaml
version: "1.0"

target:
  include:
    - "src/**/*.{tsx,jsx}"
  exclude:
    - "**/*.test.{tsx,jsx}"
    - "**/node_modules/**"
    - "**/.next/**"

rules:
  # 1. i18n Rule
  i18n:
    enabled: true
    severity: "error" # "warn" | "error"
    locales:
      dir: "auto" # Auto-detects 'messages', 'locales', 'src/locales'
      default: "auto"
      supported: "auto"
      file_format: "json"
    integration:
      framework: "auto" # Auto-detects 'next-intl' vs 'react-i18next'
      hook_name: "useTranslations"
      function_name: "t"
      auto_import: true
      import_source: "next-intl"
    key_generation:
      strategy: "slug" # "slug" | "camelCase" | "file_scoped" | "hash"
      max_length: 40
    attributes:
      - "placeholder"
      - "title"
      - "alt"
      - "aria-label"

  # 2. Design Tokens Rule
  design_tokens:
    enabled: true
    severity: "warn"
    provider: "tailwind"
    enforce:
      colors: true # Flags raw hex/rgb: bg-[#1e293b]
      spacing: true # Flags raw pixels: p-[15px]
      font_sizes: true # Flags raw font-size: text-[15px]
    suggestion:
      auto_suggest: true
      color_tolerance: 0.85

    # 3. Enforce Design System Custom Components
    enforce_components:
      enabled: true
      severity: "error"
      restricted_elements:
        button:
          use: "Button"
          from: "@/components/ui/button"
          message: "Use <Button /> from Design System instead of raw <button> tag."
        a:
          use: "Link"
          from: "next/link"
          message: "Use <Link /> from next/link for client-side navigation."
        img:
          use: "Image"
          from: "next/image"
```

---

## 🔌 ESLint & Oxlint Integration

### 1. ESLint Integration (ESLint 9 Flat Config)
Add the plugin to your `eslint.config.mjs`:

```js
import agentLint from 'eslint-plugin-agent-lint';

export default [
  {
    plugins: {
      'agent-lint': agentLint,
    },
    rules: {
      'agent-lint/no-hardcoded-i18n': 'error',
      'agent-lint/enforce-design-tokens': 'warn',
    },
  },
];
```

### 2. Oxlint & High-Performance CI Pipeline
`agent-lint` supports the **OASIS SARIF v2.1.0** standard used by `oxlint` and GitHub Code Scanning.

In your CI or `package.json`:
```json
{
  "scripts": {
    "lint:fast": "oxlint . && agent-lint scan",
    "lint:sarif": "agent-lint scan --format=sarif --output=results.sarif"
  }
}
```

```yaml
# .github/workflows/lint.yml
- name: Run Oxlint & Agent-Lint
  run: |
    npx oxlint .
    npx agent-lint scan --format=sarif --output=agent-lint.sarif

- name: Upload SARIF report
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: agent-lint.sarif
```

---

## 🤖 AI Agent Workflow (`SKILL.md`)

`agent-lint` includes a preconfigured skill definition at `skills/agent-lint/SKILL.md`.

When delegating refactoring to an AI Agent:
1. Run `npx agent-lint scan --format=agent`.
2. The agent parses the structured action report.
3. The agent executes `npx agent-lint fix` or contextual key refinements.
4. The agent verifies with `npx agent-lint scan` until 0 errors remain.

---

## 📂 Recommended Project Layouts

| Architecture | Locales Path | Framework |
| :--- | :--- | :--- |
| **Next.js App Router** | `messages/[locale].json` | `next-intl` |
| **Next.js Pages Router** | `public/locales/[locale]/common.json` | `next-i18next` |
| **React (Vite / CRA)** | `src/locales/[locale].json` | `react-i18next` |

---

## 🧪 Testing

```bash
# Run unit tests
pnpm test

# Run build
pnpm build
```

---

## 📄 License

MIT © [vucongchien](https://github.com/vucongchien)
