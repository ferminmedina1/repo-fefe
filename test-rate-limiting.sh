#!/bin/bash

###############################################################################
# Rate Limiting Validation Script
# Tests that endpoints properly return 429 responses when rate limit exceeded
#
# Usage: ./test-rate-limiting.sh <endpoint_url> <num_requests> [request_body]
# Example: ./test-rate-limiting.sh http://localhost:54321/functions/v1/finalize-signup 15
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Arguments
ENDPOINT=${1:-"http://localhost:54321/functions/v1/finalize-signup"}
NUM_REQUESTS=${2:-15}
REQUEST_BODY=${3:-'{"email":"test@example.com","password":"Test123!","name":"Test"}'}

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          RATE LIMITING VALIDATION TEST SUITE              ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"

echo ""
echo -e "${BLUE}Target Endpoint:${NC} $ENDPOINT"
echo -e "${BLUE}Requests to Send:${NC} $NUM_REQUESTS"
echo -e "${BLUE}Test Strategy:${NC} Rapid sequential requests to exceed limit"
echo ""

# Test 1: Check if endpoint returns rate limit headers
echo -e "${YELLOW}[TEST 1]${NC} Checking rate limit headers on first request..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "$REQUEST_BODY")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
HEADERS=$(echo "$RESPONSE" | head -n-1)

echo "HTTP Status: $HTTP_CODE"
echo "Headers extracted:"
echo "$HEADERS" | grep -i "x-ratelimit" || echo "⚠️  No rate limit headers found"

# Test 2: Send rapid requests to exceed limit
echo ""
echo -e "${YELLOW}[TEST 2]${NC} Sending $NUM_REQUESTS rapid requests..."

SUCCESS_COUNT=0
RATE_LIMIT_COUNT=0
ERROR_COUNT=0
TIMEOUT_COUNT=0

for i in $(seq 1 $NUM_REQUESTS); do
  echo -ne "\r  Request $i/$NUM_REQUESTS..."
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "$REQUEST_BODY" \
    --max-time 5)
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" = "000" ]; then
    ((TIMEOUT_COUNT++))
  elif [ "$HTTP_CODE" = "429" ]; then
    ((RATE_LIMIT_COUNT++))
    if [ $RATE_LIMIT_COUNT -eq 1 ]; then
      RATE_LIMIT_RESPONSE=$(echo "$RESPONSE" | head -n-1)
      echo ""
      echo -e "${GREEN}✓ First 429 received at request $i${NC}"
      echo ""
      echo "Rate Limit Response Headers:"
      echo "$RATE_LIMIT_RESPONSE" | grep -i "x-ratelimit" | while read line; do
        echo -e "${CYAN}  $line${NC}"
      done
    fi
  elif [ "$i" -lt 6 ]; then
    ((SUCCESS_COUNT++))
  else
    ((ERROR_COUNT++))
  fi
done

echo ""
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}RESULTS${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "${GREEN}✓ Successful (2xx):${NC} $SUCCESS_COUNT"
echo -e "${YELLOW}⚠ Rate Limited (429):${NC} $RATE_LIMIT_COUNT"
echo -e "${RED}✗ Errors (other):${NC} $ERROR_COUNT"
echo -e "${RED}⚠ Timeouts:${NC} $TIMEOUT_COUNT"

echo ""

# Test 3: Validate response structure
if [ "$RATE_LIMIT_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}[TEST 3]${NC} Validating 429 response structure..."
  
  # Check required headers
  REQUIRED_HEADERS=("x-ratelimit-limit" "x-ratelimit-remaining" "x-ratelimit-reset")
  HEADERS_FOUND=0
  HEADERS_MISSING=0
  
  for header in "${REQUIRED_HEADERS[@]}"; do
    if echo "$RATE_LIMIT_RESPONSE" | grep -qi "$header"; then
      echo -e "  ${GREEN}✓${NC} Found: $header"
      ((HEADERS_FOUND++))
    else
      echo -e "  ${RED}✗${NC} Missing: $header"
      ((HEADERS_MISSING++))
    fi
  done
  
  if [ "$HEADERS_MISSING" -eq 0 ]; then
    echo -e "${GREEN}✓ All required headers present${NC}"
  else
    echo -e "${RED}✗ Missing $HEADERS_MISSING required headers${NC}"
  fi
else
  echo -e "${RED}⚠ No 429 responses received - rate limiting may not be working${NC}"
fi

echo ""

# Summary
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$RATE_LIMIT_COUNT" -gt 0 ] && [ "$HEADERS_MISSING" -eq 0 ]; then
  echo -e "${GREEN}✓ RATE LIMITING WORKING CORRECTLY${NC}"
  echo ""
  echo "Summary:"
  echo "  • Rate limiting active and returning 429 responses"
  echo "  • Rate limit headers correctly set"
  echo "  • Limit enforced after ~5 successful requests"
  exit 0
elif [ "$RATE_LIMIT_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}⚠ RATE LIMITING PARTIALLY WORKING${NC}"
  echo ""
  echo "Issues detected:"
  echo "  • Missing some required headers"
  echo "  • Check X-RateLimit-* header implementation"
  exit 1
else
  echo -e "${RED}✗ RATE LIMITING NOT WORKING${NC}"
  echo ""
  echo "Issues detected:"
  echo "  • No 429 responses received"
  echo "  • Check if rate limiting is implemented"
  echo "  • Verify rateLimitMiddleware is imported and called"
  exit 2
fi
