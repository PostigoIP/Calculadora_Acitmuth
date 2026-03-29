import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


class GitHubPagesPackagingTests(unittest.TestCase):
    def test_pages_entry_files_exist(self):
        self.assertTrue((ROOT / "index.html").exists())
        self.assertTrue((ROOT / ".nojekyll").exists())

    def test_manifest_targets_root_entrypoint(self):
        manifest = json.loads((ROOT / "manifest.webmanifest").read_text())
        self.assertEqual(manifest["start_url"], "./")
        self.assertEqual(manifest["scope"], "./")


if __name__ == "__main__":
    unittest.main()
