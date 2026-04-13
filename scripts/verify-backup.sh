#!/bin/bash

# Simple script to verify the integrity of the latest backup
BACKUP_DIR="./backups"
LATEST_BACKUP=$(ls -t $BACKUP_DIR/*.tar.gz 2>/dev/null | head -n 1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "Error: No backups found in $BACKUP_DIR"
    exit 1
fi

echo "Verifying latest backup: $LATEST_BACKUP"

# 1. Check if file is readable
if [ ! -r "$LATEST_BACKUP" ]; then
    echo "Error: Backup file is not readable"
    exit 1
fi

# 2. Check file size (should be > 10KB for a real DB)
FILE_SIZE=$(du -k "$LATEST_BACKUP" | cut -f1)
if [ "$FILE_SIZE" -lt 10 ]; then
    echo "Warning: Backup file is very small ($FILE_SIZE KB). Verification might fail."
fi

# 3. Test integrity of the archive
if tar -tzf "$LATEST_BACKUP" > /dev/null; then
    echo "Success: Backup archive integrity is OK."
else
    echo "Error: Backup archive is corrupted."
    exit 1
fi

# 4. Check contents (should have db_dump.sql)
if tar -tzf "$LATEST_BACKUP" | grep -q "db_dump.sql"; then
    echo "Success: Backup contains database dump."
else
    echo "Error: Backup does not contain db_dump.sql"
    exit 1
fi

echo "Backup verification COMPLETED."
