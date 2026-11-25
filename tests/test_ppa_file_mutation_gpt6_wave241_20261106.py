"""Adversarial ASIC PPA report file admission, not physical or silicon proof."""
import json
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from tools import validate_ppa_evidence as gate
from test_ppa_evidence import BASE


class BoundedPpaReportLifecycleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "ppa.json"
        self.path.write_text(json.dumps(BASE), encoding="utf-8")

    def test_stable_regular_report_is_admitted_without_measured_silicon_claim(self):
        parsed = gate.read_report(self.path)
        verdict = gate.validate(parsed)
        self.assertTrue(verdict["admitted_shape"])
        self.assertFalse(verdict["silicon_measured"])

    def test_changed_timestamp_with_identical_byte_count_is_denied(self):
        native = os.fstat
        calls = [0]
        def fstat_mutated(fd):
            value = native(fd)
            calls[0] += 1
            if calls[0] != 2:
                return value
            return SimpleNamespace(
                st_dev=value.st_dev, st_ino=value.st_ino,
                st_size=value.st_size, st_mtime_ns=value.st_mtime_ns + 1,
                st_ctime_ns=value.st_ctime_ns, st_mode=value.st_mode,
                st_nlink=value.st_nlink)
        with patch.object(gate.os, "fstat", side_effect=fstat_mutated):
            with self.assertRaisesRegex(gate.Rejected, "changed during bounded read"):
                gate.read_report(self.path)
        self.assertEqual(calls[0], 2)

    def test_early_eof_on_a_regular_file_is_denied(self):
        # This simulates truncation after the initial fstat but before reading.
        with patch.object(gate.os, "read", return_value=b""):
            with self.assertRaisesRegex(gate.Rejected, "changed during bounded read"):
                gate.read_report(self.path)

    def test_exact_64k_input_budget_and_one_byte_over(self):
        raw = json.dumps(BASE).encode("utf-8")
        self.assertLess(len(raw), gate.MAX_REPORT_BYTES)
        self.path.write_bytes(raw + b" " * (gate.MAX_REPORT_BYTES - len(raw)))
        self.assertTrue(gate.validate(gate.read_report(self.path))["admitted_shape"])
        with self.path.open("ab") as stream:
            stream.write(b" ")
        with self.assertRaisesRegex(gate.Rejected, "exceeds 64 KiB"):
            gate.read_report(self.path)


if __name__ == "__main__":
    unittest.main()
