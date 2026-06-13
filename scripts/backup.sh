#!/bin/bash

# Configuration
PROJECT_NAME="school-app"
BACKUP_DIR="./backups"
DB_URL=$SUPABASE_DB_URL # Example: postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres
RETENTION_DAYS=30
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
CURRENT_BACKUP_PATH="$BACKUP_DIR/$TIMESTAMP"

# Create backup directory
mkdir -p "$CURRENT_BACKUP_PATH"

echo "Starting backup for $PROJECT_NAME at $TIMESTAMP..."

# 1. Database Dump
echo "Dumping database..."
if command -v pg_dump &> /dev/null; then
    pg_dump "$DB_URL" > "$CURRENT_BACKUP_PATH/db_dump.sql"
else
    echo "Error: pg_dump not found. Please install postgresql-client."
    exit 1
fi

# 2. Environment Configs
echo "Backing up environment configurations..."
cp .env "$CURRENT_BACKUP_PATH/.env.backup" 2>/dev/null || echo "Warning: .env file not found."

# 3. Uploaded Files (Local storage if applicable)
if [ -d "./public/uploads" ]; then
    echo "Backing up uploaded files..."
    tar -czf "$CURRENT_BACKUP_PATH/uploads.tar.gz" ./public/uploads
fi

# 4. Compress the whole backup folder
echo "Compressing backup..."
cd "$BACKUP_DIR"
tar -czf "$TIMESTAMP.tar.gz" "$TIMESTAMP"
rm -rf "$TIMESTAMP"
cd ..

# 5. Retention Policy (Cleanup older than 30 days)
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +$RETENTION_DAYS -exec rm {} \;

echo "Backup completed successfully: $BACKUP_DIR/$TIMESTAMP.tar.gz"
