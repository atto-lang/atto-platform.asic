# ASIC evidence stages (draft, **not** silicon PPA)

Tracks [ASIC issue #4](https://github.com/ores-truffle-oreslang/oreslang-platform.asic/issues/4)
and [org epic](https://github.com/ores-truffle-oreslang/.github/issues/5).

```sh
python3 tools/validate_ppa_evidence.py examples/generic-synth.example.json
python3 -m unittest discover -s tests -p 'test_*.py'
```

This validator admits only three *reporting* stages:
- `GENERIC_SYNTH`: tool-independent netlist only; no cell area, corner, Fmax or power.
- `CELL_MAPPED`: explicit target standard-cell Liberty SHA, corner, mapped
  area and independent equivalence-log SHA; no placement/routing claim.
- `PLACED_ROUTED`: further physical log and timing slack, **including negative
  slack**; a report may fail timing and must not hide that result.

Power is always a `MODEL_ESTIMATE`, only admitted when both switching-activity
and cell-power model hashes are supplied. `UNKNOWN` is valid and preferred to
invented milliwatts. A hash field does not prove that the artifact exists or
was produced correctly: verify raw logs, licensing and provenance independently.
This does not validate DRC, LVS, fabrication, silicon power, or tapeout. The
example contains dummy hashes for parsing only; it is not actual synthesis data.

Next: tie in HDL netlist equivalence, mapped OpenROAD/OpenSTA timing under a
clearly licensed open PDK, reproducible seed/corner/environment, and artifact
hash verification. No proprietary foundry collateral should be committed.
