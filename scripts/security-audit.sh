#!/bin/bash

# Security Audit Script for Equipment Marketplace
# This script performs various security checks and generates a report

set -e

# Configuration
REPORT_FILE="./security-audit-report-$(date +%Y%m%d_%H%M%S).txt"
TEMP_DIR="/tmp/security-audit-$$"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create temp directory
mkdir -p "$TEMP_DIR"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$REPORT_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$REPORT_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$REPORT_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$REPORT_FILE"
}

# Initialize report
init_report() {
    cat > "$REPORT_FILE" << EOF
Equipment Marketplace Security Audit Report
==========================================
Date: $(date)
Host: $(hostname)
User: $(whoami)

EOF
}

# Check for sensitive files
check_sensitive_files() {
    log "Checking for sensitive files..."
    
    sensitive_patterns=(
        "*.key"
        "*.pem"
        "*.p12"
        "*.pfx"
        ".env"
        "id_rsa"
        "id_dsa"
        "*.sql"
    )
    
    for pattern in "${sensitive_patterns[@]}"; do
        files=$(find . -name "$pattern" -type f 2>/dev/null | grep -v node_modules | head -10)
        if [[ -n "$files" ]]; then
            warning "Found sensitive files matching $pattern:"
            echo "$files" | tee -a "$REPORT_FILE"
        fi
    done
}

# Check file permissions
check_file_permissions() {
    log "Checking file permissions..."
    
    # Check for world-writable files
    world_writable=$(find . -type f -perm -002 2>/dev/null | grep -v node_modules | head -10)
    if [[ -n "$world_writable" ]]; then
        warning "Found world-writable files:"
        echo "$world_writable" | tee -a "$REPORT_FILE"
    fi
    
    # Check for SUID/SGID files
    suid_files=$(find . -type f \( -perm -4000 -o -perm -2000 \) 2>/dev/null | head -10)
    if [[ -n "$suid_files" ]]; then
        warning "Found SUID/SGID files:"
        echo "$suid_files" | tee -a "$REPORT_FILE"
    fi
}

# Check environment configuration
check_environment_config() {
    log "Checking environment configuration..."
    
    if [[ -f ".env" ]]; then
        # Check for default/weak passwords
        if grep -q "password.*123\|password.*admin\|password.*test" .env; then
            error "Weak passwords detected in .env file"
        fi
        
        # Check for missing JWT secret
        if ! grep -q "JWT_SECRET" .env; then
            error "JWT_SECRET not found in .env file"
        fi
        
        # Check JWT secret strength
        jwt_secret=$(grep "JWT_SECRET" .env | cut -d'=' -f2)
        if [[ ${#jwt_secret} -lt 32 ]]; then
            warning "JWT_SECRET should be at least 32 characters long"
        fi
        
        success "Environment configuration checked"
    else
        warning ".env file not found"
    fi
}

# Check Docker security
check_docker_security() {
    log "Checking Docker security configuration..."
    
    if command -v docker &> /dev/null; then
        # Check for running containers as root
        root_containers=$(docker ps --format "table {{.Names}}\t{{.Image}}" | grep -v "NAMES" | while read name image; do
            user=$(docker exec "$name" whoami 2>/dev/null || echo "unknown")
            if [[ "$user" == "root" ]]; then
                echo "$name ($image)"
            fi
        done)
        
        if [[ -n "$root_containers" ]]; then
            warning "Containers running as root:"
            echo "$root_containers" | tee -a "$REPORT_FILE"
        fi
        
        # Check for privileged containers
        privileged_containers=$(docker ps --filter "label=privileged=true" --format "{{.Names}}")
        if [[ -n "$privileged_containers" ]]; then
            warning "Privileged containers found:"
            echo "$privileged_containers" | tee -a "$REPORT_FILE"
        fi
        
        success "Docker security checked"
    else
        warning "Docker not available for security check"
    fi
}

# Check npm packages for vulnerabilities
check_npm_vulnerabilities() {
    log "Checking npm packages for vulnerabilities..."
    
    # Backend audit
    if [[ -f "backend/package.json" ]]; then
        cd backend
        npm audit --audit-level moderate > "$TEMP_DIR/backend-audit.txt" 2>&1 || true
        if grep -q "vulnerabilities" "$TEMP_DIR/backend-audit.txt"; then
            warning "Backend npm vulnerabilities found:"
            cat "$TEMP_DIR/backend-audit.txt" | tee -a "$REPORT_FILE"
        fi
        cd ..
    fi
    
    # Frontend audit
    if [[ -f "frontend/package.json" ]]; then
        cd frontend
        npm audit --audit-level moderate > "$TEMP_DIR/frontend-audit.txt" 2>&1 || true
        if grep -q "vulnerabilities" "$TEMP_DIR/frontend-audit.txt"; then
            warning "Frontend npm vulnerabilities found:"
            cat "$TEMP_DIR/frontend-audit.txt" | tee -a "$REPORT_FILE"
        fi
        cd ..
    fi
}

# Check SSL/TLS configuration
check_ssl_config() {
    log "Checking SSL/TLS configuration..."
    
    if [[ -f "nginx/nginx.conf" ]]; then
        # Check for strong SSL protocols
        if grep -q "ssl_protocols.*TLSv1.3" nginx/nginx.conf; then
            success "TLS 1.3 enabled"
        else
            warning "TLS 1.3 not enabled"
        fi
        
        # Check for HSTS
        if grep -q "Strict-Transport-Security" nginx/nginx.conf; then
            success "HSTS header configured"
        else
            warning "HSTS header not configured"
        fi
        
        # Check for security headers
        security_headers=("X-Frame-Options" "X-Content-Type-Options" "X-XSS-Protection")
        for header in "${security_headers[@]}"; do
            if grep -q "$header" nginx/nginx.conf; then
                success "$header configured"
            else
                warning "$header not configured"
            fi
        done
    fi
}

# Check database security
check_database_security() {
    log "Checking database security..."
    
    if [[ -f "docker-compose.production.yml" ]]; then
        # Check for default database passwords
        if grep -q "POSTGRES_PASSWORD.*password\|POSTGRES_PASSWORD.*123" docker-compose.production.yml; then
            error "Default database password detected"
        fi
        
        # Check for database exposure
        if grep -q "ports:.*5432" docker-compose.production.yml; then
            warning "Database port exposed externally"
        fi
        
        success "Database security configuration checked"
    fi
}

# Generate security recommendations
generate_recommendations() {
    log "Generating security recommendations..."
    
    cat >> "$REPORT_FILE" << EOF

Security Recommendations:
========================

1. Regularly update all dependencies and base images
2. Use strong, unique passwords for all services
3. Enable two-factor authentication where possible
4. Implement proper logging and monitoring
5. Regular security audits and penetration testing
6. Use secrets management for sensitive data
7. Implement proper backup and disaster recovery
8. Regular security training for development team
9. Use static code analysis tools
10. Implement proper input validation and sanitization

Next Steps:
===========
1. Review and address all warnings and errors above
2. Implement automated security scanning in CI/CD
3. Set up security monitoring and alerting
4. Create incident response procedures
5. Regular security assessments

EOF
}

# Main function
main() {
    log "Starting security audit..."
    
    init_report
    check_sensitive_files
    check_file_permissions
    check_environment_config
    check_docker_security
    check_npm_vulnerabilities
    check_ssl_config
    check_database_security
    generate_recommendations
    
    success "Security audit completed. Report saved to: $REPORT_FILE"
    
    # Cleanup
    rm -rf "$TEMP_DIR"
}

# Run main function
main "$@"