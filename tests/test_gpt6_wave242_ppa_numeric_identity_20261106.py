"""Host-only regression: ASIC PPA numbers are typed evidence, not truthiness."""
import copy
import math
import unittest

from tools.validate_ppa_evidence import Rejected, validate
from test_ppa_evidence import BASE


def mapped():
    return dict(copy.deepcopy(BASE), stage="CELL_MAPPED",
                library_sha256="e" * 64, corner="typical",
                equivalence_log_sha256="f" * 64, cell_area_um2=1.0)


class PpaNumericIdentityWave242(unittest.TestCase):
    def rejects(self, record):
        with self.assertRaises(Rejected):
            validate(record)

    def test_schema_and_digest_not_boolean_or_casefolded(self):
        self.assertTrue(validate(copy.deepcopy(BASE))["admitted_shape"])
        self.rejects(dict(BASE, schema_version=True))
        self.rejects(dict(BASE, rtl_sha256="A" * 64))
        self.rejects(dict(BASE, synth_log_sha256="d" * 63))

    def test_mapped_area_exact_numeric_boundary(self):
        good = mapped()
        self.assertTrue(validate(good)["admitted_shape"])
        self.assertFalse(validate(good)["silicon_measured"])
        for value in (True, False, -1, math.nan, math.inf, -math.inf, 10 ** 1000):
            with self.subTest(area=repr(value)):
                self.rejects(dict(good, cell_area_um2=value))
        self.assertTrue(validate(dict(good, cell_area_um2=0))["admitted_shape"])

    def test_slack_cannot_be_boolean_or_nonfinite(self):
        good = mapped()
        for value in (True, False, math.nan, math.inf, -math.inf, 10 ** 1000):
            with self.subTest(slack=repr(value)):
                self.rejects(dict(good, timing_slack_ns=value))
        self.assertTrue(validate(dict(good, timing_slack_ns=-0.25))["admitted_shape"])

    def test_power_estimate_requires_typed_value_and_provenance(self):
        good = dict(mapped(), estimated_power_mw=0.0,
                    switching_activity_sha256="1" * 64,
                    power_model_sha256="2" * 64)
        self.assertEqual(validate(good)["power_kind"], "MODEL_ESTIMATE")
        for value in (True, False, -0.001, math.nan, math.inf, -math.inf):
            with self.subTest(power=repr(value)):
                self.rejects(dict(good, estimated_power_mw=value))
        self.rejects(dict(good, power_model_sha256=""))


if __name__ == "__main__":
    unittest.main()
