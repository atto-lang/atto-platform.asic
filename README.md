# Oreslang ASIC platform — pre-PDK proof, not taped out

This repository owns technology mapping and eventual physical verification of **the same compiler-emitted SystemVerilog** used by `oreslang-platform.fpga`. Its `generated/add8.generated.sv` fixture is byte-for-byte pinned to `oreslang-source.hdl`'s source-derived golden artifact; `tests/provenance.test.mjs` checks SHA-256 and rejects forged completion claims.

**Available now:** source/RTL provenance, generic technology-independent gate synthesis, safe parameter entrypoint, explicit Liberty-required `scripts/synth-standard-cells.sh` for research libraries. Tests are documented as gates only after CI completes.

**NOT achieved:** authorized or installed PDK; technology-mapped design in a named process corner; timing/power reports; floorplan/place-route; DRC; LVS; GDS signoff; fabrication; tapeout.

```sh
node --test tests/provenance.test.mjs
bash tests/wrapper-smoke.sh
mkdir -p outputs
bash scripts/synth-generic.sh generated/add8.generated.sv ores_add8 outputs/add8.generic.v
# Mapping requires an authorized PDK Liberty file; not shipped:
LIBERTY=path/to/authorized.lib bash scripts/synth-standard-cells.sh generated/add8.generated.sv ores_add8 outputs/add8.mapped.v
```

A `signoff` evidence manifest must contain STA/DRC/LVS/GDS and constraints hashes; the manifest checker validates structure, **not authenticity or passing results**. Never infer tapeout-readiness from this step.

**Physical-design finish line:** pin legal PDK version/corners, LEF/Liberty and OpenROAD toolchain; reproducible RTL-to-GDS; independent timing/DRC/LVS review; approval by the foundry/process owner. For real manufacturing, obtain DFM/waiver and process-specific review. Cross-repo source and RTL digest: `26d446e1d903edca9691d37fc55c946033b590687468449103507c61b7026e80`, `7888f715405fb1207ee4988d9b9cf9cd03ecc9eeca58b85782654d46104e01cd`.

## Existing generic smoke gate


This platform repo consumes RTL; it does **not** implement the Oreslang
language compiler or assert that an ASIC is fabricated.
See [common-source hardware contract PR #65](https://github.com/ores-truffle-oreslang/oreslang-common-source/pull/65).

The checked-in illustrative \`add8\` fixture is synthesizable with Yosys.
\`bash scripts/generic_smoke.sh\` requires Yosys, Icarus and vvp and emits
a **technology-independent generic gate netlist**, simulating all 65,536
input combinations **against the synthesized netlist**. Missing tools fail.
Workflow artifacts retain simulation logs, synthesis logs and digests.
This is only an H0/H1-adjacent gate: the fixture is not attested as coming
from the current compiler revision without cross-repo provenance.

No Liberty cell library, PDK, SDC, mapped cells, OpenROAD implementation,
hold/setup closure, DRC/LVS, signoff or GDSII is demonstrated.
\`scripts/physical_gate.sh\` fails closed until the complete reviewed PDK flow
exists. Never conflate generic logic synthesis with a real ASIC tapeout.


## Two-stage RTL composition host regression

A Rust 2021 runner (`tools/add8_pipeline_gate.rs`) drives Icarus to simulate **two real `ores_add8` modules in sequence** for all 65,536 combinations of the first two input bytes, with a deterministic third byte. It checks both stages against independently computed 8-bit modular arithmetic and fails unless the simulator exits successfully and emits an exact marker. The Rust unit test checks the host oracle. CI installs Icarus and executes both tests. This is simulation of the pinned reference RTL, **not** fresh compiler generation, ASIC timing/signoff, FPGA board validation, or silicon measurement.
