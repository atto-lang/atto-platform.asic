#!/usr/bin/env bash
set -euo pipefail
# Requires authorized technology Liberty; emits mapped netlist only, no physical signoff.
if [[ $# -ne 3 ]]; then echo 'Usage: synth-standard-cells.sh INPUT.sv TOP OUTPUT.v (LIBERTY env required)' >&2; exit 2; fi
rtl=$1; top=$2; out=$3
: "\${LIBERTY:=}"
for p in "$rtl" "$out" "$LIBERTY"; do
 if [[ ! "$p" =~ ^[A-Za-z0-9_./][A-Za-z0-9_./-]*$ ]] || [[ "$p" == *..* ]]; then echo 'Unsafe path' >&2; exit 2; fi
done
if [[ ! "$top" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then echo 'Unsafe module name' >&2; exit 2; fi
if [[ ! -f "$rtl" || ! -f "$LIBERTY" ]]; then echo 'Missing source RTL or explicit LIBERTY cell library' >&2; exit 2; fi
if ! command -v yosys >/dev/null 2>&1; then echo 'MISSING_TOOL: yosys' >&2; exit 3; fi
if [[ -e "$out" ]]; then echo 'Refusing overwrite' >&2; exit 2; fi
yosys -Q -T -p "read_verilog -sv $rtl; hierarchy -check -top $top; synth -top $top; dfflibmap -liberty $LIBERTY; abc -liberty $LIBERTY; clean; write_verilog -noattr $out; stat -liberty $LIBERTY"
[[ -s "$out" ]] || { echo 'Empty mapped output' >&2; exit 1; }
echo 'ASIC_CELL_MAPPING_ONLY_PASS'
