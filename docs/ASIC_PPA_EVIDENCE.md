# ASIC performance, power and area (PPA) evidence protocol

Status: **design only**. Neither simulation, generic synthesis, netlist emission, place-and-route, DRC/LVS nor tapeout implies fabricated qualified silicon. This repository contains no PDK and must not imply foundry support.

## Trust and correctness layers
1. Validate Oreslang-to-RTL admission and complete reference-function equivalence on admitted finite designs.
2. Simulate generated RTL (including reset, stalls, signedness, overflow, bank collisions).
3. Independently establish netlist-vs-RTL equivalence. If not actually established, mark `NOT_VERIFIED`.
4. Synthesize under pinned standard-cell library and timing constraint; capture cell area and worst slack. Generic tech-independent netlist gate count is **not** silicon area.
5. For actual physical-design experiments, report floorplan/density, placement, routing, congestion, timing corners, RC extraction, antenna checks and DRC/LVS **only** where those steps ran.
6. Power is a separate measured or explicitly estimated metric; require library corner, netlist/parasitics and justified switching activity. Without these report `UNKNOWN`, not zero.

## Experiment factors
- Exact bit-width vs wider equivalent datapath; include sign/overflow cases.
- Pipeline depth and documented initiation interval vs added registers and clock requirements.
- Unroll factor vs duplicated adders/multipliers and routing burden.
- Memory banking vs port count and actual SRAM macro availability; BRAM terminology does not transfer directly to ASIC macros.

## Provenance/reproducibility
Report exact RTL/netlist/tool/input hashes, PDK and cell-library legal usage, corner, voltage, temperature, clock, IO loads, place/route seed, unit conventions, raw logs and equivalence outcome. Sensitive licensed PDKs, macros and foundry data must **not** be committed to this repository or transferred to an unapproved test org.

## Completion criteria
- [ ] Machine-validated report schema with multi-stage `UNAVAILABLE`/FAIL and evidence labels
- [ ] Gate-level / RTL simulation and a defensible equivalence result
- [ ] Repeatable mapped-cell area and timing reports at documented conditions
- [ ] Switching-activity-backed power method before any watts/mW claim
- [ ] Report separate readiness statuses; no silicon/tapeout certification claim

Tracking: https://github.com/ores-truffle-oreslang/oreslang-platform.asic/issues/4
