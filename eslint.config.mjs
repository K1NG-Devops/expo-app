import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import i18next from 'eslint-plugin-i18next';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: parser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // React Native globals
        __DEV__: 'readonly',
        console: 'readonly',
        require: 'readonly',
        process: 'readonly',
        global: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      'react-hooks': reactHooks,
      'i18next': i18next,
    },
    rules: {
      // Allow any for scaffolded/generated code
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      // Disable rules that are too strict for working code
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-empty': 'warn', // Allow empty blocks in scaffolded code
      'no-unused-vars': 'off',
      'no-undef': 'off', // Let TypeScript handle this
      // React hooks best practices
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // i18n enforcement - warn on hardcoded strings in JSX
      'i18next/no-literal-string': ['warn', {
        markupOnly: true,
        ignoreAttribute: ['testID', 'name', 'type', 'id', 'key', 'style'],
      }],
      // Relax rules that conflict with current serverless patterns
      'no-useless-catch': 'off',
      'no-prototype-builtins': 'off',
    },
  },
  {
    ignores: [
      'node_modules/',
      'dist/',
      '.expo/',
      'android/',
      'ios/',
      'scripts/',
      'docs/',
      '**/*.js', // Exclude all JS files, focus on TS/TSX
      '**/*.js.map',
      'babel.config.js',
      'metro.config.js',
      'App.js',
      '**/*.d.ts',
      'web-build/',
      'populate_profiles.js',
      'debug_profile.js',
    ],
  },
];
