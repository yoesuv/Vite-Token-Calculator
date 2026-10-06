import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    rules: {
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      'no-nested-ternary': 'error',
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-implied-eval': 'error',
      'no-extend-native': 'error',
      'no-restricted-properties': [
        'error',
        { object: 'document', property: 'write' },
        { object: 'document', property: 'writeln' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "AssignmentExpression > MemberExpression.left[property.name=/^(innerHTML|outerHTML)$/]",
          message: 'Use textContent or sanitize input.',
        },
      ],
    },
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      eqeqeq: ['error', 'always'],
      'no-nested-ternary': 'error',
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-implied-eval': 'error',
      'no-extend-native': 'error',
      'no-restricted-properties': [
        'error',
        { object: 'document', property: 'write' },
        { object: 'document', property: 'writeln' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "AssignmentExpression > MemberExpression.left[property.name=/^(innerHTML|outerHTML)$/]",
          message: 'Use textContent or sanitize input.',
        },
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'dangerouslySetInnerHTML is prohibited.',
        },
      ],
    },
  },
])
