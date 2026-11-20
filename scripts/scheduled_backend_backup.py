#!/usr/bin/env python3
"""systemd entrypoint: unique dated private backups using operator configuration."""
from datetime import datetime, timezone
import os
from pathlib import Path
import uuid
from backend_backup import backup


def main():
    os.umask(0o077)
    try:
        directory = Path(os.environ['BACKUP_DIRECTORY'])
        stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        output = directory / (stamp + '-' + uuid.uuid4().hex[:8] + '.dump')
        backup(output, ['docker', 'exec', os.environ['BACKUP_CONTAINER'], 'pg_dump',
            '--format=custom', '--no-owner', '--username=' + os.environ.get('BACKUP_USER', 'postgres'),
            '--dbname=' + os.environ['BACKUP_DATABASE']])
    except (KeyError, OSError, RuntimeError):
        raise SystemExit('Scheduled backup failed; inspect configuration/service privately') from None
    print('Scheduled backup published')


if __name__ == '__main__':
    main()
