---
name: agent-lint
description: "AI-Native Codebase & Architecture Governance Engine for React, Next.js & TypeScript"
---

# Agent Skill: `agent-lint`

`agent-lint` is an AST analysis and automated code transformation engine tailored for **React, Next.js, and Fullstack TypeScript** codebases.

It enforces 3 core engineering standards:
1. **Architecture & Boundary Governance:** Enforces 1-Click Presets (`clean-architecture`, `fsd`, `ddd`, `nextjs`), maintains Domain model purity (zero ORM/framework contamination in Domain), guards Ports & Adapters, and prevents Next.js Server secrets from leaking into Client Components (`'use client'`).
2. **i18n Compliance & ICU Auto-Sync:** Detects hardcoded JSX text & dynamic template literals (`` `Hello ${user.name}` ``), automatically converts them into ICU translation keys, injects `useTranslations()` / `useTranslation()` hooks, and appends entries directly to your dictionary JSON files (`messages/*.json`, `locales/*.json`).
3. **Design Tokens & Component Governance:** Flags arbitrary hex/pixel styling, enforces Design System Custom Components (`<Button>`, `<Link>`, `<Image>`), maintains composition-first `page.tsx` structures (max DOM depth $\le 3$), and detects duplicate layout skeletons via the Rule of Three.

---

## 1. When Should an AI Agent Activate This Skill?

Activate this skill when:
* The user asks to: *"Check for hardcoded strings / i18n"*, *"Migrate project to multi-language"*, *"Enforce Clean Architecture / FSD in Next.js"*, *"Check Design Tokens"*, *"Clean unused translation keys"*, or *"Audit component deduplication"*.
* Preparing a pull request or code change to verify zero architectural drift and 100% compliance.
* Autonomous batch-refactoring of UI components or fixing architecture violations across the repository.

---

## 2. CLI Command Cheatsheet

### 2.1. Scan & Report for AI Agents
```bash
# Scan and generate structured, actionable prompt report for LLMs
npx agent-lint scan --format=agent

# Scan and output detailed machine-readable JSON
npx agent-lint scan --format=json

# Generate OASIS SARIF v2.1.0 report for Oxlint and GitHub CodeQL
npx agent-lint scan --format=sarif --output=report.sarif
```

### 2.2. Automated Code Transformation & Dictionary Sync
```bash
# Automatically extract strings/templates, inject hooks, enforce components, and update dictionary files
npx agent-lint fix

# Fix specific files only
npx agent-lint fix src/app/dashboard/page.tsx src/components/Header.tsx
```

### 2.3. Dead Translation Keys Management
```bash
# Audit unused/orphaned keys in translation dictionary files
npx agent-lint clean-keys

# Automatically prune and delete orphaned keys from JSON files
npx agent-lint clean-keys --prune
```

### 2.4. Initialize Configuration
```bash
# Generate .agent-lint.yaml with smart framework and locale auto-detection
npx agent-lint init
```

---

## 3. Standard AI Agent Execution Workflow

When tasked with auditing or refactoring a codebase, the AI Agent MUST follow this deterministic 4-step loop:

1. **Step 1 — Verify Configuration:**
   Check if `.agent-lint.yaml` exists in the workspace root. If missing, run `npx agent-lint init`. Ensure the appropriate architecture `preset` is declared (e.g. `preset: "nextjs"` or `preset: "clean-architecture"`).

2. **Step 2 — Run Analysis:**
   Execute `npx agent-lint scan --format=json` (or `--format=agent`) to inspect all violations across i18n, design tokens, page composition, and architectural boundaries.

3. **Step 3 — Execute Automated Fix:**
   * Run `npx agent-lint fix` to automatically perform AST transformations, inject translation hooks, convert dynamic templates to ICU messages, and replace raw HTML elements with custom components.
   * If architecture boundary violations are reported (e.g. prohibited ORM in Domain or server leak in Client Component), refactor the import paths or dependency injection interfaces as recommended in the report.

4. **Step 4 — Verify & Clean:**
   * Run `npx agent-lint clean-keys --prune` to remove any orphaned dictionary keys.
   * Re-run `npx agent-lint scan` and verify that the output reaches **0 errors, 0 warnings**.
