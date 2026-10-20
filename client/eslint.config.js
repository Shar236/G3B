import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Data is intentionally loaded in an effect when a screen mounts, so the
      // synchronous `setLoading` / `setError` calls that begin each loader are
      // expected. Surfaced as a warning rather than a build-blocking error.
      'react-hooks/set-state-in-effect': 'warn',
      // Context modules export their consumer hook next to the provider
      // component; this only affects Fast Refresh granularity in development.
      'react-refresh/only-export-components': 'warn',
    },
  },
])
