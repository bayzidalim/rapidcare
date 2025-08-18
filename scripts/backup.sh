#!/bin/bash

# RapidCare Database Backup Script
# This script creates automated backups of the database and application files

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_ROOT}/backups"
LOG_FILE="${PROJECT_ROOT}/logs/backup.log"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Database paths
DB_FILE="${PROJECT_ROOT}/back-end/database.sqlite"
DB_BACKUP_NAME="database_${DATE}.sqlite"

# Application directories to backup
APP_DIRS=("back-end/uploads" "back-end/logs" "back-end/.env" "front-end/.env.local")

# S3 Configuration (optional)
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
    esac
}

# Create necessary directories
create_directories() {
    log "INFO" "Creating backup directories..."
    
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$(dirname "$LOG_FILE")"
    
    if [ ! -w "$BACKUP_DIR" ]; then
        log "ERROR" "Backup directory is not writable: $BACKUP_DIR"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    # Check if database file exists
    if [ ! -f "$DB_FILE" ]; then
        log "ERROR" "Database file not found: $DB_FILE"
        exit 1
    fi
    
    # Check if sqlite3 is available
    if ! command -v sqlite3 &> /dev/null; then
        log "WARN" "sqlite3 command not found. Installing..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y sqlite3
        elif command -v yum &> /dev/null; then
            sudo yum install -y sqlite
        else
            log "ERROR" "Cannot install sqlite3. Please install manually."
            exit 1
        fi
    fi
    
    # Check available disk space
    local available_space=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    local db_size=$(stat -f%z "$DB_FILE" 2>/dev/null || stat -c%s "$DB_FILE" 2>/dev/null || echo "0")
    local required_space=$((db_size * 2))  # Double the database size for safety
    
    if [ "$available_space" -lt "$required_space" ]; then
        log "WARN" "Low disk space. Available: ${available_space}KB, Required: ${required_space}KB"
    fi
}

# Backup database
backup_database() {
    log "INFO" "Starting database backup..."
    
    local backup_path="${BACKUP_DIR}/${DB_BACKUP_NAME}"
    
    # Create database backup using SQLite backup API
    sqlite3 "$DB_FILE" ".backup '$backup_path'"
    
    if [ $? -eq 0 ]; then
        log "INFO" "Database backup created: $backup_path"
        
        # Verify backup integrity
        sqlite3 "$backup_path" "PRAGMA integrity_check;" > /dev/null
        if [ $? -eq 0 ]; then
            log "INFO" "Database backup integrity verified"
        else
            log "ERROR" "Database backup integrity check failed"
            rm -f "$backup_path"
            exit 1
        fi
        
        # Compress backup
        gzip "$backup_path"
        log "INFO" "Database backup compressed: ${backup_path}.gz"
        
        return 0
    else
        log "ERROR" "Database backup failed"
        exit 1
    fi
}

# Backup application files
backup_application_files() {
    log "INFO" "Starting application files backup..."
    
    local app_backup_name="app_files_${DATE}.tar.gz"
    local app_backup_path="${BACKUP_DIR}/${app_backup_name}"
    
    # Create list of files to backup
    local backup_files=()
    
    for dir in "${APP_DIRS[@]}"; do
        local full_path="${PROJECT_ROOT}/${dir}"
        if [ -e "$full_path" ]; then
            backup_files+=("$dir")
        else
            log "WARN" "Skipping non-existent path: $full_path"
        fi
    done
    
    if [ ${#backup_files[@]} -eq 0 ]; then
        log "WARN" "No application files to backup"
        return 0
    fi
    
    # Create tar archive
    cd "$PROJECT_ROOT"
    tar -czf "$app_backup_path" "${backup_files[@]}" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        log "INFO" "Application files backup created: $app_backup_path"
        return 0
    else
        log "ERROR" "Application files backup failed"
        return 1
    fi
}

# Upload to S3 (optional)
upload_to_s3() {
    if [ -z "$S3_BUCKET" ]; then
        log "INFO" "S3 backup not configured, skipping upload"
        return 0
    fi
    
    log "INFO" "Uploading backups to S3..."
    
    # Check if AWS CLI is available
    if ! command -v aws &> /dev/null; then
        log "ERROR" "AWS CLI not found. Please install AWS CLI for S3 backup."
        return 1
    fi
    
    # Upload database backup
    local db_backup_gz="${BACKUP_DIR}/${DB_BACKUP_NAME}.gz"
    if [ -f "$db_backup_gz" ]; then
        aws s3 cp "$db_backup_gz" "s3://${S3_BUCKET}/database/" --region "$AWS_REGION"
        if [ $? -eq 0 ]; then
            log "INFO" "Database backup uploaded to S3"
        else
            log "ERROR" "Failed to upload database backup to S3"
        fi
    fi
    
    # Upload application files backup
    local app_backup_path="${BACKUP_DIR}/app_files_${DATE}.tar.gz"
    if [ -f "$app_backup_path" ]; then
        aws s3 cp "$app_backup_path" "s3://${S3_BUCKET}/app_files/" --region "$AWS_REGION"
        if [ $? -eq 0 ]; then
            log "INFO" "Application files backup uploaded to S3"
        else
            log "ERROR" "Failed to upload application files backup to S3"
        fi
    fi
}

# Clean old backups
cleanup_old_backups() {
    log "INFO" "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    # Clean local backups
    find "$BACKUP_DIR" -name "database_*.sqlite.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "app_files_*.tar.gz" -mtime +$RETENTION_DAYS -delete
    
    local deleted_count=$(find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS | wc -l)
    log "INFO" "Cleaned up $deleted_count old backup files"
    
    # Clean S3 backups (if configured)
    if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
        
        # This is a simplified cleanup - in production, you might want more sophisticated S3 lifecycle policies
        log "INFO" "S3 cleanup should be configured using lifecycle policies for date: $cutoff_date"
    fi
}

# Generate backup report
generate_report() {
    log "INFO" "Generating backup report..."
    
    local report_file="${BACKUP_DIR}/backup_report_${DATE}.txt"
    
    cat > "$report_file" << EOF
RapidCare Backup Report
Generated: $(date)
Backup Date: $DATE

Database Backup:
- File: ${DB_BACKUP_NAME}.gz
- Original Size: $(stat -f%z "$DB_FILE" 2>/dev/null || stat -c%s "$DB_FILE" 2>/dev/null || echo "Unknown") bytes
- Compressed Size: $(stat -f%z "${BACKUP_DIR}/${DB_BACKUP_NAME}.gz" 2>/dev/null || stat -c%s "${BACKUP_DIR}/${DB_BACKUP_NAME}.gz" 2>/dev/null || echo "Unknown") bytes

Application Files Backup:
- File: app_files_${DATE}.tar.gz
- Size: $(stat -f%z "${BACKUP_DIR}/app_files_${DATE}.tar.gz" 2>/dev/null || stat -c%s "${BACKUP_DIR}/app_files_${DATE}.tar.gz" 2>/dev/null || echo "Unknown") bytes

Backup Location: $BACKUP_DIR
S3 Backup: $([ -n "$S3_BUCKET" ] && echo "Enabled (s3://$S3_BUCKET)" || echo "Disabled")

System Information:
- Hostname: $(hostname)
- OS: $(uname -s)
- Disk Usage: $(df -h "$BACKUP_DIR" | awk 'NR==2 {print $5 " used"}')
- Load Average: $(uptime | awk -F'load average:' '{print $2}')

EOF
    
    log "INFO" "Backup report generated: $report_file"
}

# Send notification (optional)
send_notification() {
    local status=$1
    local message=$2
    
    # Email notification (if configured)
    if [ -n "$NOTIFICATION_EMAIL" ] && command -v mail &> /dev/null; then
        echo "$message" | mail -s "RapidCare Backup $status" "$NOTIFICATION_EMAIL"
        log "INFO" "Email notification sent to $NOTIFICATION_EMAIL"
    fi
    
    # Slack notification (if configured)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        local color="good"
        [ "$status" = "FAILED" ] && color="danger"
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"RapidCare Backup $status\",\"attachments\":[{\"color\":\"$color\",\"text\":\"$message\"}]}" \
            "$SLACK_WEBHOOK_URL" &> /dev/null
        
        log "INFO" "Slack notification sent"
    fi
}

# Main backup function
main() {
    local start_time=$(date +%s)
    
    log "INFO" "Starting RapidCare backup process..."
    
    # Trap errors
    trap 'log "ERROR" "Backup process failed"; send_notification "FAILED" "Backup process failed at $(date)"; exit 1' ERR
    
    create_directories
    check_prerequisites
    backup_database
    backup_application_files
    upload_to_s3
    cleanup_old_backups
    generate_report
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "INFO" "Backup process completed successfully in ${duration} seconds"
    
    local success_message="RapidCare backup completed successfully at $(date). Duration: ${duration} seconds."
    send_notification "SUCCESS" "$success_message"
}

# Script usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -d, --dry-run           Show what would be backed up without actually doing it"
    echo "  -v, --verbose           Enable verbose output"
    echo "  --retention-days DAYS   Set backup retention period (default: 30)"
    echo "  --no-s3                 Skip S3 upload even if configured"
    echo ""
    echo "Environment Variables:"
    echo "  BACKUP_S3_BUCKET        S3 bucket for backup storage"
    echo "  AWS_REGION              AWS region (default: us-east-1)"
    echo "  NOTIFICATION_EMAIL      Email address for notifications"
    echo "  SLACK_WEBHOOK_URL       Slack webhook URL for notifications"
    echo ""
    echo "Examples:"
    echo "  $0                      Run backup with default settings"
    echo "  $0 --dry-run            Show what would be backed up"
    echo "  $0 --retention-days 7   Keep backups for 7 days"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --retention-days)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        --no-s3)
            S3_BUCKET=""
            shift
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Run main function if not in dry-run mode
if [ "$DRY_RUN" = true ]; then
    log "INFO" "DRY RUN MODE - No actual backup will be performed"
    log "INFO" "Would backup database: $DB_FILE"
    log "INFO" "Would backup to: $BACKUP_DIR"
    log "INFO" "Would retain backups for: $RETENTION_DAYS days"
    [ -n "$S3_BUCKET" ] && log "INFO" "Would upload to S3: s3://$S3_BUCKET"
else
    main
fi