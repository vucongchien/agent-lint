import { noHardcodedI18nRule } from './rules/no-hardcoded-i18n';
import { enforceDesignTokensRule } from './rules/enforce-design-tokens';

export const rules = {
  'no-hardcoded-i18n': noHardcodedI18nRule,
  'enforce-design-tokens': enforceDesignTokensRule,
};

export const configs = {
  recommended: {
    plugins: ['agent-lint'],
    rules: {
      'agent-lint/no-hardcoded-i18n': 'error',
      'agent-lint/enforce-design-tokens': 'warn',
    },
  },
  all: {
    plugins: ['agent-lint'],
    rules: {
      'agent-lint/no-hardcoded-i18n': 'error',
      'agent-lint/enforce-design-tokens': 'error',
    },
  },
};

export default {
  rules,
  configs,
};
