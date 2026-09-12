import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['node_modules/**', '.next/**', 'next-env.d.ts', 'coverage/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // `ignoreRestSiblings` permits the omit idiom — `const { a, ...rest } = x`
      // to build `rest` without `a` — which is how optional fields are stripped
      // before an insert.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      // `x != null` is the idiomatic null-or-undefined check and is allowed;
      // every other comparison must be strict.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
    },
  },
  {
    files: ['scripts/**/*.ts', 'tests/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
