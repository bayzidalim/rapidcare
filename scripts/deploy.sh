#!/bin/bash

# RapidCare Production Deployment Script
# This script handles the complete deployment process for production environments

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="${PROJECT_ROOT}/logs/deploy.log"
DATE=$(date +%Y%m%d_%H%M%S)

# Default values
ENVIRONMENT="production"
SKIP_BACKUP=false
SKIP_TESTS=false
SKIP_BUILD=false
DRY_RUN=false
FORCE=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
    
    case $level in
        "ERROR")
            echo -e "${RED}${timestamp} [${level}] ${message}${NC}" >&2
            ;;
        "WARN")
            echo -e "${YELLOW}${timestamp} [${level}] ${message}${NC}"
            ;;
        "INFO")
            echo -e "${GREEN}${timestamp} [${level}] ${message}${NC}"
            ;;
        "DEBUG")
            echo -e "${BLUE}${timestamp} [${level}] ${message}${NC}"
            ;;
    esac
}

# Create necessary directories
create_directories() {
    log "INFO" "Creating necessary directories..."
    mkdir -p "$(dirname "$LOG_FILE")"
    mkdir -p "${PROJECT_ROOT}/backups"
}

# Check prerequisites
check_prerequisites() {
    log "INFO" "Checking deployment prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log "ERROR" "Node.js is not installed"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2)
    local required_version="18.0.0"
    
    if ! printf '%s\n%s\n' "$required_version" "$node_version" | sort -V -C; then
        log "ERROR" "Node.js version $node_version is below required version $required_version"
        exit 1
    fi
    
    log "INFO" "Node.js version: $node_version ✓"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log "ERROR" "npm is not installed"
        exit 1
    fi
    
    log "INFO" "npm version: $(npm --version) ✓"
    
    # Check PM2 (if using PM2 deployment)
    if command -v pm2 &> /dev/null; then
        log "INFO" "PM2 version: $(pm2 --version) ✓"
    fi
    
    # Check Docker (if using Docker deployment)
    if command -v docker &> /dev/null; then
        log "INFO" "Docker version: $(docker --version) ✓"
    fi
    
    # Check disk space
    local available_space=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    local required_space=1048576  # 1GB in KB
    
    if [ "$available_space" -lt "$required_space" ]; then
        log "WARN" "Low disk space. Available: ${available_space}KB, Recommended: ${required_space}KB"
    fi
    
    # Check environment files
    if [ ! -f "${PROJECT_ROOT}/back-end/.env" ]; then
        log "WARN" "Backend environment file not found: ${PROJECT_ROOT}/back-end/.env"
        if [ -f "${PROJECT_ROOT}/back-end/.env.production" ]; then
            log "INFO" "Copying production environment template..."
            cp "${PROJECT_ROOT}/back-end/.env.production" "${PROJECT_ROOT}/back-end/.env"
        fi
    fi
    
    if [ ! -f "${PROJECT_ROOT}/front-end/.env.local" ]; then
        log "WARN" "Frontend environment file not found: ${PROJECT_ROOT}/front-end/.env.local"
        if [ -f "${PROJECT_ROOT}/front-end/.env.production" ]; then
            log "INFO" "Copying production environment template..."
            cp "${PROJECT_ROOT}/front-end/.env.production" "${PROJECT_ROOT}/front-end/.env.local"
        fi
    fi
}

# Create backup before deployment
create_backup() {
    if [ "$SKIP_BACKUP" = true ]; then
        log "INFO" "Skipping backup as requested"
        return 0
    fi
    
    log "INFO" "Creating pre-deployment backup..."
    
    if [ -f "${PROJECT_ROOT}/scripts/backup.sh" ]; then
        bash "${PROJECT_ROOT}/scripts/backup.sh"
        if [ $? -eq 0 ]; then
            log "INFO" "Pre-deployment backup completed successfully"
        else
            log "ERROR" "Pre-deployment backup failed"
            exit 1
        fi
    else
        log "WARN" "Backup script not found, skipping backup"
    fi
}

# Run tests
run_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        log "INFO" "Skipping tests as requested"
        return 0
    fi
    
    log "INFO" "Running tests..."
    
    # Backend tests
    cd "${PROJECT_ROOT}/back-end"
    if [ -f "package.json" ] && npm run test --if-present; then
        log "INFO" "Backend tests passed ✓"
    else
        log "ERROR" "Backend tests failed"
        exit 1
    fi
    
    # Frontend tests
    cd "${PROJECT_ROOT}/front-end"
    if [ -f "package.json" ] && npm run test --if-present; then
        log "INFO" "Frontend tests passed ✓"
    else
        log "ERROR" "Frontend tests failed"
        exit 1
    fi
    
    cd "$PROJECT_ROOT"
}

# Install dependencies
install_dependencies() {
    log "INFO" "Installing dependencies..."
    
    # Backend dependencies
    cd "${PROJECT_ROOT}/back-end"
    log "INFO" "Installing backend dependencies..."
    npm ci --only=production
    
    # Frontend dependencies
    cd "${PROJECT_ROOT}/front-end"
    log "INFO" "Installing frontend dependencies..."
    npm ci --only=production
    
    cd "$PROJECT_ROOT"
    log "INFO" "Dependencies installed successfully ✓"
}

# Build applications
build_applications() {
    if [ "$SKIP_BUILD" = true ]; then
        log "INFO" "Skipping build as requested"
        return 0
    fi
    
    log "INFO" "Building applications..."
    
    # Build frontend
    cd "${PROJECT_ROOT}/front-end"
    log "INFO" "Building frontend application..."
    npm run build
    
    if [ $? -eq 0 ]; then
        log "INFO" "Frontend build completed successfully ✓"
    else
        log "ERROR" "Frontend build failed"
        exit 1
    fi
    
    cd "$PROJECT_ROOT"
}

# Run database migrations
run_migrations() {
    log "INFO" "Running database migrations..."
    
    cd "${PROJECT_ROOT}/back-end"
    
    # Check if production migration script exists
    if [ -f "migrations/production-migrate.js" ]; then
        node migrations/production-migrate.js migrate
        if [ $? -eq 0 ]; then
            log "INFO" "Database migrations completed successfully ✓"
        else
            log "ERROR" "Database migrations failed"
            exit 1
        fi
    else
        # Fallback to regular migration
        if [ -f "migrations/migrate.js" ]; then
            node migrations/migrate.js
            if [ $? -eq 0 ]; then
                log "INFO" "Database migrations completed successfully ✓"
            else
                log "ERROR" "Database migrations failed"
                exit 1
            fi
        else
            log "WARN" "No migration script found, skipping migrations"
        fi
    fi
    
    cd "$PROJECT_ROOT"
}

# Stop services
stop_services() {
    log "INFO" "Stopping existing services..."
    
    # Stop PM2 processes
    if command -v pm2 &> /dev/null; then
        pm2 stop all 2>/dev/null || true
        log "INFO" "PM2 processes stopped"
    fi
    
    # Stop Docker containers
    if command -v docker &> /dev/null && [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        cd "$PROJECT_ROOT"
        docker-compose down 2>/dev/null || true
        log "INFO" "Docker containers stopped"
    fi
    
    # Give services time to stop gracefully
    sleep 3
}

# Start services
start_services() {
    log "INFO" "Starting services..."
    
    # Start with PM2 if ecosystem file exists
    if command -v pm2 &> /dev/null && [ -f "$PROJECT_ROOT/ecosystem.config.js" ]; then
        cd "$PROJECT_ROOT"
        pm2 start ecosystem.config.js
        pm2 save
        log "INFO" "PM2 processes started ✓"
        
        # Wait for services to start
        sleep 5
        
        # Check PM2 status
        pm2 status
        
    # Start with Docker if compose file exists
    elif command -v docker &> /dev/null && [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        cd "$PROJECT_ROOT"
        docker-compose up -d
        log "INFO" "Docker containers started ✓"
        
        # Wait for services to start
        sleep 10
        
        # Check container status
        docker-compose ps
        
    else
        log "WARN" "No process manager configuration found (PM2 or Docker)"
        log "INFO" "Starting services manually..."
        
        # Start backend
        cd "${PROJECT_ROOT}/back-end"
        nohup npm start > ../logs/backend.log 2>&1 &
        echo $! > ../logs/backend.pid
        
        # Start frontend
        cd "${PROJECT_ROOT}/front-end"
        nohup npm start > ../logs/frontend.log 2>&1 &
        echo $! > ../logs/frontend.pid
        
        cd "$PROJECT_ROOT"
        log "INFO" "Services started manually ✓"
    fi
}

# Health check
health_check() {
    log "INFO" "Performing health checks..."
    
    local backend_url="http://localhost:5000"
    local frontend_url="http://localhost:3000"
    local max_attempts=30
    local attempt=1
    
    # Check backend health
    while [ $attempt -le $max_attempts ]; do
        if curl -f "$backend_url/api/health" > /dev/null 2>&1; then
            log "INFO" "Backend health check passed ✓"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log "ERROR" "Backend health check failed after $max_attempts attempts"
            return 1
        fi
        
        log "INFO" "Backend health check attempt $attempt/$max_attempts..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    # Check frontend health
    attempt=1
    while [ $attempt -le $max_attempts ]; do
        if curl -f "$frontend_url" > /dev/null 2>&1; then
            log "INFO" "Frontend health check passed ✓"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log "ERROR" "Frontend health check failed after $max_attempts attempts"
            return 1
        fi
        
        log "INFO" "Frontend health check attempt $attempt/$max_attempts..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log "INFO" "All health checks passed ✓"
}

# Cleanup old deployments
cleanup() {
    log "INFO" "Cleaning up old deployment artifacts..."
    
    # Clean old log files (keep last 10)
    find "${PROJECT_ROOT}/logs" -name "*.log" -type f | sort -r | tail -n +11 | xargs rm -f 2>/dev/null || true
    
    # Clean old backups (keep last 30 days)
    find "${PROJECT_ROOT}/backups" -name "*.gz" -mtime +30 -delete 2>/dev/null || true
    
    # Clean npm cache
    npm cache clean --force 2>/dev/null || true
    
    log "INFO" "Cleanup completed ✓"
}

# Send deployment notification
send_notification() {
    local status=$1
    local message=$2
    
    # Email notification
    if [ -n "$NOTIFICATION_EMAIL" ] && command -v mail &> /dev/null; then
        echo "$message" | mail -s "RapidCare Deployment $status" "$NOTIFICATION_EMAIL"
        log "INFO" "Email notification sent"
    fi
    
    # Slack notification
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        local color="good"
        [ "$status" = "FAILED" ] && color="danger"
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"RapidCare Deployment $status\",\"attachments\":[{\"color\":\"$color\",\"text\":\"$message\"}]}" \
            "$SLACK_WEBHOOK_URL" &> /dev/null
        
        log "INFO" "Slack notification sent"
    fi
}

# Rollback deployment
rollback() {
    log "ERROR" "Deployment failed, initiating rollback..."
    
    # Stop current services
    stop_services
    
    # Restore from backup if available
    local latest_backup=$(find "${PROJECT_ROOT}/backups" -name "database_*.sqlite.gz" -type f | sort -r | head -n1)
    
    if [ -n "$latest_backup" ] && [ -f "${PROJECT_ROOT}/scripts/restore.sh" ]; then
        log "INFO" "Restoring from backup: $(basename "$latest_backup")"
        bash "${PROJECT_ROOT}/scripts/restore.sh" -d "$latest_backup" -f
    fi
    
    # Start services
    start_services
    
    log "INFO" "Rollback completed"
}

# Main deployment function
main() {
    local start_time=$(date +%s)
    
    log "INFO" "Starting RapidCare deployment process..."
    log "INFO" "Environment: $ENVIRONMENT"
    log "INFO" "Deployment ID: $DATE"
    
    # Trap errors for rollback
    if [ "$FORCE" != true ]; then
        trap 'rollback; send_notification "FAILED" "Deployment failed and was rolled back at $(date)"; exit 1' ERR
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log "INFO" "DRY RUN MODE - No actual deployment will be performed"
        log "INFO" "Would perform the following steps:"
        log "INFO" "1. Check prerequisites"
        log "INFO" "2. Create backup (skip: $SKIP_BACKUP)"
        log "INFO" "3. Run tests (skip: $SKIP_TESTS)"
        log "INFO" "4. Install dependencies"
        log "INFO" "5. Build applications (skip: $SKIP_BUILD)"
        log "INFO" "6. Run migrations"
        log "INFO" "7. Stop services"
        log "INFO" "8. Start services"
        log "INFO" "9. Health checks"
        log "INFO" "10. Cleanup"
        return 0
    fi
    
    create_directories
    check_prerequisites
    create_backup
    run_tests
    install_dependencies
    build_applications
    run_migrations
    stop_services
    start_services
    health_check
    cleanup
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "INFO" "Deployment completed successfully in ${duration} seconds ✓"
    
    local success_message="RapidCare deployment completed successfully at $(date). Duration: ${duration} seconds. Environment: $ENVIRONMENT"
    send_notification "SUCCESS" "$success_message"
}

# Script usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -e, --environment ENV   Set deployment environment (default: production)"
    echo "  -d, --dry-run           Show what would be deployed without actually doing it"
    echo "  -f, --force             Force deployment without rollback on failure"
    echo "  --skip-backup           Skip pre-deployment backup"
    echo "  --skip-tests            Skip running tests"
    echo "  --skip-build            Skip building applications"
    echo ""
    echo "Environment Variables:"
    echo "  NOTIFICATION_EMAIL      Email address for deployment notifications"
    echo "  SLACK_WEBHOOK_URL       Slack webhook URL for notifications"
    echo ""
    echo "Examples:"
    echo "  $0                      Deploy to production with all checks"
    echo "  $0 --dry-run            Show deployment plan without executing"
    echo "  $0 --skip-tests         Deploy without running tests"
    echo "  $0 -e staging           Deploy to staging environment"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Set environment-specific configurations
case $ENVIRONMENT in
    "production")
        export NODE_ENV=production
        ;;
    "staging")
        export NODE_ENV=staging
        ;;
    "development")
        export NODE_ENV=development
        ;;
    *)
        log "ERROR" "Unknown environment: $ENVIRONMENT"
        exit 1
        ;;
esac

# Run main function
main