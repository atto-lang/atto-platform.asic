"""Hard-link and mode-fence regressions for shape-only ASIC evidence."""
import json
import os
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from tools import validate_ppa_evidence as gate
from test_ppa_evidence import BASE


class PpaLinkFenceTests(unittest.TestCase):
    def test_hardlinks_fail_before_parsing_then_recover_after_unlink(self):
        if not hasattr(os, "link"):
            self.skipTest("hardlinks unsupported")
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "ppa.json"
            alias = Path(temp) / "second.json"
            path.write_text(json.dumps(BASE), encoding="utf-8")
            self.assertEqual(gate.validate(gate.read_report(path))["stage"], "GENERIC_SYNTH")
            os.link(path, alias)
            for candidate in (path, alias):
                with self.assertRaisesRegex(gate.Rejected, "single-linked"):
                    gate.read_report(candidate)
            alias.unlink()
            self.assertEqual(gate.validate(gate.read_report(path))["stage"], "GENERIC_SYNTH")

    def test_mode_change_during_read_is_denied(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "ppa.json"
            path.write_text(json.dumps(BASE), encoding="utf-8")
            orig = os.fstat
            count = [0]
            def mutated(fd):
                st = orig(fd)
                count[0] += 1
                if count[0] != 2:
                    return st
                return SimpleNamespace(st_dev=st.st_dev, st_ino=st.st_ino,
                    st_size=st.st_size, st_nlink=st.st_nlink,
                    st_mode=st.st_mode ^ 0o200, st_mtime_ns=st.st_mtime_ns,
                    st_ctime_ns=st.st_ctime_ns)
            with patch.object(gate.os, "fstat", side_effect=mutated):
                with self.assertRaisesRegex(gate.Rejected, "changed during bounded read"):
                    gate.read_report(path)
            self.assertEqual(count[0], 2)


if __name__ == "__main__":
    unittest.main()
