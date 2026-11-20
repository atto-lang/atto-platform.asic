#!/usr/bin/env bash
set -euo pipefail
f=$(mktemp);trap 'rm -f "$f"' EXIT
if LIBERTY=none.lib bash scripts/synth-standard-cells.sh 'examples/add8.sv;evil' ores_add8 mapped.v >"$f" 2>&1;then echo 'accepted injection' >&2;exit 1;fi
grep -q 'Unsafe path' "$f"
if LIBERTY=none.lib bash scripts/synth-standard-cells.sh examples/add8.sv ores_add8 mapped.v >"$f" 2>&1;then echo 'accepted missing liberty' >&2;exit 1;fi
grep -q 'Missing source RTL or explicit LIBERTY' "$f"
outside="$(mktemp)"
ln -s "$outside" build-escape.sv
trap 'rm -f "$f" "$outside" build-escape.sv' EXIT
if bash scripts/synth-generic.sh build-escape.sv ores_add8 mapped.v >"$f" 2>&1;then echo 'generic symlink input accepted' >&2;exit 1;fi
grep -q 'Symlink path rejected' "$f"
outside_dir="$(mktemp -d)"
ln -s "$outside_dir" build-escape-dir
trap 'rm -f "$f" "$outside" build-escape.sv build-escape-dir; rm -rf "$outside_dir"' EXIT
if bash scripts/synth-generic.sh examples/add8.sv ores_add8 build-escape-dir/mapped.v >"$f" 2>&1; then
  echo 'generic symlink output parent accepted' >&2
  exit 1
fi
grep -q 'Symlink path rejected' "$f"
echo 'ASIC_WRAPPER_GUARD_PASS'
