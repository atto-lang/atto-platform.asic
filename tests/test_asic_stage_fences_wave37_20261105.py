"""Host-only ASIC PPA evidence shape tests; never silicon certification."""
import copy
import unittest

from tools.validate_ppa_evidence import Rejected, validate

BASE = {
    "schema_version": 1,
    "stage": "GENERIC_SYNTH",
    "rtl_sha256": "a" * 64,
    "netlist_sha256": "b" * 64,
    "library_sha256": "",
    "corner": "",
    "toolchain": "Yosys synthetic host",
    "constraints_sha256": "c" * 64,
    "synth_log_sha256": "d" * 64,
    "physical_log_sha256": "",
    "equivalence_log_sha256": "",
    "cell_area_um2": None,
    "timing_slack_ns": None,
    "estimated_power_mw": None,
    "switching_activity_sha256": "",
    "power_model_sha256": "",
}


class StageAndPowerFences(unittest.TestCase):
    def test_generic_synthesis_never_implies_physical_or_power_results(self):
        self.assertFalse(validate(copy.deepcopy(BASE))["silicon_measured"])
        for changes in (
            {"physical_log_sha256": "1" * 64},
            {"cell_area_um2": 0},
            {"timing_slack_ns": 0.0},
            {"estimated_power_mw": 0.0},
        ):
            with self.subTest(changes=changes):
                with self.assertRaises(Rejected):
                    validate({**BASE, **changes})

    def test_routed_negative_slack_is_admitted_but_not_certified(self):
        routed = {
            **BASE, "stage": "PLACED_ROUTED", "library_sha256": "e" * 64,
            "corner": "slow", "equivalence_log_sha256": "f" * 64,
            "cell_area_um2": 100, "physical_log_sha256": "1" * 64,
            "timing_slack_ns": -0.5,
        }
        self.assertEqual(validate(routed)["stage"], "PLACED_ROUTED")
        self.assertFalse(validate(routed)["silicon_measured"])
        for changes in (
            {"physical_log_sha256": ""},
            {"timing_slack_ns": None},
            {"equivalence_log_sha256": ""},
        ):
            with self.subTest(changes=changes):
                with self.assertRaises(Rejected):
                    validate({**routed, **changes})

    def test_power_requires_both_independent_digest_inputs(self):
        mapped = {
            **BASE, "stage": "CELL_MAPPED", "library_sha256": "e" * 64,
            "corner": "typical", "equivalence_log_sha256": "f" * 64,
            "cell_area_um2": 42, "estimated_power_mw": 0.25,
            "switching_activity_sha256": "1" * 64, "power_model_sha256": "2" * 64,
        }
        self.assertEqual(validate(mapped)["power_kind"], "MODEL_ESTIMATE")
        for field in ("switching_activity_sha256", "power_model_sha256"):
            with self.subTest(field=field):
                with self.assertRaises(Rejected):
                    validate({**mapped, field: ""})


if __name__ == "__main__":
    unittest.main()
