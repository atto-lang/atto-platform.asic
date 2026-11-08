# atto-platform.asic

ASIC-targeted compilation research and hardware integration for AttoLang.

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

AttoLang is the public name; preserve existing Oreslang/.ores compatibility and use canonical .atto for new portable library source. This README defines scope, not feature readiness.

**Acceptance:** name exact source SHA/tree, runtime/toolchain, positive and negative checks and execution receipt before claiming support. Host-only tests and empty CI steps do not prove guest execution.
