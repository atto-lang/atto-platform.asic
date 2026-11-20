"""PPA report shape regression tests; no authenticated silicon or physical signoff."""
import unittest
from tools.validate_ppa_evidence import Rejected, validate

SHA = lambda character: character * 64


def generic():
    return dict(
        schema_version=1, stage="GENERIC_SYNTH",
        rtl_sha256=SHA("a"), netlist_sha256=SHA("b"),
        library_sha256="", corner="", toolchain="yosys-host",
        constraints_sha256=SHA("c"), synth_log_sha256=SHA("d"),
        physical_log_sha256="", equivalence_log_sha256="",
        cell_area_um2=None, timing_slack_ns=None, estimated_power_mw=None,
        switching_activity_sha256="", power_model_sha256="")


def mapped():
    return {**generic(), "stage": "CELL_MAPPED",
            "library_sha256": SHA("e"), "corner": "slow",
            "equivalence_log_sha256": SHA("f"), "cell_area_um2": 0}


def routed():
    return {**mapped(), "stage": "PLACED_ROUTED",
            "physical_log_sha256": SHA("1"), "timing_slack_ns": -0.25}


class PpaEvidenceBoundaries(unittest.TestCase):
    def test_generic_synthesis_cannot_assert_mapped_or_physical_results(self):
        self.assertEqual(validate(generic())["power_kind"], "UNKNOWN")
        for field, value in (
                ("library_sha256", SHA("f")),
                ("corner", "slow"),
                ("physical_log_sha256", SHA("f")),
                ("cell_area_um2", 0),
                ("timing_slack_ns", 0),
                ("estimated_power_mw", 1)):
            with self.subTest(field=field), self.assertRaises(Rejected):
                validate({**generic(), field: value})

    def test_cell_mapping_requires_provenance_but_never_implies_routing(self):
        self.assertFalse(validate(mapped())["silicon_measured"])
        for field in ("library_sha256", "corner", "equivalence_log_sha256"):
            with self.subTest(field=field), self.assertRaises(Rejected):
                validate({**mapped(), field: ""})
        with self.assertRaises(Rejected):
            validate({**mapped(), "cell_area_um2": None})
        with self.assertRaises(Rejected):
            validate({**mapped(), "physical_log_sha256": SHA("1")})

    def test_routed_negative_slack_remains_valid_without_silicon_claims(self):
        response = validate(routed())
        self.assertEqual(response["stage"], "PLACED_ROUTED")
        self.assertFalse(response["silicon_measured"])
        self.assertEqual(response["power_kind"], "UNKNOWN")
        for mutation in (
                {"physical_log_sha256": ""},
                {"timing_slack_ns": None},
                {"timing_slack_ns": float("nan")},
                {"timing_slack_ns": float("inf")}):
            with self.subTest(mutation=mutation), self.assertRaises(Rejected):
                validate({**routed(), **mutation})

    def test_power_estimates_need_both_activity_and_model_hashes(self):
        powered = {**routed(), "estimated_power_mw": 0.0,
                   "switching_activity_sha256": SHA("2"),
                   "power_model_sha256": SHA("3")}
        self.assertEqual(validate(powered)["power_kind"], "MODEL_ESTIMATE")
        for field in ("switching_activity_sha256", "power_model_sha256"):
            with self.subTest(field=field), self.assertRaises(Rejected):
                validate({**powered, field: ""})
        with self.assertRaises(Rejected):
            validate({**powered, "estimated_power_mw": None})
        with self.assertRaises(Rejected):
            validate({**powered, "estimated_power_mw": -1})

    def test_boolean_nan_infinite_and_oversized_metrics_are_denied(self):
        for field in ("cell_area_um2", "timing_slack_ns", "estimated_power_mw"):
            for value in (True, float("nan"), float("inf"), -float("inf"), 10**1000):
                with self.subTest(field=field, value=str(value)), self.assertRaises(Rejected):
                    validate({**routed(), field: value})


if __name__ == "__main__":
    unittest.main()
