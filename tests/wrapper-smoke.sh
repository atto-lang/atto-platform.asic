#!/usr/bin/env bash
set -euo pipefail
f=$(mktemp);trap 'rm -f "$f"' EXIT
if LIBERTY=none.lib bash scripts/synth-standard-cells.sh 'examples/add8.sv;evil' ores_add8 mapped.v >"$f" 2>&1;then echo 'accepted injection' >&2;exit 1;fi
grep -q 'Unsafe path' "$f"
if LIBERTY=none.lib bash scripts/synth-standard-cells.sh examples/add8.sv ores_add8 mapped.v >"$f" 2>&1;then echo 'accepted missing liberty' >&2;exit 1;fi
grep -q 'Missing source RTL or explicit LIBERTY' "$f"
echo 'ASIC_WRAPPER_GUARD_PASS'
