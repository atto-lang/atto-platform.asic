# Oreslang ASIC platform — not qualified for tapeout

This repository owns ASIC physical implementation and evidence, not Oreslang source compilation. `examples/add8.sv` is an independent toolchain smoke fixture. No technology-mapped, placed/routed, signed-off, GDSII or fabricated-silicon evidence is claimed.

`scripts/synth-standard-cells.sh` requires an **explicit authorized Liberty** (`LIBERTY` env var); it can emit a technology-mapped netlist when appropriate tooling/PDK files are supplied, but **not** physical layout or signoff. `targets/sky130hd-research.json` deliberately leaves missing technology prerequisites null. `scripts/check-evidence.mjs` checks manifest shape, not artifact authenticity.

Local safety checks: `node --test tests/evidence.test.mjs` and `bash tests/wrapper-smoke.sh`. The actual standard-cell flow also requires a pinned approved technology library and separate OpenROAD/STA/DRC/LVS gates.

RFC: https://github.com/ores-truffle-oreslang/oreslang-common-source/pull/65
