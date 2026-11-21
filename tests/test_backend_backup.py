"""Backups are private and only published after pg_dump succeeds."""
from pathlib import Path
import os
import stat
import sys
import tempfile
import unittest
from scripts.backend_backup import backup


class BackupTests(unittest.TestCase):
    def test_success_is_private_and_existing_destination_is_preserved(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / 'db.dump'
            backup(output, [sys.executable, '-c', 'import sys; sys.stdout.buffer.write(b"PGDMP-data")'])
            self.assertEqual(output.read_bytes(), b'PGDMP-data')
            self.assertEqual(stat.S_IMODE(output.stat().st_mode), 0o600)
            with self.assertRaises(FileExistsError):
                backup(output, [sys.executable, '-c', 'raise SystemExit(0)'])
            self.assertEqual(output.read_bytes(), b'PGDMP-data')
            self.assertEqual(list(Path(folder).iterdir()), [output])

    def test_failed_dump_does_not_publish_partial_file(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / 'failed.dump'
            with self.assertRaises(RuntimeError):
                backup(output, [sys.executable, '-c',
                    'import sys; sys.stdout.buffer.write(b"partial"); sys.exit(1)'])
            self.assertFalse(output.exists())
            self.assertEqual(list(Path(folder).iterdir()), [])
