"""Host-only ASIC PPA JSON parser ambiguity and byte denials."""
import json
from pathlib import Path
import tempfile
import unittest

from test_ppa_evidence import BASE
from tools.validate_ppa_evidence import Rejected, read_report, validate


class PpaJsonReaderWave244(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "ppa.json"

    def test_original_report_admitted_without_silicon_claim(self):
        self.path.write_text(json.dumps(BASE), encoding="utf-8")
        self.assertTrue(validate(read_report(self.path))["admitted_shape"])
        self.assertFalse(validate(read_report(self.path))["silicon_measured"])

    def test_duplicate_stage_member_is_denied_at_parse(self):
        raw = json.dumps(BASE)
        needle = '"stage": "GENERIC_SYNTH"'
        self.assertIn(needle, raw)
        self.path.write_text(raw.replace(
            needle, '"stage": "PLACED_ROUTED", ' + needle, 1), encoding="utf-8")
        with self.assertRaisesRegex(Rejected, "duplicate JSON member"):
            read_report(self.path)

    def test_duplicate_digest_member_is_denied(self):
        raw = json.dumps(BASE)
        needle = '"rtl_sha256": "' + "a" * 64 + '"'
        self.assertIn(needle, raw)
        self.path.write_text(raw.replace(needle, needle + ", " + needle, 1),
                             encoding="utf-8")
        with self.assertRaisesRegex(Rejected, "duplicate JSON member"):
            read_report(self.path)

    def test_nan_in_unknown_silicon_metric_is_denied(self):
        raw = json.dumps(BASE)
        self.assertIn('"cell_area_um2": null', raw)
        self.path.write_text(raw.replace('"cell_area_um2": null',
                                         '"cell_area_um2": NaN', 1), encoding="utf-8")
        with self.assertRaisesRegex(Rejected, "nonstandard JSON constant"):
            read_report(self.path)

    def test_invalid_utf8_is_not_silently_replaced(self):
        raw = json.dumps(BASE).encode("utf-8")
        self.path.write_bytes(raw.replace(b"mock Yosys", b"mock " + bytes([255]) + b"Yosys"))
        with self.assertRaises(UnicodeError):
            read_report(self.path)


if __name__ == "__main__":
    unittest.main()
