#!/bin/sh
# Backup dữ liệu Mivy (DB + file in của khách). Cron chạy mỗi ngày.
set -e
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
SRC="$SCRIPT_DIR/../back-end/data"   # portable: lấy theo vị trí repo
DEST="$HOME/mivy-backups/daily"
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p "$DEST"

# Gói gọn: DB + đơn in + file khách upload (bỏ outputs ảnh gen cho nhẹ).
cd "$SRC"
tar czf "$DEST/mivy-$STAMP.tgz" \
  $( [ -f mivy.db ]       && echo mivy.db ) \
  $( [ -d print_orders ]  && echo print_orders ) \
  $( [ -d uploads ]       && echo uploads ) 2>/dev/null

# Giữ 14 bản gần nhất.
ls -1t "$DEST"/mivy-*.tgz 2>/dev/null | tail -n +15 | xargs rm -f 2>/dev/null || true
echo "[$(date)] Backup -> $DEST/mivy-$STAMP.tgz"
