#!/usr/bin/env python3
"""Private atomic PG16 dumps; restore only into a newly created disposable DB."""
import argparse
import os
from pathlib import Path
import subprocess
import tempfile


def backup(output, command):
    output = Path(output)
    if output.exists():
        raise FileExistsError('Backup destination already exists')
    fd, temporary = tempfile.mkstemp(prefix='.pgdump-', dir=output.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            result = subprocess.run(command, stdout=stream, stderr=subprocess.DEVNULL)
            stream.flush()
            os.fsync(stream.fileno())
        if result.returncode or Path(temporary).stat().st_size == 0:
            raise RuntimeError('pg_dump failed; no backup published')
        # Atomic no-overwrite publication even if another backup wins a race.
        os.link(temporary, output)
    finally:
        Path(temporary).unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['backup', 'restore-disposable'])
    parser.add_argument('--container', required=True)
    parser.add_argument('--database', required=True)
    parser.add_argument('--user', default='postgres')
    parser.add_argument('--file', type=Path, required=True)
    args = parser.parse_args()
    prefix = ['docker', 'exec', '-i', args.container]
    try:
        if args.action == 'backup':
            backup(args.file, prefix + ['pg_dump', '--format=custom', '--no-owner',
                '--username=' + args.user, '--dbname=' + args.database])
        else:
            if not args.database.startswith('restore_drill_'):
                parser.error('Restore target must start with restore_drill_ and must not exist')
            with args.file.open('rb') as stream:
                # createdb refuses existing DBs: never restore over existing data.
                subprocess.run(prefix + ['createdb', '--username=' + args.user, '--', args.database],
                    check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                subprocess.run(prefix + ['pg_restore', '--exit-on-error', '--single-transaction',
                    '--no-owner', '--no-acl', '--username=' + args.user, '--dbname=' + args.database],
                    stdin=stream, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(args.action + ': successful')
    except (OSError, RuntimeError, subprocess.CalledProcessError):
        parser.exit(1, args.action + ': failed; inspect service health/permissions privately\n')


if __name__ == '__main__':
    main()
