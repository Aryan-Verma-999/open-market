#!/bin/bash

# Equipment Marketplace Deployment Script
# This script handles production deployment with health checks and rollback capability

set -e  # Exit on any error

# Configuration
COMPOSE_FILE="docker-compose.production.yml"
BACKUP_DIR="./backups"
LOG_FILE="./logs/deployment.log"
HEALTH_CHECK_TIMEOUT=60
ROLLBACK_ENABLED=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Create necessary directories
mkdir -p logs backups

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running"
        exit 1
    fi
    
    # Check if required files exist
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        error "Docker compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    if [[ ! -f ".env" ]]; then
        error "Environment file not found. Copy .env.production to .env and configure it."
        exit 1
    fi
    
    # Check disk space (require at least 2GB free)
    available_space=$(df / | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 2097152 ]]; then
        error "Insufficient disk space. At least 2GB required."
        exit 1
    fi
    
    success "Pre-deployment checks passed"
}

# Backup current deployment
backup_current_deployment() {
    log "Creating backup of current deployment..."
    
    timestamp=$(date +%Y%m%d_%H%M%S)
    backup_path="$BACKUP_DIR/backup_$timestamp"
    
    mkdir -p "$backup_path"
    
    # Backup database
    if docker-compose -f "$COMPOSE_FILE" ps postgres | grep -q "Up"; then
        log "Backing up database..."
        docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$backup_path/database.sql"
        success "Database backup created"
    fi
    
    # Backup uploaded files (if using local storage)
    if [[ -d "./uploads" ]]; then
        log "Backing up uploaded files..."
        cp -r ./uploads "$backup_path/"
        success "Files backup created"
    fi
    
    # Store current image tags for rollback
    docker-compose -f "$COMPOSE_FILE" config > "$backup_path/docker-compose.yml"
    
    echo "$backup_path" > ./last_backup_path
    success "Backup created at $backup_path"
}

# Health check function
health_check() {
    local service_url=$1
    local timeout=$2
    local interval=5
    local elapsed=0
    
    log "Performing health check for $service_url..."
    
    while [[ $elapsed -lt $timeout ]]; do
        if curl -f -s "$service_url" > /dev/null; then
            success "Health check passed for $service_url"
            return 0
        fi
        
        sleep $interval
        elapsed=$((elapsed + interval))
        log "Health check attempt $((elapsed / interval))..."
    done
    
    error "Health check failed for $service_url after ${timeout}s"
    return 1
}

# Deploy new version
deploy() {
    log "Starting deployment..."
    
    # Pull latest images
    log "Pulling latest Docker images..."
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Start services with zero-downtime deployment
    log "Starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d --remove-orphans
    
    # Wait for services to be ready
    log "Waiting for services to start..."
    sleep 10
    
    # Run database migrations
    log "Running database migrations..."
    docker-compose -f "$COMPOSE_FILE" exec -T backend npx prisma migrate deploy
    
    # Health checks
    if ! health_check "http://localhost/health" $HEALTH_CHECK_TIMEOUT; then
        error "Frontend health check failed"
        return 1
    fi
    
    if ! health_check "http://localhost/api/health" $HEALTH_CHECK_TIMEOUT; then
        error "Backend health check failed"
        return 1
    fi
    
    success "Deployment completed successfully"
    return 0
}

# Rollback function
rollback() {
    if [[ "$ROLLBACK_ENABLED" != "true" ]]; then
        error "Rollback is disabled"
        return 1
    fi
    
    if [[ ! -f "./last_backup_path" ]]; then
        error "No backup path found for rollback"
        return 1
    fi
    
    backup_path=$(cat ./last_backup_path)
    
    if [[ ! -d "$backup_path" ]]; then
        error "Backup directory not found: $backup_path"
        return 1
    fi
    
    warning "Rolling back to previous version..."
    
    # Restore previous docker-compose configuration
    cp "$backup_path/docker-compose.yml" "$COMPOSE_FILE"
    
    # Restart services with previous configuration
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Restore database if needed
    if [[ -f "$backup_path/database.sql" ]]; then
        warning "Database rollback requires manual intervention"
        log "Database backup available at: $backup_path/database.sql"
    fi
    
    success "Rollback completed"
}

# Cleanup old backups (keep last 5)
cleanup_backups() {
    log "Cleaning up old backups..."
    
    if [[ -d "$BACKUP_DIR" ]]; then
        # Keep only the 5 most recent backups
        ls -t "$BACKUP_DIR" | tail -n +6 | xargs -I {} rm -rf "$BACKUP_DIR/{}"
        success "Old backups cleaned up"
    fi
}

# Main deployment process
main() {
    log "Starting Equipment Marketplace deployment"
    
    case "${1:-deploy}" in
        "deploy")
            pre_deployment_checks
            backup_current_deployment
            
            if deploy; then
                cleanup_backups
                success "Deployment completed successfully!"
                log "Application is available at: https://$(grep DOMAIN .env | cut -d'=' -f2)"
            else
                error "Deployment failed!"
                
                if [[ "$ROLLBACK_ENABLED" == "true" ]]; then
                    warning "Initiating automatic rollback..."
                    rollback
                else
                    error "Rollback is disabled. Manual intervention required."
                fi
                exit 1
            fi
            ;;
        "rollback")
            rollback
            ;;
        "health-check")
            health_check "http://localhost/health" 30
            health_check "http://localhost/api/health" 30
            ;;
        "backup")
            backup_current_deployment
            ;;
        *)
            echo "Usage: $0 {deploy|rollback|health-check|backup}"
            echo "  deploy      - Deploy the application (default)"
            echo "  rollback    - Rollback to previous version"
            echo "  health-check - Check application health"
            echo "  backup      - Create backup only"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"