"""Host-only ASIC PPA schema: provenance labels must not spoof log lines."""
import copy
import unittest

from tools.validate_ppa_evidence import Rejected, validate
from test_ppa_evidence import BASE


def mapped():
    return dict(copy.deepcopy(BASE), stage="CELL_MAPPED",
                library_sha256="e" * 64, corner="slow_1v_125c",
                equivalence_log_sha256="f" * 64, cell_area_um2=1.0)


class PrintablePpaProvenanceWave243(unittest.TestCase):
    def rejects(self, candidate):
        with self.assertRaises(Rejected):
            validate(candidate)

    def test_versioned_toolchain_rejects_control_and_blank_metadata(self):
        for bad in ("", "  ", "\t", "yosys\nBOARD_VERIFIED",
                    "yosys\rverified", "yosys\x00root", "yosys\u202efake"):
            with self.subTest(bad=repr(bad)):
                self.rejects(dict(copy.deepcopy(BASE), toolchain=bad))
        self.assertTrue(validate(dict(copy.deepcopy(BASE),
                                      toolchain="Yosys 0.45 + ABC"))["admitted_shape"])

    def test_mapped_corner_rejects_blank_and_multiline_spoofing(self):
        for bad in ("", "   ", "\t", "fast\npass", "slow\rverified",
                    "corner\x00hidden", "slow\u202efake"):
            with self.subTest(bad=repr(bad)):
                self.rejects(dict(mapped(), corner=bad))
        self.assertTrue(validate(mapped())["admitted_shape"])

    def test_generic_stage_allows_empty_corner_but_not_hidden_whitespace(self):
        self.assertTrue(validate(copy.deepcopy(BASE))["admitted_shape"])
        for bad in (" ", "\t", "\r\n", "\x00"):
            with self.subTest(bad=repr(bad)):
                self.rejects(dict(copy.deepcopy(BASE), corner=bad))

    def test_true_mapping_has_finite_results_without_silicon_claim(self):
        verdict = validate(mapped())
        self.assertEqual(verdict["stage"], "CELL_MAPPED")
        self.assertFalse(verdict["silicon_measured"])
        self.assertEqual(verdict["power_kind"], "UNKNOWN")


if __name__ == "__main__":
    unittest.main()
