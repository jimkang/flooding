module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: true
  },
  extends: 'eslint:recommended',
  rules: {
    indent: ['error', 2],
    'linebreak-style': ['error', 'unix'],
    quotes: ['error', 'single', { avoidEscape: true }],
    semi: ['error', 'always'],
    'no-console': 'off',
  },
  parserOptions: {
    sourceType: 'module'
  },
  overrides: [
    {
      files: ['**/*.ts'],
      plugins: ['@typescript-eslint/eslint-plugin'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.json'
      },
      extends: ['plugin:@typescript-eslint/recommended', 'eslint:recommended'],
      rules: {
        'no-var': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-use-before-define': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        'prefer-const': 'off',
        '@typescript-eslint/camelcase': 'off'
      }
    }
  ]
};
