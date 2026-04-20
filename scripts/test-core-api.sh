#!/bin/bash

# Core API Testing Script
# Comprehensive test suite for multi-branch system endpoints
# Usage: bash scripts/test-core-api.sh [email] [password] [base_url]

set -e

# Configuration
EMAIL="${1:-admin@school.com}"
PASSWORD="${2:-SecurePassword123}"
BASE_URL="${3:-http://localhost:3000}"
API_URL="$BASE_URL/api/core"
AUTH_URL="$BASE_URL/api/auth"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

# Helper functions
print_header() {
  echo -e "\n${BLUE}==== $1 ====${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
  ((PASSED++))
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
  ((FAILED++))
}

print_info() {
  echo -e "${YELLOW}ℹ $1${NC}"
}

test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local expected_code=$4
  local description=$5

  print_info "Testing: $description"

  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" \
      -X "$method" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      "$API_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" \
      -X "$method" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$API_URL$endpoint")
  fi

  http_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | head -n -1)

  if [ "$http_code" = "$expected_code" ]; then
    print_success "$description ($http_code)"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    print_error "$description (Expected: $expected_code, Got: $http_code)"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  fi

  echo "$body"
}

# Step 1: Authenticate
print_header "Step 1: Authentication"
print_info "Logging in as: $EMAIL"

auth_response=$(curl -s -X POST "$AUTH_URL/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$auth_response" | jq -r '.token' 2>/dev/null)
USER_ID=$(echo "$auth_response" | jq -r '.user.id' 2>/dev/null)
SCHOOL_ID=$(echo "$auth_response" | jq -r '.user.schoolId' 2>/dev/null)
ROLE=$(echo "$auth_response" | jq -r '.user.role' 2>/dev/null)

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  print_success "Authentication successful"
  print_info "User: $EMAIL (Role: $ROLE, School: $SCHOOL_ID)"
else
  print_error "Authentication failed"
  echo "Response: $auth_response" | jq '.'
  exit 1
fi

# Step 2: List Students
print_header "Step 2: Student Management - List"
test_endpoint "GET" "/students?page=1&limit=5" "" "200" "List students"

# Step 3: Get first student ID from list
print_header "Step 3: Get Student Details"
students_response=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "$API_URL/students?limit=1")
STUDENT_ID=$(echo "$students_response" | jq -r '.students[0].id' 2>/dev/null)

if [ "$STUDENT_ID" != "null" ] && [ -n "$STUDENT_ID" ]; then
  test_endpoint "GET" "/students/$STUDENT_ID" "" "200" "Get student details"
else
  print_info "No existing students, skipping student details test"
fi

# Step 4: List Attendance
print_header "Step 4: Attendance Management - List"
test_endpoint "GET" "/attendance?page=1&limit=10" "" "200" "List attendance records"

# Step 5: List Accounts
print_header "Step 5: Financial Management - Accounts"
test_endpoint "GET" "/accounts?page=1&limit=5" "" "200" "List accounts"

accounts_response=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "$API_URL/accounts?limit=1")
ACCOUNT_ID=$(echo "$accounts_response" | jq -r '.accounts[0].id' 2>/dev/null)

# Step 6: List Transactions
print_header "Step 6: Financial Management - Transactions"
if [ "$ACCOUNT_ID" != "null" ] && [ -n "$ACCOUNT_ID" ]; then
  test_endpoint "GET" "/transactions?accountId=$ACCOUNT_ID&limit=10" "" "200" "List transactions for account"
else
  test_endpoint "GET" "/transactions?page=1&limit=10" "" "200" "List transactions"
fi

# Step 7: List Employees
print_header "Step 7: HR Management - Employees"
test_endpoint "GET" "/employees?page=1&limit=5" "" "200" "List employees"

employees_response=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "$API_URL/employees?limit=1")
EMPLOYEE_ID=$(echo "$employees_response" | jq -r '.employees[0].id' 2>/dev/null)

# Step 8: List Salaries
print_header "Step 8: HR Management - Salaries"
if [ "$EMPLOYEE_ID" != "null" ] && [ -n "$EMPLOYEE_ID" ]; then
  test_endpoint "GET" "/salaries?employeeId=$EMPLOYEE_ID&limit=5" "" "200" "List salaries for employee"
else
  test_endpoint "GET" "/salaries?page=1&limit=5" "" "200" "List salaries"
fi

# Step 9: Test Error Handling
print_header "Step 9: Error Handling Tests"
print_info "Testing validation errors"

# Invalid class ID format
test_endpoint "POST" "/students" \
  '{"nameAr":"اسم","nameEn":"name","classId":"invalid","registrationNumber":"TEST","dateOfBirth":"2010-01-01"}' \
  "400" "Invalid class ID format"

# Missing required field
test_endpoint "POST" "/students" \
  '{"nameAr":"اسم","classId":"valid-uuid","registrationNumber":"TEST"}' \
  "400" "Missing required dateOfBirth field"

# Test unauthorized access
print_header "Step 10: Security Tests"
print_info "Testing without authentication"

response=$(curl -s -w "\n%{http_code}" \
  -X GET \
  -H "Content-Type: application/json" \
  "$API_URL/students")
http_code=$(echo "$response" | tail -n 1)

if [ "$http_code" = "401" ]; then
  print_success "Unauthorized request properly rejected (401)"
else
  print_error "Unauthorized request should return 401, got $http_code"
fi

# Step 11: Test with invalid token
print_header "Step 11: Invalid Token Test"
response=$(curl -s -w "\n%{http_code}" \
  -X GET \
  -H "Authorization: Bearer invalid_token_12345" \
  -H "Content-Type: application/json" \
  "$API_URL/students")
http_code=$(echo "$response" | tail -n 1)

if [ "$http_code" = "401" ]; then
  print_success "Invalid token properly rejected (401)"
else
  print_error "Invalid token should return 401, got $http_code"
fi

# Summary
print_header "Test Summary"
TOTAL=$((PASSED + FAILED))
PASS_RATE=$((PASSED * 100 / TOTAL))

echo -e "${BLUE}Total Tests: $TOTAL${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${BLUE}Pass Rate: $PASS_RATE%${NC}\n"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed! ✓${NC}\n"
  exit 0
else
  echo -e "${RED}Some tests failed. Check the output above.${NC}\n"
  exit 1
fi
