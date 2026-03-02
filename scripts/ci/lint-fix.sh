#!/bin/bash
# ESLint autofix script
# Usage: bash scripts/ci/lint-fix.sh

echo "🔧 Running ESLint autofix..."
npx eslint --fix "server/**/*.ts" "app/**/*.{vue,ts}" "tests/**/*.ts"

echo "🎨 Running Prettier..."
npx prettier --write "server/**/*.ts" "app/**/*.{vue,ts}" "tests/**/*.ts" "*.{json,md}"

echo "✅ Lint fix complete."
