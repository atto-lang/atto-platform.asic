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
