#!/bin/bash

# RapidCare Database Restore Script
# This script restores database and application files from backups

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_ROOT}/backups"
LOG_FILE="${PROJECT_ROOT}/logs/restore.log"
DATE=$(date +%Y%m%d_%H%M%S)

# Database paths
DB_FILE="${PROJECT_ROOT}/back-end/database.sqlite"

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
}

# List available backups
list_backups() {
    log "INFO" "Available database backups:"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        log "ERROR" "Backup directory not found: $BACKUP_DIR"
        exit 1
    fi
    
    local backups=($(find "$BACKUP_DIR" -name "database_*.sqlite.gz" -type f | sort -r))
    
    if [ ${#backups[@]} -eq 0 ]; then
        log "WARN" "No database backups found in $BACKUP_DIR"
        return 1
    fi
    
    echo ""
    echo "Database Backups:"
    echo "=================="
    
    local index=1
    for backup in "${backups[@]}"; do
        local filename=$(basename "$backup")
        local size=$(stat -f%z "$backup" 2>/dev/null || stat -c%s "$backup" 2>/dev/null || echo "Unknown")
        local date_created=$(stat -f%Sm -t%Y-%m-%d\ %H:%M:%S "$backup" 2>/dev/null || stat -c%y "$backup" 2>/dev/null | cut -d. -f1 || echo "Unknown")
        
        printf "%2d. %-30s %10s bytes  %s\n" "$index" "$filename" "$size" "$date_created"
        index=$((index + 1))
    done
    
    echo ""
    echo "Application File Backups:"
    echo "========================="
    
    local app_backups=($(find "$BACKUP_DIR" -name "app_files_*.tar.gz" -type f | sort -r))
    
    if [ ${#app_backups[@]} -eq 0 ]; then
        log "WARN" "No application file backups found"
    else
        index=1
        for backup in "${app_backups[@]}"; do
            local filename=$(basename "$backup")
            local size=$(stat -f%z "$backup" 2>/dev/null || stat -c%s "$backup" 2>/dev/null || echo "Unknown")
            local date_created=$(stat -f%Sm -t%Y-%m-%d\ %H:%M:%S "$backup" 2>/dev/null || stat -c%y "$backup" 2>/dev/null | cut -d. -f1 || echo "Unknown")
            
            printf "%2d. %-30s %10s bytes  %s\n" "$index" "$filename" "$size" "$date_created"
            index=$((index + 1))
        done
    fi
    
    echo ""
}

# Validate backup file
validate_backup() {
    local backup_file=$1
    
    log "INFO" "Validating backup file: $backup_file"
    
    if [ ! -f "$backup_file" ]; then
        log "ERROR" "Backup file not found: $backup_file"
        return 1
    fi
    
    # Check if file is gzipped
    if [[ "$backup_file" == *.gz ]]; then
        # Test gzip integrity
        if ! gzip -t "$backup_file"; then
            log "ERROR" "Backup file is corrupted (gzip test failed)"
            return 1
        fi
        
        # Extract to temporary file for SQLite validation
        local temp_db="/tmp/temp_restore_${DATE}.sqlite"
        gunzip -c "$backup_file" > "$temp_db"
        
        # Validate SQLite database
        if ! sqlite3 "$temp_db" "PRAGMA integrity_check;" > /dev/null 2>&1; then
            log "ERROR" "Backup database integrity check failed"
            rm -f "$temp_db"
            return 1
        fi
        
        rm -f "$temp_db"
        log "INFO" "Backup file validation passed"
        return 0
    else
        # Direct SQLite validation
        if ! sqlite3 "$backup_file" "PRAGMA integrity_check;" > /dev/null 2>&1; then
            log "ERROR" "Backup database integrity check failed"
            return 1
        fi
        
        log "INFO" "Backup file validation passed"
        return 0
    fi
}

# Stop application services
stop_services() {
    log "INFO" "Stopping application services..."
    
    # Stop PM2 processes if running
    if command -v pm2 &> /dev/null; then
        pm2 stop all 2>/dev/null || true
        log "INFO" "PM2 processes stopped"
    fi
    
    # Stop Docker containers if running
    if command -v docker &> /dev/null && [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        cd "$PROJECT_ROOT"
        docker-compose down 2>/dev/null || true
        log "INFO" "Docker containers stopped"
    fi
    
    # Give services time to stop gracefully
    sleep 3
}

# Start application services
start_services() {
    log "INFO" "Starting application services..."
    
    # Start PM2 processes if ecosystem file exists
    if command -v pm2 &> /dev/null && [ -f "$PROJECT_ROOT/ecosystem.config.js" ]; then
        cd "$PROJECT_ROOT"
        pm2 start ecosystem.config.js
        log "INFO" "PM2 processes started"
    fi
    
    # Start Docker containers if compose file exists
    if command -v docker &> /dev/null && [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        cd "$PROJECT_ROOT"
        docker-compose up -d
        log "INFO" "Docker containers started"
    fi
}

# Create pre-restore backup
create_pre_restore_backup() {
    log "INFO" "Creating pre-restore backup of current database..."
    
    if [ -f "$DB_FILE" ]; then
        local pre_restore_backup="${BACKUP_DIR}/pre_restore_${DATE}.sqlite"
        cp "$DB_FILE" "$pre_restore_backup"
        gzip "$pre_restore_backup"
        log "INFO" "Pre-restore backup created: ${pre_restore_backup}.gz"
        echo "$pre_restore_backup.gz"
    else
        log "WARN" "Current database file not found, skipping pre-restore backup"
        echo ""
    fi
}

# Restore database
restore_database() {
    local backup_file=$1
    local skip_validation=$2
    
    log "INFO" "Starting database restore from: $backup_file"
    
    # Validate backup unless skipped
    if [ "$skip_validation" != "true" ]; then
        if ! validate_backup "$backup_file"; then
            log "ERROR" "Backup validation failed"
            return 1
        fi
    fi
    
    # Create pre-restore backup
    local pre_restore_backup=$(create_pre_restore_backup)
    
    # Stop services
    stop_services
    
    # Restore database
    if [[ "$backup_file" == *.gz ]]; then
        log "INFO" "Extracting compressed backup..."
        gunzip -c "$backup_file" > "$DB_FILE"
    else
        log "INFO" "Copying uncompressed backup..."
        cp "$backup_file" "$DB_FILE"
    fi
    
    # Verify restored database
    if sqlite3 "$DB_FILE" "PRAGMA integrity_check;" > /dev/null 2>&1; then
        log "INFO" "Database restore completed successfully"
        
        # Start services
        start_services
        
        return 0
    else
        log "ERROR" "Restored database failed integrity check"
        
        # Restore from pre-restore backup if available
        if [ -n "$pre_restore_backup" ] && [ -f "$pre_restore_backup" ]; then
            log "INFO" "Restoring from pre-restore backup..."
            gunzip -c "$pre_restore_backup" > "$DB_FILE"
            start_services
        fi
        
        return 1
    fi
}

# Restore application files
restore_application_files() {
    local backup_file=$1
    
    log "INFO" "Starting application files restore from: $backup_file"
    
    if [ ! -f "$backup_file" ]; then
        log "ERROR" "Application backup file not found: $backup_file"
        return 1
    fi
    
    # Test tar file integrity
    if ! tar -tzf "$backup_file" > /dev/null 2>&1; then
        log "ERROR" "Application backup file is corrupted"
        return 1
    fi
    
    # Create backup of current files
    local current_backup_dir="${BACKUP_DIR}/pre_restore_app_${DATE}"
    mkdir -p "$current_backup_dir"
    
    # Backup current application files
    cd "$PROJECT_ROOT"
    for dir in "back-end/uploads" "back-end/logs" "back-end/.env" "front-end/.env.local"; do
        if [ -e "$dir" ]; then
            local parent_dir=$(dirname "$dir")
            mkdir -p "${current_backup_dir}/${parent_dir}"
            cp -r "$dir" "${current_backup_dir}/${parent_dir}/"
        fi
    done
    
    log "INFO" "Current application files backed up to: $current_backup_dir"
    
    # Extract application files
    tar -xzf "$backup_file" -C "$PROJECT_ROOT"
    
    if [ $? -eq 0 ]; then
        log "INFO" "Application files restore completed successfully"
        return 0
    else
        log "ERROR" "Application files restore failed"
        
        # Restore from backup
        log "INFO" "Restoring original application files..."
        cd "$current_backup_dir"
        tar -czf - . | tar -xzf - -C "$PROJECT_ROOT"
        
        return 1
    fi
}

# Interactive restore
interactive_restore() {
    echo ""
    echo "RapidCare Interactive Restore"
    echo "============================="
    echo ""
    
    list_backups
    
    echo "Select restore options:"
    echo "1. Database only"
    echo "2. Application files only"
    echo "3. Both database and application files"
    echo "4. Exit"
    echo ""
    
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1)
            echo ""
            read -p "Enter database backup filename (or 'latest' for most recent): " db_backup
            
            if [ "$db_backup" = "latest" ]; then
                db_backup=$(find "$BACKUP_DIR" -name "database_*.sqlite.gz" -type f | sort -r | head -n1)
                if [ -z "$db_backup" ]; then
                    log "ERROR" "No database backups found"
                    exit 1
                fi
                log "INFO" "Using latest backup: $(basename "$db_backup")"
            else
                db_backup="${BACKUP_DIR}/${db_backup}"
            fi
            
            echo ""
            echo "WARNING: This will replace your current database!"
            read -p "Are you sure you want to continue? (yes/no): " confirm
            
            if [ "$confirm" = "yes" ]; then
                restore_database "$db_backup"
            else
                log "INFO" "Restore cancelled by user"
            fi
            ;;
            
        2)
            echo ""
            read -p "Enter application files backup filename (or 'latest' for most recent): " app_backup
            
            if [ "$app_backup" = "latest" ]; then
                app_backup=$(find "$BACKUP_DIR" -name "app_files_*.tar.gz" -type f | sort -r | head -n1)
                if [ -z "$app_backup" ]; then
                    log "ERROR" "No application file backups found"
                    exit 1
                fi
                log "INFO" "Using latest backup: $(basename "$app_backup")"
            else
                app_backup="${BACKUP_DIR}/${app_backup}"
            fi
            
            echo ""
            echo "WARNING: This will replace your current application files!"
            read -p "Are you sure you want to continue? (yes/no): " confirm
            
            if [ "$confirm" = "yes" ]; then
                restore_application_files "$app_backup"
            else
                log "INFO" "Restore cancelled by user"
            fi
            ;;
            
        3)
            echo ""
            read -p "Enter database backup filename (or 'latest' for most recent): " db_backup
            read -p "Enter application files backup filename (or 'latest' for most recent): " app_backup
            
            if [ "$db_backup" = "latest" ]; then
                db_backup=$(find "$BACKUP_DIR" -name "database_*.sqlite.gz" -type f | sort -r | head -n1)
            else
                db_backup="${BACKUP_DIR}/${db_backup}"
            fi
            
            if [ "$app_backup" = "latest" ]; then
                app_backup=$(find "$BACKUP_DIR" -name "app_files_*.tar.gz" -type f | sort -r | head -n1)
            else
                app_backup="${BACKUP_DIR}/${app_backup}"
            fi
            
            echo ""
            echo "WARNING: This will replace your current database and application files!"
            read -p "Are you sure you want to continue? (yes/no): " confirm
            
            if [ "$confirm" = "yes" ]; then
                restore_database "$db_backup" && restore_application_files "$app_backup"
            else
                log "INFO" "Restore cancelled by user"
            fi
            ;;
            
        4)
            log "INFO" "Exiting..."
            exit 0
            ;;
            
        *)
            log "ERROR" "Invalid choice"
            exit 1
            ;;
    esac
}

# Script usage
usage() {
    echo "Usage: $0 [OPTIONS] [BACKUP_FILE]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -l, --list              List available backups"
    echo "  -i, --interactive       Interactive restore mode"
    echo "  -d, --database FILE     Restore database from specific backup file"
    echo "  -a, --app-files FILE    Restore application files from specific backup file"
    echo "  -f, --force             Skip confirmation prompts"
    echo "  --skip-validation       Skip backup file validation"
    echo "  --dry-run               Show what would be restored without actually doing it"
    echo ""
    echo "Examples:"
    echo "  $0 -l                                    List available backups"
    echo "  $0 -i                                    Interactive restore mode"
    echo "  $0 -d database_20240115_120000.sqlite.gz Restore specific database backup"
    echo "  $0 -a app_files_20240115_120000.tar.gz   Restore specific app files backup"
    echo "  $0 --dry-run -d latest                   Show what would be restored"
}

# Main function
main() {
    local start_time=$(date +%s)
    
    log "INFO" "Starting RapidCare restore process..."
    
    create_directories
    
    # Process based on arguments
    if [ "$LIST_BACKUPS" = true ]; then
        list_backups
    elif [ "$INTERACTIVE" = true ]; then
        interactive_restore
    elif [ -n "$DATABASE_BACKUP" ]; then
        if [ "$DATABASE_BACKUP" = "latest" ]; then
            DATABASE_BACKUP=$(find "$BACKUP_DIR" -name "database_*.sqlite.gz" -type f | sort -r | head -n1)
            if [ -z "$DATABASE_BACKUP" ]; then
                log "ERROR" "No database backups found"
                exit 1
            fi
            log "INFO" "Using latest database backup: $(basename "$DATABASE_BACKUP")"
        fi
        
        if [ "$DRY_RUN" = true ]; then
            log "INFO" "DRY RUN: Would restore database from $DATABASE_BACKUP"
        else
            if [ "$FORCE" != true ]; then
                echo "WARNING: This will replace your current database!"
                read -p "Are you sure you want to continue? (yes/no): " confirm
                [ "$confirm" != "yes" ] && exit 0
            fi
            restore_database "$DATABASE_BACKUP" "$SKIP_VALIDATION"
        fi
    elif [ -n "$APP_FILES_BACKUP" ]; then
        if [ "$APP_FILES_BACKUP" = "latest" ]; then
            APP_FILES_BACKUP=$(find "$BACKUP_DIR" -name "app_files_*.tar.gz" -type f | sort -r | head -n1)
            if [ -z "$APP_FILES_BACKUP" ]; then
                log "ERROR" "No application file backups found"
                exit 1
            fi
            log "INFO" "Using latest app files backup: $(basename "$APP_FILES_BACKUP")"
        fi
        
        if [ "$DRY_RUN" = true ]; then
            log "INFO" "DRY RUN: Would restore application files from $APP_FILES_BACKUP"
        else
            if [ "$FORCE" != true ]; then
                echo "WARNING: This will replace your current application files!"
                read -p "Are you sure you want to continue? (yes/no): " confirm
                [ "$confirm" != "yes" ] && exit 0
            fi
            restore_application_files "$APP_FILES_BACKUP"
        fi
    else
        usage
        exit 1
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "INFO" "Restore process completed in ${duration} seconds"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -l|--list)
            LIST_BACKUPS=true
            shift
            ;;
        -i|--interactive)
            INTERACTIVE=true
            shift
            ;;
        -d|--database)
            DATABASE_BACKUP="$2"
            shift 2
            ;;
        -a|--app-files)
            APP_FILES_BACKUP="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        --skip-validation)
            SKIP_VALIDATION=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Make backup directory path absolute if relative
if [[ "$DATABASE_BACKUP" == */* ]] && [[ "$DATABASE_BACKUP" != /* ]]; then
    DATABASE_BACKUP="${BACKUP_DIR}/${DATABASE_BACKUP}"
fi

if [[ "$APP_FILES_BACKUP" == */* ]] && [[ "$APP_FILES_BACKUP" != /* ]]; then
    APP_FILES_BACKUP="${BACKUP_DIR}/${APP_FILES_BACKUP}"
fi

# Run main function
main