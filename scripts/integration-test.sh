#!/bin/bash

# Integration Test Script for Equipment Marketplace
# Tests complete system functionality after deployment

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost}"
API_URL="${API_URL:-http://localhost/api}"
TEST_EMAIL="test@example.com"
TEST_PASSWORD="TestPassword123!"
TIMEOUT=30

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
    FAILED_TESTS+=("$1")
}

warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# HTTP request helper
make_request() {
    local method=$1
    local url=$2
    local data=$3
    local headers=$4
    
    if [[ -n "$data" ]]; then
        curl -s -X "$method" "$url" \
             -H "Content-Type: application/json" \
             ${headers:+-H "$headers"} \
             -d "$data" \
             --max-time $TIMEOUT
    else
        curl -s -X "$method" "$url" \
             ${headers:+-H "$headers"} \
             --max-time $TIMEOUT
    fi
}

# Test health endpoints
test_health_endpoints() {
    log "Testing health endpoints..."
    
    # Frontend health
    if curl -f -s "$BASE_URL/health" > /dev/null; then
        success "Frontend health endpoint responding"
    else
        fail "Frontend health endpoint not responding"
    fi
    
    # Backend health
    local health_response=$(make_request GET "$API_URL/health")
    if echo "$health_response" | grep -q "healthy\|ok"; then
        success "Backend health endpoint responding"
    else
        fail "Backend health endpoint not responding"
    fi
}

# Test database connectivity
test_database_connectivity() {
    log "Testing database connectivity..."
    
    # Test through API endpoint that requires database
    local response=$(make_request GET "$API_URL/categories" 2>/dev/null || echo "error")
    
    if [[ "$response" != "error" ]] && [[ "$response" != *"error"* ]]; then
        success "Database connectivity working"
    else
        fail "Database connectivity issues"
    fi
}

# Test Redis connectivity
test_redis_connectivity() {
    log "Testing Redis connectivity..."
    
    # Test caching by making the same request twice
    local start_time=$(date +%s%N)
    make_request GET "$API_URL/categories" > /dev/null 2>&1
    local first_request_time=$(($(date +%s%N) - start_time))
    
    local start_time=$(date +%s%N)
    make_request GET "$API_URL/categories" > /dev/null 2>&1
    local second_request_time=$(($(date +%s%N) - start_time))
    
    # Second request should be faster (cached)
    if [[ $second_request_time -lt $first_request_time ]]; then
        success "Redis caching working"
    else
        warning "Redis caching may not be working optimally"
    fi
}

# Test user registration
test_user_registration() {
    log "Testing user registration..."
    
    local user_data='{
        "email": "'$TEST_EMAIL'",
        "password": "'$TEST_PASSWORD'",
        "firstName": "Test",
        "lastName": "User",
        "phone": "+1234567890"
    }'
    
    local response=$(make_request POST "$API_URL/auth/register" "$user_data" 2>/dev/null || echo "error")
    
    if echo "$response" | grep -q "token\|success\|user"; then
        success "User registration working"
        # Extract token for further tests
        USER_TOKEN=$(echo "$response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    else
        fail "User registration not working"
    fi
}

# Test user login
test_user_login() {
    log "Testing user login..."
    
    local login_data='{
        "email": "'$TEST_EMAIL'",
        "password": "'$TEST_PASSWORD'"
    }'
    
    local response=$(make_request POST "$API_URL/auth/login" "$login_data" 2>/dev/null || echo "error")
    
    if echo "$response" | grep -q "token\|success"; then
        success "User login working"
        # Update token
        USER_TOKEN=$(echo "$response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    else
        fail "User login not working"
    fi
}

# Test listing creation
test_listing_creation() {
    log "Testing listing creation..."
    
    if [[ -z "$USER_TOKEN" ]]; then
        fail "Cannot test listing creation - no user token"
        return
    fi
    
    local listing_data='{
        "title": "Test Equipment",
        "description": "Test equipment for integration testing",
        "category": "construction",
        "brand": "TestBrand",
        "model": "TestModel",
        "condition": "good",
        "price": 10000,
        "location": {
            "city": "Test City",
            "state": "Test State",
            "zipCode": "12345"
        }
    }'
    
    local response=$(make_request POST "$API_URL/listings" "$listing_data" "Authorization: Bearer $USER_TOKEN" 2>/dev/null || echo "error")
    
    if echo "$response" | grep -q "id\|listing\|success"; then
        success "Listing creation working"
        # Extract listing ID for further tests
        LISTING_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    else
        fail "Listing creation not working"
    fi
}

# Test search functionality
test_search_functionality() {
    log "Testing search functionality..."
    
    # Test basic search
    local response=$(make_request GET "$API_URL/search?q=equipment" 2>/dev/null || echo "error")
    
    if echo "$response" | grep -q "results\|listings"; then
        success "Search functionality working"
    else
        fail "Search functionality not working"
    fi
    
    # Test category filter
    local response=$(make_request GET "$API_URL/search?category=construction" 2>/dev/null || echo "error")
    
    if echo "$response" | grep -q "results\|listings"; then
        success "Category filtering working"
    else
        fail "Category filtering not working"
    fi
}

# Test file upload
test_file_upload() {
    log "Testing file upload..."
    
    if [[ -z "$USER_TOKEN" ]]; then
        fail "Cannot test file upload - no user token"
        return
    fi
    
    # Create a test image file
    local test_file="/tmp/test_image.jpg"
    echo "fake image data" > "$test_file"
    
    local response=$(curl -s -X POST "$API_URL/upload/image" \
                          -H "Authorization: Bearer $USER_TOKEN" \
                          -F "image=@$test_file" \
                          --max-time $TIMEOUT 2>/dev/null || echo "error")
    
    if echo "$response" | grep -q "url\|path\|success"; then
        success "File upload working"
    else
        fail "File upload not working"
    fi
    
    # Cleanup
    rm -f "$test_file"
}

# Test messaging system
test_messaging_system() {
    log "Testing messaging system..."
    
    if [[ -z "$USER_TOKEN" ]] || [[ -z "$LISTING_ID" ]]; then
        fail "Cannot test messaging - missing user token or listing ID"
        return
    fi
    
    local message_data='{
        "listingId": "'$LISTING_ID'",
        "message": "Test message for integration testing"
    }'
    
    local response=$(make_request POST "$API_URL/messages" "$message_data" "Authorization: Bearer $USER_TOKEN" 2>/dev/null || echo "error")
    
    if echo "$response" | grep -q "id\|message\|success"; then
        success "Messaging system working"
    else
        fail "Messaging system not working"
    fi
}

# Test WebSocket connectivity
test_websocket_connectivity() {
    log "Testing WebSocket connectivity..."
    
    # Simple WebSocket connection test
    if command -v wscat &> /dev/null; then
        timeout 5 wscat -c "ws://localhost/socket.io/?EIO=4&transport=websocket" > /dev/null 2>&1
        if [[ $? -eq 0 ]]; then
            success "WebSocket connectivity working"
        else
            fail "WebSocket connectivity not working"
        fi
    else
        warning "wscat not available - skipping WebSocket test"
    fi
}

# Test rate limiting
test_rate_limiting() {
    log "Testing rate limiting..."
    
    local success_count=0
    local rate_limited=false
    
    # Make multiple rapid requests
    for i in {1..15}; do
        local response=$(make_request GET "$API_URL/categories" 2>/dev/null || echo "error")
        local status=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/categories" 2>/dev/null || echo "000")
        
        if [[ "$status" == "429" ]]; then
            rate_limited=true
            break
        elif [[ "$status" == "200" ]]; then
            ((success_count++))
        fi
        
        sleep 0.1
    done
    
    if [[ "$rate_limited" == true ]]; then
        success "Rate limiting working"
    else
        warning "Rate limiting may not be configured properly"
    fi
}

# Test security headers
test_security_headers() {
    log "Testing security headers..."
    
    local headers=$(curl -s -I "$BASE_URL" 2>/dev/null || echo "")
    
    local required_headers=(
        "X-Frame-Options"
        "X-Content-Type-Options"
        "X-XSS-Protection"
    )
    
    local headers_found=0
    for header in "${required_headers[@]}"; do
        if echo "$headers" | grep -qi "$header"; then
            ((headers_found++))
        fi
    done
    
    if [[ $headers_found -eq ${#required_headers[@]} ]]; then
        success "Security headers configured"
    else
        fail "Missing security headers ($headers_found/${#required_headers[@]} found)"
    fi
}

# Test SSL/HTTPS (if applicable)
test_ssl_configuration() {
    log "Testing SSL configuration..."
    
    if [[ "$BASE_URL" == https* ]]; then
        local ssl_info=$(curl -s -I "$BASE_URL" 2>/dev/null | grep -i "strict-transport-security" || echo "")
        
        if [[ -n "$ssl_info" ]]; then
            success "HSTS header present"
        else
            warning "HSTS header not found"
        fi
        
        # Test SSL certificate
        if openssl s_client -connect "${BASE_URL#https://}:443" -servername "${BASE_URL#https://}" < /dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
            success "SSL certificate valid"
        else
            fail "SSL certificate issues"
        fi
    else
        warning "HTTPS not configured - skipping SSL tests"
    fi
}

# Performance test
test_performance() {
    log "Testing performance..."
    
    local start_time=$(date +%s%N)
    make_request GET "$API_URL/categories" > /dev/null 2>&1
    local response_time=$((($(date +%s%N) - start_time) / 1000000))
    
    if [[ $response_time -lt 1000 ]]; then  # Less than 1 second
        success "API response time acceptable (${response_time}ms)"
    else
        warning "API response time slow (${response_time}ms)"
    fi
}

# Cleanup test data
cleanup_test_data() {
    log "Cleaning up test data..."
    
    # Delete test listing if created
    if [[ -n "$LISTING_ID" ]] && [[ -n "$USER_TOKEN" ]]; then
        make_request DELETE "$API_URL/listings/$LISTING_ID" "" "Authorization: Bearer $USER_TOKEN" > /dev/null 2>&1
    fi
    
    # Note: In a real scenario, you might want to delete the test user as well
    # but be careful not to delete production data
}

# Generate test report
generate_report() {
    echo
    echo "=================================="
    echo "Integration Test Results"
    echo "=================================="
    echo "Tests Passed: $TESTS_PASSED"
    echo "Tests Failed: $TESTS_FAILED"
    echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
    
    if [[ $TESTS_FAILED -gt 0 ]]; then
        echo
        echo "Failed Tests:"
        for test in "${FAILED_TESTS[@]}"; do
            echo "  - $test"
        done
        echo
        echo "❌ Integration tests FAILED"
        return 1
    else
        echo
        echo "✅ All integration tests PASSED"
        return 0
    fi
}

# Main test execution
main() {
    log "Starting Equipment Marketplace Integration Tests"
    log "Base URL: $BASE_URL"
    log "API URL: $API_URL"
    echo
    
    # Core functionality tests
    test_health_endpoints
    test_database_connectivity
    test_redis_connectivity
    
    # Authentication tests
    test_user_registration
    test_user_login
    
    # Application functionality tests
    test_listing_creation
    test_search_functionality
    test_file_upload
    test_messaging_system
    
    # Infrastructure tests
    test_websocket_connectivity
    test_rate_limiting
    test_security_headers
    test_ssl_configuration
    test_performance
    
    # Cleanup
    cleanup_test_data
    
    # Generate report
    generate_report
}

# Run tests
main "$@"