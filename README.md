> **AI agent instructions (organization-wide):** Before working on code, issues, or pull requests, read and follow the [organization `AGENTS.md`](https://github.com/atto-lang/.github/blob/main/AGENTS.md), including its **merge-first stealth-development policy**. Honor any repository-local `AGENTS.md`, explicit holds, and GitHub-enforced rules.

# atto-platform.asic

ASIC-targeted compilation research and hardware integration for AttoLang.

## Naming migration and language authority

This repository is maintained at [atto-lang/atto-platform.asic](https://github.com/atto-lang/atto-platform.asic); use `https://github.com/atto-lang/atto-platform.asic.git` for Git remotes and canonical `.atto` source examples. The normative language contract is [atto-spec](https://github.com/atto-lang/atto-spec), with executable guest evidence tracked by [atto-platform-conformance](https://github.com/atto-lang/atto-platform-conformance). Follow current ownership, borrowing, effects, actor, and syntax rules there; do not infer implemented features from a README or unexecuted CI.

## Scope

Hardware compilation research, bounded language subsets, and silicon-facing verification.

## Compatibility and design

This package is intended to integrate with [AttoLang](https://github.com/atto-lang) while clearly separating portable language behavior from backend- and host-specific features. Document APIs, target restrictions, and security/trust boundaries.

## Development and verification

Refer to checked-in sources and CI workflows for verified build and test commands. Include platform-specific execution tests and publish exact-commit evidence before asserting backend parity or production readiness.

## Project status

This README describes the intended repository scope and does not imply implemented functionality or verified target coverage.

## Related

- [Language specification](https://github.com/atto-lang/atto-spec)
- [Platform conformance](https://github.com/atto-lang/atto-platform-conformance)

## Repository ownership and contribution routing

**Belongs here:** ASIC physical/design integration, silicon-target constraints, bounded actor/hardware designs and formal/RTL validation.

**Belongs elsewhere:** Source-level hardware lowering belongs in atto-source.hdl; FPGA-specific implementation in atto-platform.fpga; spec in atto-spec.

**Security and portability boundary:** Avoid presenting RTL simulation as fabricated silicon proof; document trusted toolchains, clock/reset timing, area/power budgets and fail-closed feature gates.

AttoLang is the canonical project name; new source, examples and documentation use `.atto` and the `atto-lang` repository organization. This README defines scope, not feature readiness.

**Acceptance:** name exact source SHA/tree, runtime/toolchain, positive and negative checks and execution receipt before claiming support. Host-only tests and empty CI steps do not prove guest execution.

## Migration and maintainer procedure

The canonical home is now `atto-lang/atto-platform.asic`. The archived Oreslang repository is historical, not a pending transfer destination. AttoLang is the language/compiler/runtime/target ecosystem; [atto-co](https://github.com/atto-co) owns separate production cloud infrastructure, tenant management, billing, identity and deployment.

For new language source, use the current `.atto` syntax from [atto-spec](https://github.com/atto-lang/atto-spec). Preserve pinned legacy `.ores` fixtures and their exact compiler/RTL provenance until replacement fixtures are compiler-generated and independently verified. Do not rename historical inputs or relabel evidence as newly generated.

For future ownership changes, verify authorization, repository identity, commit/tree, history, permissions, branch rules, CI runners, secrets/environments, packages, webhooks/Apps, Pages, submodules and downstream consumers. Distinguish a repository import from an ownership transfer; neither a source mirror nor a repository rename proves continuity of numeric identity or security settings. See the [historical migration issue](https://github.com/ores-truffle-oreslang/.github/issues/26) for context.

Generic RTL synthesis and host simulation do not establish ASIC signoff. A real physical flow requires reviewed PDK and Liberty inputs, constraints, mapped cells, timing closure, DRC/LVS and physical artifacts; the physical gate remains fail-closed until the required evidence exists. CI with zero executed steps is not execution evidence.
