import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import time
import unittest
import fcntl

spec = importlib.util.spec_from_file_location('artifacts', Path(__file__).parents[1]/'scripts/alva-artifacts.py')
a = importlib.util.module_from_spec(spec)
spec.loader.exec_module(a)


class RetentionTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        subprocess.run(['git', 'init', '-q', str(self.root)], check=True)

    def tearDown(self):
        self.tmp.cleanup()

    def file(self, name, old=True):
        p = self.root/name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(b'\x89PNG\r\n\x1a\nexample')
        if old:
            os.utime(p, (time.time()-90000,)*2)
        return p

    def test_age_preview_and_protected_data(self):
        old = self.file('evidence/old/a.png')
        recent = self.file('evidence/new/a.png', False)
        prod = self.file('.runtime/20260901T000000Z-ALVA082-production/data.bin')
        upload = self.file('.runtime/alva-uploads/a.png')
        isolated = self.file('.runtime/20260901T000000Z-ALVA082-browser/db/data')
        self.assertEqual(a.collect(self.root, active=set())['files'], 2)
        self.assertTrue(old.exists())
        a.collect(self.root, apply=True, active=set())
        self.assertFalse(old.exists())
        self.assertFalse(isolated.exists())
        self.assertTrue(all(p.exists() for p in [recent, prod, upload]))

    def test_tracked_symlinks_and_active_run(self):
        tracked = self.file('evidence/old/result.json')
        subprocess.run(['git', '-C', str(self.root), 'add', '.'], check=True)
        external = self.file('private/a.png')
        (self.root/'evidence/link').symlink_to(external.parent, target_is_directory=True)
        active = self.file('.runtime/acceptance/active/a.png')
        a.collect(self.root, apply=True, active={active.parent/'db'})
        self.assertTrue(all(p.exists() for p in [tracked, external, active]))

    def test_lock_protects_old_run(self):
        p = self.file('.runtime/acceptance/locked/a.png')
        lock = self.file('.runtime/acceptance/locked/.active')
        with lock.open('r') as handle:
            fcntl.flock(handle, fcntl.LOCK_EX)
            a.collect(self.root, apply=True, active=set())
            self.assertTrue(p.exists())
        a.collect(self.root, apply=True, active=set())
        self.assertFalse(p.exists())

    def test_consume_once_and_refuse_outside(self):
        p = self.file('.runtime/visual/check.png', False)
        self.assertTrue(a.consume(self.root, p)['image_url'].startswith('data:image/png;base64,'))
        self.assertFalse(p.exists())
        other = self.file('.runtime/alva-uploads/user.png')
        with self.assertRaises(ValueError):
            a.consume(self.root, other)
        self.assertTrue(other.exists())

    def test_recent_file_protects_whole_run(self):
        old = self.file('evidence/running/old.png')
        self.file('evidence/running/new.json', False)
        a.collect(self.root, apply=True, active=set())
        self.assertTrue(old.exists())


if __name__ == '__main__':
    unittest.main()
