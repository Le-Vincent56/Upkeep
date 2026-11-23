import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const TAURI_BOUNDARY_MESSAGE =
  'Only src/adapters may import Tauri. Add the capability to an adapter instead.';

export default defineConfig([
  globalIgnores(['dist/', 'src-tauri/']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/adapters/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@tauri-apps/*'], message: TAURI_BOUNDARY_MESSAGE }] },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportExpression[source.value=/^@tauri-apps\\//]',
          message: TAURI_BOUNDARY_MESSAGE,
        },
      ],
    },
  },
  {
    files: ['src/catalog/**/*.ts'],
    rules: {
      // Replaces the src/** entry above for these files, so the Tauri group is repeated.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react/*', 'react-dom', 'react-dom/*'],
              message: 'src/catalog is a pure domain module and must not import React.',
            },
            { group: ['@tauri-apps/*'], message: TAURI_BOUNDARY_MESSAGE },
            {
              group: ['**/app', '**/app/*', '**/adapters', '**/adapters/*'],
              message: 'src/catalog must not depend on the app shell or adapters.',
            },
            {
              group: ['**/planning', '**/planning/**', '**/decks', '**/decks/**'],
              message: 'src/catalog must not depend on player-side modules.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/planning/**/*.ts'],
    rules: {
      // Replaces the src/** entry above for these files, so the Tauri group is repeated.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react/*', 'react-dom', 'react-dom/*'],
              message: 'src/planning is a pure domain module and must not import React.',
            },
            { group: ['@tauri-apps/*'], message: TAURI_BOUNDARY_MESSAGE },
            {
              group: ['**/app', '**/app/*', '**/adapters', '**/adapters/*'],
              message: 'src/planning must not depend on the app shell or adapters.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/decks/**/*.ts'],
    rules: {
      // Replaces the src/** entry above for these files, so the Tauri group is repeated.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react/*', 'react-dom', 'react-dom/*'],
              message: 'src/decks is a pure domain module and must not import React.',
            },
            { group: ['@tauri-apps/*'], message: TAURI_BOUNDARY_MESSAGE },
            {
              group: [
                '**/app',
                '**/app/*',
                '**/adapters',
                '**/adapters/*',
                '**/features',
                '**/features/**',
              ],
              message: 'src/decks must not depend on the app shell, adapters, or features.',
            },
            {
              group: ['**/planning', '**/planning/**'],
              message: 'src/decks must not depend on the planner; the planner reads deck types.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: {
      // Replaces the src/** entry above for these files, so the Tauri group is repeated.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@tauri-apps/*'], message: TAURI_BOUNDARY_MESSAGE },
            {
              group: [
                '**/adapters',
                '**/adapters/**',
                '**/app',
                '**/app/**',
                '**/features',
                '**/features/**',
                '**/planning',
                '**/planning/**',
                '**/decks',
                '**/decks/**',
              ],
              message:
                'src/ui holds presentational pieces only: React and src/catalog, nothing else from the app.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    ignores: ['src/features/**/*.test.ts'],
    rules: {
      // Replaces the src/** entry above for these files, so the Tauri group is repeated.
      // Tests are exempt so they can drive the fixture readers.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@tauri-apps/*'], message: TAURI_BOUNDARY_MESSAGE },
            {
              group: ['**/adapters', '**/adapters/**'],
              message:
                'Features receive capabilities through AppDependencies, never from src/adapters.',
            },
          ],
        },
      ],
    },
  },
]);
