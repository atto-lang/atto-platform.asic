> **AI agent instructions (organization-wide):** Before working on code, issues, or pull requests, read and follow the [organization `AGENTS.md`](https://github.com/ores-truffle-oreslang/.github/blob/main/AGENTS.md), including its **merge-first stealth-development policy**. Honor any repository-local `AGENTS.md`, explicit holds, and GitHub-enforced rules.

# Oreslang ASIC platform — pre-PDK proof, not taped out

## AttoLang naming migration (2026-11-18)

**AttoLang** is the new public name for **Oreslang**. This `ores-truffle-oreslang/oreslang-platform.asic` repository is a legacy-named checkout. The corresponding AttoLang project for new work is [atto-lang/atto-platform.asic](https://github.com/atto-lang/atto-platform.asic). Do not assume that matching project names mean GitHub history, PRs, issues, code or feature completeness has been transferred. Hardware feature support requires real target proof; simulations and host-only tests are not ASIC execution.

The authoritative language specification is **[atto-spec](https://github.com/atto-lang/atto-spec)** (not old Oreslang README/spec prose); portable test fixtures belong in [atto-platform-conformance](https://github.com/atto-lang/atto-platform-conformance), and portable libraries in [atto-common-source](https://github.com/atto-lang/atto-common-source). The evolving language contracts include canonical `.atto` source, `snake_case` callable names, `borrow!`/`take!`/`copy!`/`copy!!`/`share!`, [implicit borrowing](https://github.com/atto-lang/atto-spec/blob/main/language/implicit-argument-borrow-v1.md), [file/module `define const` with guarded one-time `os.read_env`](https://github.com/atto-lang/atto-spec/blob/main/language/file-module-const-v1.md), and [bitwise `<<<`/`>>>`/`ashr` versus stream `<<`/`>>`](https://github.com/atto-lang/atto-spec/blob/main/language/bitwise-and-stream-operators-v1.md). These are **target rules**, not automatic execution claims for this repo.

Treat historical `.ores` fixtures, `oreslang-*` commands, package IDs, ABIs and examples below as compatibility instructions until verified changes supersede them. No Python project tooling/tests; prefer Rust support tooling. Compiler/runtime support and parity require exact source SHA/tree, target/toolchain, executed positive and negative guest tests; host-only or zero-step CI is **not executed** evidence.

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
