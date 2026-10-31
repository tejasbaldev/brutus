import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

// Layering: ui -> story, persistence, ai -> engine. Lower layers never import upward.
const forbid = (...groups) => ['error', { patterns: groups }];
const noReact = { group: ['react', 'react-dom', 'react/*'], message: 'Only src/ui may use React.' };
const noUi = { group: ['**/ui', '**/ui/**'], message: 'Lower layers must not import from ui.' };
const noAi = { group: ['**/ai', '**/ai/**'], message: 'engine must not depend on ai.' };
const noStory = {
  group: ['**/story', '**/story/**'],
  message: 'Logic layers must not import story copy.',
};
const noPersistence = {
  group: ['**/persistence', '**/persistence/**'],
  message: 'Only ui talks to persistence.',
};

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='Math'][property.name='random']",
          message:
            'Use the injectable Rng from src/engine/rng.ts so behaviour stays deterministic.',
        },
      ],
    },
  },
  {
    files: ['eslint.config.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['src/ui/**/*.{ts,tsx}', 'src/main.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['src/engine/**'],
    rules: { 'no-restricted-imports': forbid(noReact, noUi, noAi, noStory, noPersistence) },
  },
  {
    files: ['src/ai/**'],
    rules: { 'no-restricted-imports': forbid(noReact, noUi, noStory, noPersistence) },
  },
  {
    files: ['src/story/**', 'src/persistence/**'],
    rules: { 'no-restricted-imports': forbid(noReact, noUi) },
  },
);
