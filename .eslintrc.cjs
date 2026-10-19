module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
  env: { browser: true, node: true, es2022: true },
  extends: ['eslint:recommended'],
  rules: {
    // TypeScript checks references and unused declarations, including types.
    'no-undef': 'off',
    'no-unused-vars': 'off',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    eqeqeq: ['error', 'always'],
  },
};
