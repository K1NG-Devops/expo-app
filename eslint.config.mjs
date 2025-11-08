// Flat ESLint config for the Next.js web app
// - Ignore generated output (.next, node_modules, dist)
// - Use Next.js recommended rules
// - Disable overzealous rules to keep CI green

import eslintConfigNext from 'eslint-config-next';

export default [
  // Ignore generated/build folders
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'public/**',
      // Type build artifacts inside Next cache
      '.next/types/**',
      '.next/dev/types/**',
    ],
  },
  // Next.js base config
  ...eslintConfigNext,
  // Local generic tweaks without plugin dependencies
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      // General ergonomics
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'max-lines': 'off',
      // Relax React rules that are noisy or conflict with existing patterns
      'react/no-unescaped-entities': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  // Ensure any .d.ts or generated type files are not linted strictly
  {
    files: ['**/*.d.ts'],
    rules: {
      'no-unused-vars': 'off',
    },
  },
];
