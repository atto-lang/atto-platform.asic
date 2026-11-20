import copy
import unittest
from tools.validate_ppa_evidence import Rejected, validate

BASE=dict(schema_version=1,stage="GENERIC_SYNTH",rtl_sha256="a"*64,
 netlist_sha256="b"*64,library_sha256="",corner="",toolchain="mock Yosys",
 constraints_sha256="c"*64,synth_log_sha256="d"*64,
 physical_log_sha256="",equivalence_log_sha256="",
 cell_area_um2=None,timing_slack_ns=None,estimated_power_mw=None,
 switching_activity_sha256="",power_model_sha256="")


class PPATests(unittest.TestCase):
 def rejects(self, **patch):
  with self.assertRaises(Rejected):
   validate({**copy.deepcopy(BASE),**patch})

 def test_generic_synth_has_no_cell_ppa(self):
  self.assertEqual(validate(BASE)["power_kind"],"UNKNOWN")
  self.rejects(cell_area_um2=100)
  self.rejects(estimated_power_mw=1)
  self.rejects(physical_log_sha256="f"*64)

 def test_mapping_requires_cell_model_and_equivalence(self):
  mapped=dict(BASE,stage="CELL_MAPPED",library_sha256="e"*64,
   corner="slow_1v_125c",equivalence_log_sha256="f"*64,cell_area_um2=100)
  self.assertEqual(validate(mapped)["stage"],"CELL_MAPPED")
  self.rejects(**{**mapped,"equivalence_log_sha256":""})
  self.rejects(**{**mapped,"corner":""})

 def test_power_requires_activity_and_model(self):
  mapped=dict(BASE,stage="CELL_MAPPED",library_sha256="e"*64,
   corner="typical",equivalence_log_sha256="f"*64,cell_area_um2=100,
   estimated_power_mw=0.5,switching_activity_sha256="1"*64,
   power_model_sha256="2"*64)
  self.assertEqual(validate(mapped)["power_kind"],"MODEL_ESTIMATE")
  self.rejects(**{**mapped,"switching_activity_sha256":""})
  self.rejects(**{**mapped,"estimated_power_mw":float("nan")})

 def test_routed_evidence_keeps_negative_slack(self):
  routed=dict(BASE,stage="PLACED_ROUTED",library_sha256="e"*64,
   corner="slow",equivalence_log_sha256="f"*64,cell_area_um2=110,
   physical_log_sha256="1"*64,timing_slack_ns=-0.7)
  self.assertEqual(validate(routed)["stage"],"PLACED_ROUTED")
  self.assertFalse(validate(routed)["silicon_measured"])
  self.rejects(**{**routed,"physical_log_sha256":""})


 def test_oversized_integer_rejects_cleanly(self):
  self.rejects(cell_area_um2=10**1000)
  self.rejects(timing_slack_ns=-(10**1000))

if __name__=="__main__":
 unittest.main()
