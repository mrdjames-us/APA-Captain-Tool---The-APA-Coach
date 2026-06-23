#!/usr/bin/env bash
# Restore the pre-redesign site using Docker.
# Usage (one command): bash restore-backup.sh
# Result: old site served at http://localhost:3000
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Extracting pre-redesign build..."
tar xzf backup-pre-redesign-dist.tar.gz

echo "==> Building Docker image..."
docker build -f Dockerfile.backup -t aiformissouri-apa-coach:backup-pre-redesign .

echo ""
echo "Backup image ready. Starting old site on http://localhost:3000 ..."
echo "(Press Ctrl+C to stop)"
echo ""
docker run --rm -p 3000:80 aiformissouri-apa-coach:backup-pre-redesign
