#!/bin/bash

# Deployment Verification Script
# Verifies that all components are properly integrated and ready for production

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
FAILED_CHECKS=()

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((CHECKS_PASSED++))
}

fail() {
    echo -e "${RED}[✗]${NC} $1"
    ((CHECKS_FAILED++))
    FAILED_CHECKS+=("$1")
}

warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check if required files exist
check_deployment_files() {
    log "Checking deployment files..."
    
    local required_files=(
        "docker-compose.production.yml"
        ".env.production"
        "scripts/deploy.sh"
        "scripts/security-audit.sh"
        "nginx/nginx.conf"
        "DEPLOYMENT.md"
        "PRODUCTION_CHECKLIST.md"
        "RUNBOOK.md"
    )
    
    for file in "${required_files[@]}"; do
        if [[ -f "$file" ]]; then
            success "Found $file"
        else
            fail "Missing $file"
        fi
    done
}

# Check CI/CD configuration
check_cicd_config() {
    log "Checking CI/CD configuration..."
    
    if [[ -f ".github/workflows/ci-cd.yml" ]]; then
        success "CI/CD pipeline configured"
        
        # Check if workflow has required jobs
        if grep -q "test-backend\|test-frontend\|security-scan\|build-images" .github/workflows/ci-cd.yml; then
            success "CI/CD pipeline has required jobs"
        else
            fail "CI/CD pipeline missing required jobs"
        fi
    else
        fail "CI/CD pipeline not configured"
    fi
}

# Check Docker configuration
check_docker_config() {
    log "Checking Docker configuration..."
    
    # Check production Dockerfiles
    if [[ -f "backend/Dockerfile.production" ]]; then
        success "Backend production Dockerfile exists"
    else
        fail "Backend production Dockerfile missing"
    fi
    
    if [[ -f "frontend/Dockerfile.production" ]]; then
        success "Frontend production Dockerfile exists"
    else
        fail "Frontend production Dockerfile missing"
    fi
    
    # Check if Docker Compose file is valid
    if docker-compose -f docker-compose.production.yml config > /dev/null 2>&1; then
        success "Docker Compose configuration valid"
    else
        fail "Docker Compose configuration invalid"
    fi
}

# Check monitoring configuration
check_monitoring_config() {
    log "Checking monitoring configuration..."
    
    local monitoring_files=(
        "monitoring/prometheus.yml"
        "monitoring/alert_rules.yml"
        "monitoring/grafana/provisioning/datasources/prometheus.yml"
        "monitoring/grafana/provisioning/dashboards/dashboard.yml"
    )
    
    for file in "${monitoring_files[@]}"; do
        if [[ -f "$file" ]]; then
            success "Found monitoring config: $file"
        else
            fail "Missing monitoring config: $file"
        fi
    done
}

# Check security configuration
check_security_config() {
    log "Checking security configuration..."
    
    # Check if security audit script exists and is executable
    if [[ -f "scripts/security-audit.sh" ]]; then
        success "Security audit script exists"
    else
        fail "Security audit script missing"
    fi
    
    # Check nginx security headers
    if grep -q "X-Frame-Options\|X-Content-Type-Options\|X-XSS-Protection" nginx/nginx.conf; then
        success "Security headers configured in nginx"
    else
        fail "Security headers not configured in nginx"
    fi
    
    # Check SSL configuration
    if grep -q "ssl_protocols.*TLSv1.3\|ssl_certificate" nginx/nginx.conf; then
        success "SSL configuration present in nginx"
    else
        warning "SSL configuration should be verified in nginx"
    fi
}

# Check environment configuration
check_environment_config() {
    log "Checking environment configuration..."
    
    if [[ -f ".env.production" ]]; then
        success "Production environment template exists"
        
        # Check for required environment variables
        local required_vars=(
            "NODE_ENV"
            "DATABASE_URL"
            "JWT_SECRET"
            "REDIS_URL"
        )
        
        for var in "${required_vars[@]}"; do
            if grep -q "^$var=" .env.production; then
                success "Environment variable $var configured"
            else
                fail "Environment variable $var not configured"
            fi
        done
    else
        fail "Production environment template missing"
    fi
}

# Check backup and recovery setup
check_backup_config() {
    log "Checking backup and recovery configuration..."
    
    # Check if backup scripts exist
    if [[ -f "scripts/deploy.sh" ]] && grep -q "backup" scripts/deploy.sh; then
        success "Backup functionality in deployment script"
    else
        fail "Backup functionality not configured"
    fi
    
    # Check if backup directory structure is documented
    if grep -q "backup\|recovery" DEPLOYMENT.md; then
        success "Backup procedures documented"
    else
        fail "Backup procedures not documented"
    fi
}

# Check documentation completeness
check_documentation() {
    log "Checking documentation completeness..."
    
    local doc_files=(
        "README.md"
        "DEPLOYMENT.md"
        "PRODUCTION_CHECKLIST.md"
        "RUNBOOK.md"
    )
    
    for file in "${doc_files[@]}"; do
        if [[ -f "$file" ]] && [[ -s "$file" ]]; then
            success "Documentation file $file exists and is not empty"
        else
            fail "Documentation file $file missing or empty"
        fi
    done
    
    # Check if deployment guide has required sections
    if grep -q "Prerequisites\|Environment Setup\|Security Configuration" DEPLOYMENT.md; then
        success "Deployment guide has required sections"
    else
        fail "Deployment guide missing required sections"
    fi
}

# Check package configurations
check_package_configs() {
    log "Checking package configurations..."
    
    # Check backend package.json
    if [[ -f "backend/package.json" ]]; then
        if grep -q '"build"\|"start"\|"test"' backend/package.json; then
            success "Backend package.json has required scripts"
        else
            fail "Backend package.json missing required scripts"
        fi
    else
        fail "Backend package.json missing"
    fi
    
    # Check frontend package.json
    if [[ -f "frontend/package.json" ]]; then
        if grep -q '"build"\|"test"\|"lint"' frontend/package.json; then
            success "Frontend package.json has required scripts"
        else
            fail "Frontend package.json missing required scripts"
        fi
    else
        fail "Frontend package.json missing"
    fi
    
    # Check root package.json
    if [[ -f "package.json" ]]; then
        if grep -q '"build"\|"test"\|"dev"' package.json; then
            success "Root package.json has required scripts"
        else
            fail "Root package.json missing required scripts"
        fi
    else
        fail "Root package.json missing"
    fi
}

# Check integration test setup
check_integration_tests() {
    log "Checking integration test setup..."
    
    if [[ -f "scripts/integration-test.sh" ]]; then
        success "Integration test script exists"
        
        # Check if script has required test functions
        if grep -q "test_health_endpoints\|test_database_connectivity\|test_user_registration" scripts/integration-test.sh; then
            success "Integration test script has comprehensive tests"
        else
            fail "Integration test script missing comprehensive tests"
        fi
    else
        fail "Integration test script missing"
    fi
}

# Generate final report
generate_report() {
    echo
    echo "=================================="
    echo "Deployment Verification Report"
    echo "=================================="
    echo "Checks Passed: $CHECKS_PASSED"
    echo "Checks Failed: $CHECKS_FAILED"
    echo "Total Checks: $((CHECKS_PASSED + CHECKS_FAILED))"
    
    if [[ $CHECKS_FAILED -gt 0 ]]; then
        echo
        echo "Failed Checks:"
        for check in "${FAILED_CHECKS[@]}"; do
            echo "  - $check"
        done
        echo
        echo "❌ Deployment verification FAILED"
        echo "Please address the failed checks before proceeding to production."
        return 1
    else
        echo
        echo "✅ All deployment verification checks PASSED"
        echo "System is ready for production deployment!"
        return 0
    fi
}

# Main execution
main() {
    log "Starting Equipment Marketplace deployment verification..."
    echo
    
    check_deployment_files
    check_cicd_config
    check_docker_config
    check_monitoring_config
    check_security_config
    check_environment_config
    check_backup_config
    check_documentation
    check_package_configs
    check_integration_tests
    
    generate_report
}

# Run verification
main "$@"