#!/bin/bash
set -euo pipefail
umask 077
backup_root=/var/backups/sebit
install -d -m 700 "$backup_root"
exec 9>"$backup_root/.lock"
flock -n 9 || exit 0
destination="$backup_root/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir "$destination"
for name in cms ai-usage ai-events; do
    sqlite3 "/var/lib/sebit/$name.sqlite" ".timeout 5000" ".backup '$destination/$name.sqlite'"
    test "$(sqlite3 "$destination/$name.sqlite" 'PRAGMA integrity_check;')" = ok
done
install -m 600 /etc/sebit/backend.env "$destination/backend.env"
touch "$destination/COMPLETE"
# Only this script's timestamp directories; no symlink traversal.
find "$backup_root" -mindepth 1 -maxdepth 1 -type d -name '????????T??????Z' -mtime +14 -exec rm -r -- {} +
