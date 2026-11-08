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

## Repository ownership and migration (2026-11-08)

**Current home:** `ores-truffle-oreslang/oreslang-platform.asic`, in the Oreslang legacy organization. The public language name is **AttoLang**. Existing repo/CLI/package identifiers and supported `.ores` sources remain compatibility contracts pending separately tested migration.

- **Belongs here:** ASIC target profiles and hardware codegen/verification research.
- **Out of scope:** shipping hardware or treating RTL-only checks as full guest parity.
- **Organizational split:** [atto-lang](https://github.com/atto-lang) governs the language/compiler/runtime/target/parity ecosystem; [atto-co](https://github.com/atto-co) governs separately owned production cloud infrastructure, tenant management, billing, identity and deployment. Related `atto-*` repositories created independently must not be mistaken for a Git transfer.
- **Proposed initial transfer:** preserve this repository's GitHub numeric ID, original name/history and exact tree in a gated move to `atto-lang/oreslang-platform.asic`; no first-stage direct `atto-co` move is approved. Later product carve-outs require a new security and owner decision.

**Maintainer procedure:** coordinate in [migration issue #26](https://github.com/ores-truffle-oreslang/.github/issues/26) and consult [migration runbook draft #25](https://github.com/ores-truffle-oreslang/.github/pull/25). Identify source and target administrators, independent security reviewer, exact source commit SHA/tree and numeric repo ID; review branch protections, target permissions, open PRs/issues, tags/releases, workflows/runners, secrets/environments, packages, webhooks/Apps, Pages, submodules and consumers. Never mirror private source as a transfer shortcut. Perform an authorized GitHub ownership transfer, verify unchanged ID/tree/history and restored security, then update dependencies and run exact-head CI with **nonzero executed job steps**. `steps=[]`/`null` is `NOT_EXECUTED`; source-only/host-only runs do not establish compiler-backed AttoLang execution or target certification.
