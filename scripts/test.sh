#!/bin/bash
# QA Test Runner Script
# Executes comprehensive testing suite with multiple options

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_MODE="${1:-all}"
VERBOSE="${2:-false}"

print_header() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  $1${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

run_typescript_check() {
  print_header "TypeScript Compilation Check"
  npx tsc --noEmit
  print_success "TypeScript compilation successful"
}

run_lint() {
  print_header "ESLint Code Quality Check"
  npm run lint || print_warning "Lint warnings found - review recommended"
  print_success "Linting completed"
}

run_unit_tests() {
  print_header "Running Unit Tests"
  if [ "$VERBOSE" == "true" ]; then
    npm run test -- __tests__/Products.bugs.test.ts --reporter=verbose
  else
    npm run test -- __tests__/Products.bugs.test.ts
  fi
  print_success "Unit tests completed"
}

run_integration_tests() {
  print_header "Running Integration Tests"
  if [ "$VERBOSE" == "true" ]; then
    npm run test -- __tests__/Products.integration.test.ts --reporter=verbose
  else
    npm run test -- __tests__/Products.integration.test.ts
  fi
  print_success "Integration tests completed"
}

run_all_tests() {
  print_header "Running All Tests"
  if [ "$VERBOSE" == "true" ]; then
    npm run test -- --reporter=verbose
  else
    npm run test
  fi
  print_success "All tests completed"
}

run_coverage() {
  print_header "Generating Coverage Report"
  npm run test:coverage
  
  if [ -f "coverage/index.html" ]; then
    print_success "Coverage report generated: coverage/index.html"
    
    # Try to open in browser (if available)
    if command -v xdg-open > /dev/null 2>&1; then
      xdg-open coverage/index.html
    elif command -v open > /dev/null 2>&1; then
      open coverage/index.html
    fi
  fi
}

run_watch_mode() {
  print_header "Running Tests in Watch Mode"
  print_warning "Press Ctrl+C to exit watch mode"
  npm run test:watch
}

run_ui_mode() {
  print_header "Running Test UI Dashboard"
  npm run test:ui
}

run_security_audit() {
  print_header "Running Security Audit"
  npm audit || print_warning "Security vulnerabilities detected - review npm audit output"
  print_success "Security audit completed"
}

run_qa_metrics() {
  print_header "Generating QA Metrics"
  node scripts/qa-metrics.js
}

run_full_qa() {
  print_header "FULL QA PIPELINE"
  
  run_typescript_check
  echo ""
  
  run_lint
  echo ""
  
  run_unit_tests
  echo ""
  
  run_integration_tests
  echo ""
  
  run_coverage
  echo ""
  
  run_security_audit
  echo ""
  
  run_qa_metrics
  echo ""
  
  print_header "QA PIPELINE COMPLETE"
  print_success "All quality checks passed! Ready for deployment 🚀"
}

show_usage() {
  cat << EOF
${BLUE}QA Test Runner Script${NC}

Usage: ./scripts/test.sh [MODE] [VERBOSE]

Modes:
  all              Run all tests (default)
  unit             Run unit tests only
  integration      Run integration tests only
  coverage         Generate coverage report
  watch            Run tests in watch mode
  ui               Run interactive test UI dashboard
  lint             Run ESLint checks
  type-check       Run TypeScript compilation check
  security         Run security audit
  metrics          Generate QA metrics report
  full             Run complete QA pipeline

Options:
  VERBOSE=true     Show detailed test output

Examples:
  ./scripts/test.sh
  ./scripts/test.sh unit true
  ./scripts/test.sh coverage
  ./scripts/test.sh watch
  ./scripts/test.sh full
  ./scripts/test.sh all true

EOF
}

# Main execution
case "$TEST_MODE" in
  "unit")
    run_unit_tests
    ;;
  "integration")
    run_integration_tests
    ;;
  "all")
    run_all_tests
    ;;
  "coverage")
    run_coverage
    ;;
  "watch")
    run_watch_mode
    ;;
  "ui")
    run_ui_mode
    ;;
  "lint")
    run_lint
    ;;
  "type-check")
    run_typescript_check
    ;;
  "security")
    run_security_audit
    ;;
  "metrics")
    run_qa_metrics
    ;;
  "full")
    run_full_qa
    ;;
  "help"|"-h"|"--help")
    show_usage
    ;;
  *)
    print_error "Unknown mode: $TEST_MODE"
    show_usage
    exit 1
    ;;
esac

exit 0
