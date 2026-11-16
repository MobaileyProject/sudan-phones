"""Validate real skill package failure modes without external dependencies."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/check_skills.py'


class SkillPackagesTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.skills = self.root / '.agents/skills'
        self.skills.mkdir(parents=True)
        self.package = self.skills / 'example'
        self.package.mkdir()
        (self.package / 'SKILL.md').write_text(
            '---\nname: example\ndescription: Use when testing a package.\n---\n# Example\n')
        self.manifest = {'version': 1, 'skills': [{'name': 'example', 'kind': 'custom'}]}
        self.save()

    def save(self):
        (self.skills / 'manifest.json').write_text(json.dumps(self.manifest))

    def check(self):
        return subprocess.run([sys.executable, str(SCRIPT), '--root', str(self.root)],
                              capture_output=True, text=True)

    def test_valid_package_and_name_description_discovery(self):
        result = self.check()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('1 skill', result.stdout)
        (self.package / 'SKILL.md').write_text('---\nname: wrong-name\n---\n# Example\n')
        result = self.check()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('description', result.stderr)
        self.assertIn('name', result.stderr)

    def test_empty_and_unsupported_description_scalars_fail(self):
        for description in ('\nextra: something', '>', '[not, scalar]', '{invalid: mapping}'):
            with self.subTest(description=description):
                (self.package / 'SKILL.md').write_text(
                    '---\nname: example\ndescription: ' + description + '\n---\n# Example\n')
                result = self.check()
                self.assertNotEqual(result.returncode, 0, result.stdout)
                self.assertIn('description', result.stderr)

    def test_missing_reference_and_unlisted_package_fail(self):
        with (self.package / 'SKILL.md').open('a') as output:
            output.write('\nRead [guide](upstream/GUIDE.md).\n')
        self.assertIn('GUIDE.md', self.check().stderr)
        (self.package / 'upstream').mkdir()
        (self.package / 'upstream/GUIDE.md').write_text('Guide\n')
        self.assertEqual(self.check().returncode, 0)
        extra = self.skills / 'unlisted'
        extra.mkdir()
        (extra / 'SKILL.md').write_text('---\nname: unlisted\ndescription: Other\n---\n')
        self.assertNotEqual(self.check().returncode, 0)
        self.assertIn('unlisted', self.check().stderr)

    def test_upstream_integrity_revision_and_license(self):
        payload = self.package / 'upstream'
        payload.mkdir()
        (payload / 'GUIDE.md').write_text('Guide\n')
        (payload / 'LICENSE').write_text('License\n')
        digest = hashlib.sha256()
        for path in sorted(payload.rglob('*')):
            if path.is_file():
                digest.update(path.relative_to(payload).as_posix().encode() + b'\0')
                digest.update(path.read_bytes() + b'\0')
        self.manifest['skills'][0].update({
            'kind': 'upstream', 'source': {'repo': 'owner/repository', 'revision': 'a' * 40,
                                          'path': 'skills/example'},
            'payload_sha256': digest.hexdigest(), 'license_files': ['upstream/LICENSE']
        })
        self.save()
        self.assertEqual(self.check().returncode, 0, self.check().stderr)
        (payload / 'GUIDE.md').write_text('Unexpected changed instructions\n')
        self.assertIn('integrity', self.check().stderr)
        (payload / 'LICENSE').unlink()
        self.assertIn('license', self.check().stderr.lower())
        self.manifest['skills'][0]['source']['revision'] = 'main'
        self.save()
        self.assertIn('revision', self.check().stderr)

    def test_symlink_and_traversal_reference_fail(self):
        outside = self.root / 'outside.md'
        outside.write_text('Outside\n')
        (self.package / 'linked.md').symlink_to(outside)
        self.assertIn('symlink', self.check().stderr)
        (self.package / 'linked.md').unlink()
        with (self.package / 'SKILL.md').open('a') as output:
            output.write('\n[Escape](../../../../outside.md)\n')
        self.assertNotEqual(self.check().returncode, 0)
        self.assertIn('reference', self.check().stderr)


if __name__ == '__main__':
    unittest.main()
