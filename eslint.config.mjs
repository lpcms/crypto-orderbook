/**
 * ESLint flat config: typescript-eslint strict + project rules.
 */
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...tseslint.configs.strict,
  {
    rules: {
      'no-console': 'error'
    }
  },
  {
    /**
     * Next.js and PostCSS load these configs as CommonJS.
     */
    files: ['next.config.js', 'postcss.config.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off'
    }
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'public/**', 'next-env.d.ts']
  }
);
