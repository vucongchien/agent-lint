import { z } from 'zod';

export const I18nLocalesSchema = z.object({
  dir: z.string().default('auto'),
  default: z.string().default('auto'),
  supported: z.union([z.array(z.string()), z.literal('auto')]).default('auto'),
  file_format: z.enum(['json', 'nested-json', 'ts', 'js']).default('json'),
});

export const I18nIntegrationSchema = z.object({
  framework: z.enum(['auto', 'next-intl', 'react-i18next', 'custom']).default('auto'),
  hook_name: z.string().default('useTranslations'),
  function_name: z.string().default('t'),
  auto_import: z.boolean().default(true),
  import_source: z.string().default('next-intl'),
});

export const I18nKeyGenSchema = z.object({
  strategy: z.enum(['slug', 'camelCase', 'file_scoped', 'hash']).default('slug'),
  max_length: z.number().default(40),
  prefix: z.string().default(''),
});

export const I18nRuleSchema = z.object({
  enabled: z.boolean().default(true),
  severity: z.enum(['warn', 'error', 'off']).default('error'),
  locales: I18nLocalesSchema.default({}),
  integration: I18nIntegrationSchema.default({}),
  key_generation: I18nKeyGenSchema.default({}),
  attributes: z.array(z.string()).default(['placeholder', 'title', 'alt', 'aria-label', 'aria-description']),
  whitelist: z.array(z.string()).default(['&times;', 'OK', 'Beta']),
  ignore_patterns: z.array(z.string()).default([
    '^[0-9]+$',
    '^[\\s\\-_/|:,.]+$',
    '^https?://',
    '^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$',
  ]),
});

export const DesignTokensEnforceSchema = z.object({
  colors: z.boolean().default(true),
  spacing: z.boolean().default(true),
  font_sizes: z.boolean().default(true),
  radii: z.boolean().default(true),
  shadows: z.boolean().default(true),
  font_weights: z.boolean().default(true),
  line_heights: z.boolean().default(true),
  z_indices: z.boolean().default(true),
});

export const DesignTokensSuggestionSchema = z.object({
  auto_suggest: z.boolean().default(true),
  color_tolerance: z.number().default(0.85),
});

export const RestrictedElementSchema = z.object({
  use: z.string(),
  from: z.string(),
  message: z.string().optional(),
});

export const EnforceComponentsSchema = z.object({
  enabled: z.boolean().default(true),
  severity: z.enum(['warn', 'error', 'off']).default('error'),
  restricted_elements: z.record(RestrictedElementSchema).default({}),
});

export const DesignTokensRuleSchema = z.object({
  enabled: z.boolean().default(true),
  severity: z.enum(['warn', 'error', 'off']).default('warn'),
  provider: z.enum(['tailwind', 'custom', 'css-variables']).default('tailwind'),
  enforce: DesignTokensEnforceSchema.default({}),
  suggestion: DesignTokensSuggestionSchema.default({}),
  tokens: z.object({
    colors: z.record(z.string()).optional(),
    spacing: z.record(z.union([z.string(), z.number()])).optional(),
    font_sizes: z.record(z.union([z.string(), z.number()])).optional(),
    radii: z.record(z.union([z.string(), z.number()])).optional(),
    shadows: z.record(z.string()).optional(),
    font_weights: z.record(z.union([z.string(), z.number()])).optional(),
    line_heights: z.record(z.union([z.string(), z.number()])).optional(),
    z_indices: z.record(z.union([z.string(), z.number()])).optional(),
  }).optional(),
  enforce_components: EnforceComponentsSchema.optional(),
});

export const CleanCompositionSchema = z.object({
  enabled: z.boolean().default(true),
  severity: z.enum(['warn', 'error', 'off']).default('warn'),
  targets: z.array(z.string()).default(['**/page.{tsx,jsx}', '**/layout.{tsx,jsx}', 'pages/**/*.{tsx,jsx}']),
  max_raw_jsx_depth: z.number().default(3),
  max_raw_element_ratio: z.number().default(0.6),
});

export const ComponentDeduplicationSchema = z.object({
  enabled: z.boolean().default(true),
  severity: z.enum(['warn', 'error', 'off']).default('warn'),
  min_occurrences: z.number().default(3),
  min_element_count: z.number().default(4),
  similarity_threshold: z.number().default(0.8),
});

export const LayerSchema = z.object({
  name: z.string(),
  path: z.string(),
  can_import: z.array(z.string()).default([]),
  disallowed_packages: z.array(z.string()).optional(),
  message: z.string().optional(),
});

export const ServerClientBoundarySchema = z.object({
  enabled: z.boolean().default(true),
  client_identifiers: z.array(z.string()).default(['"use client"', "'use client'"]),
  disallowed_imports: z.array(z.string()).default([
    '@/lib/db',
    'prisma',
    '@prisma/client',
    'server-only',
    'fs',
    'path',
  ]),
});

export const PublicApiSchema = z.object({
  enabled: z.boolean().default(true),
  modules: z.array(z.string()).default([]),
  entry_files: z.array(z.string()).default(['index.ts', 'index.tsx', 'index.js']),
});

export const ArchitectureRuleSchema = z.object({
  enabled: z.boolean().default(true),
  severity: z.enum(['warn', 'error', 'off']).default('error'),
  preset: z.enum(['nextjs', 'clean-architecture', 'fsd', 'ddd', 'custom']).default('custom'),
  allow_type_imports: z.boolean().default(true),
  layers: z.array(LayerSchema).optional(),
  server_client_boundary: ServerClientBoundarySchema.optional(),
  public_api: PublicApiSchema.optional(),
});

export const DesignCraftSchema = z.object({
  enabled: z.boolean().default(true),
  severity: z.enum(['warn', 'error', 'off']).default('warn'),
  no_side_accent_border: z.boolean().default(true),
  no_gradient_text: z.boolean().default(true),
  no_glowing_shadows: z.boolean().default(true),
  no_nested_cards: z.boolean().default(true),
  no_eyebrow_kicker: z.boolean().default(true),
  no_fake_pulse_dot: z.boolean().default(true),
  no_ghost_card: z.boolean().default(true),
});

export const AgentLintConfigSchema = z.object({
  version: z.string().default('1.0'),
  preset: z.enum(['nextjs', 'clean-architecture', 'fsd', 'ddd', 'custom']).optional(),
  target: z.object({
    include: z.array(z.string()).default(['src/**/*.{tsx,jsx,ts,js}']),
    exclude: z.array(z.string()).default([
      '**/*.test.{tsx,jsx,ts,js}',
      '**/*.spec.{tsx,jsx,ts,js}',
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
    ]),
  }).default({}),
  rules: z.object({
    i18n: I18nRuleSchema.default({}),
    design_tokens: DesignTokensRuleSchema.default({}),
    clean_composition: CleanCompositionSchema.optional(),
    component_deduplication: ComponentDeduplicationSchema.optional(),
    architecture: ArchitectureRuleSchema.optional(),
    design_craft: DesignCraftSchema.optional(),
  }).default({}),
});

export type AgentLintConfigInput = z.input<typeof AgentLintConfigSchema>;
export type AgentLintConfigOutput = z.infer<typeof AgentLintConfigSchema>;
