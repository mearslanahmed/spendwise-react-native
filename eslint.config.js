// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const unusedImports = require('eslint-plugin-unused-imports');

module.exports = defineConfig([
  expoConfig,
  {
    plugins: {
      'unused-imports': unusedImports,
    },
    ignores: ['dist/*'],
    rules: {
      'unused-imports/no-unused-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          'argsIgnorePattern': '^_',
          'varsIgnorePattern': '^_'
        }
      ]
    }
  },
]);
