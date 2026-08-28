---
name: agent-lint
description: "AI-Native Codebase Architecture, Design Craft (9.5/10 UX) & i18n Governance Engine for React, Next.js & TypeScript"
---

# Agent Skill: `agent-lint` (Hybrid Design Intelligence & AST Governance)

`agent-lint` combines the creative eyes of an award-winning **Design Director (9.5/10 UX Sophistication)** with a deterministic, **42ms AST static analysis and automated code transformation engine** tailored for **React, Next.js, and Fullstack TypeScript** codebases.

---

## 🏛️ Core Engineering & Design Pillars

### 1. 🎨 Design Craft & Optical Physics (9.5/10 UX Sophistication)
- **Dark Mode Integrity:** Eliminates broken dark themes by preventing hardcoded light surfaces/text (`bg-white`, `text-slate-900`) without matching `dark:` variants.
- **Optical Kerning & Sizing:** Enforces expanded letter-spacing on small text (`text-xs` $\ge$ `tracking-wide`) and dark mode visual irradiation compensation ($x - x/16$).
- **Anti-AI Slop Elimination:** Banned decorative tells (thick side-accent borders, gradient text, floating empty rotated diamonds, fake typewriter cursors, monospace costumes on prose, subjective 1-5 level dots, and misleading chat/email affordances).
- **Visual Rhythm & Optical Centering:** Enforces $1 : 1.2$ vertical padding ratios ($\text{pt} \approx 0.85 \times \text{pb}$) on viewport sections and $1/3$ width grid spacing.

### 2. 🏛️ Architecture & Boundary Governance
- **1-Click Presets:** Instant governance for `clean-architecture`, `fsd`, `ddd`, and `nextjs`.
- **Domain Purity:** Blocks ORMs (`@prisma/*`, `typeorm`, `mongoose`), frameworks (`@nestjs/*`), and HTTP clients in `src/domain/**`.
- **Next.js Isolation:** Prevents server-only modules (`@/lib/db`, `server-only`, `fs`, `path`) from leaking into Client Components (`'use client'`).

### 3. ⚡ i18n Automation & ICU Auto-Sync
- **Direct AST Extraction:** Automatically converts static JSX strings and dynamic template literals (`` `Hello ${user.name}` ``) into ICU message keys.
- **Hook & Dictionary Injection:** Injects `useTranslations()` / `useTranslation()` hooks and synchronizes entries directly into `locales/*.json` / `messages/*.json`.
- **Dead Keys Cleaner:** Prunes orphaned translation keys with `agent-lint clean-keys --prune`.

### 4. 📐 Clean Composition & Deduplication
- **Composition-First Pages:** Restricts raw DOM nesting depth $\le 3$ in `page.tsx` / `layout.tsx`.
- **Rule of Three:** Flags duplicate layout structures ($\ge 3$ occurrences with $\ge 80\%$ similarity) for polymorphic component refactoring.

---

## 📋 10 Nielsen Heuristics & Persona Testing Playbook

When auditing or refining interfaces, the AI Agent MUST evaluate against these 4 Core UX Criteria:

1. **System Transparency & Affordance:** Controls must accurately name their real action. If an input or button triggers an external client (e.g. Gmail / Mailto), it MUST feature an external indicator (`↗`) rather than simulating an instant internal chatbox.
2. **Dark Mode Contrast (WCAG AA $\ge 4.5:1$):** Never rely on OS auto-inversion. Every surface must declare explicit tokens (`bg-background text-foreground` or `bg-white dark:bg-slate-900`).
3. **Typography Rhythm (2-Step Jump):** Headings and supporting body copy must jump at least 2 scale steps (e.g. `text-xl` heading with `text-sm` body, avoiding flat `text-base` + `text-sm` pairings).
4. **Authentic Visual Identity:** Eliminate AI generic tells (purple gradients, typewriter effects, floating decorative diamonds). Use real vector SVG icons, purposeful solid colors, and meaningful layout rhythm.

---

## 💻 CLI Command Cheatsheet

### Scan & Audit
```bash
# Scan and generate structured, actionable prompt report for LLMs
npx agent-lint scan --format=agent

# Scan and output detailed machine-readable JSON (42ms)
npx agent-lint scan --format=json

# Generate OASIS SARIF v2.1.0 report for Oxlint and GitHub CodeQL
npx agent-lint scan --format=sarif --output=report.sarif
```

### 1-Click Automated Transformation
```bash
# Automatically extract strings/templates, inject hooks, enforce components, and update dictionary files
npx agent-lint fix

# Fix specific files only
npx agent-lint fix src/features/hero/components/HeroSection.tsx
```

### Dead Translation Keys Management
```bash
# Audit & prune orphaned keys from JSON dictionary files
npx agent-lint clean-keys --prune
```

---

## 🔄 Deterministic AI Agent Workflow

When tasked with creating, refactoring, or reviewing code:
1. **Step 1:** Verify `.agent-lint.yaml` configuration in workspace root.
2. **Step 2:** Run `npx agent-lint scan --format=agent` to extract all architectural, token, and optical craft violations.
3. **Step 3:** Run `npx agent-lint fix` to automatically perform AST transformations, token replacements, and locale dictionary synchronization.
4. **Step 4:** Manually resolve any remaining high-level architectural imports or UX affordances.
5. **Step 5:** Re-run `npx agent-lint scan` and verify that the output reaches **0 errors, 0 warnings**.
