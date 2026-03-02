#!/bin/bash
# Load test script using hey (https://github.com/rakyll/hey)
# Usage: bash scripts/test/load-test.sh [BASE_URL]

BASE_URL="${1:-http://localhost:3000}"
RESULTS_DIR="reports/load"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
mkdir -p "$RESULTS_DIR"

echo "🚀 Load test target: $BASE_URL"
echo "Results will be saved to: $RESULTS_DIR/"

# Test 1: Subscription plans listing (public)
echo -e "\n--- Test 1: GET /api/subscription-plans ---"
hey -n 200 -c 20 -t 10 "${BASE_URL}/api/subscription-plans" | tee "${RESULTS_DIR}/plans-${TIMESTAMP}.txt"

# Test 2: Sessions listing (public)
echo -e "\n--- Test 2: GET /api/sessions ---"
hey -n 200 -c 20 -t 10 "${BASE_URL}/api/sessions" | tee "${RESULTS_DIR}/sessions-${TIMESTAMP}.txt"

echo -e "\n✅ Load test complete. Reports saved to ${RESULTS_DIR}/"
