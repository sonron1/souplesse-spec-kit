/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
    browser: true,
  },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2022,
    sourceType: 'module',
    extraFileExtensions: ['.vue'],
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-recommended',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'vue'],
  globals: {
    // Nuxt auto-imports
    definePageMeta: 'readonly',
    navigateTo: 'readonly',
    useAuth: 'readonly',
    useLazyFetch: 'readonly',
    useFetch: 'readonly',
    useAsyncData: 'readonly',
    useHead: 'readonly',
    useRoute: 'readonly',
    useRouter: 'readonly',
    useRuntimeConfig: 'readonly',
    useCookie: 'readonly',
    useNuxtApp: 'readonly',
    $fetch: 'readonly',
    // Vue auto-imports
    ref: 'readonly',
    reactive: 'readonly',
    computed: 'readonly',
    watch: 'readonly',
    watchEffect: 'readonly',
    onMounted: 'readonly',
    onUnmounted: 'readonly',
    onBeforeMount: 'readonly',
    onBeforeUnmount: 'readonly',
    nextTick: 'readonly',
    defineProps: 'readonly',
    defineEmits: 'readonly',
    defineExpose: 'readonly',
    withDefaults: 'readonly',
  },
  rules: {
    // TypeScript
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    // Vue
    'vue/multi-word-component-names': 'off',
    'vue/no-unused-vars': 'error',
    // General
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    eqeqeq: ['error', 'always'],
    'prefer-const': 'error',
  },
  overrides: [
    {
      files: ['prisma/seed.js', 'scripts/**/*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'no-console': 'off',
      },
    },
    {
      files: ['scripts/perf/**/*.ts'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      files: ['tests/**/*.ts', 'tests/**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.nuxt/',
    '.output/',
    'coverage/',
    '*.d.ts',
    'prisma/migrations/',
  ],
}
