#!/usr/bin/env bash
set -euo pipefail
# PDK-free generic standard-cell-neutral synthesis; NOT a technology-mapped circuit.
if [[ $# -ne 3 ]]; then echo 'Usage: synth-generic.sh INPUT.sv TOP OUTPUT.v' >&2; exit 2; fi
rtl=$1; top=$2; out=$3
for p in "$rtl" "$out"; do
  if [[ ! "$p" =~ ^[A-Za-z0-9_./][A-Za-z0-9_./-]*$ ]] || [[ "$p" == *..* ]]; then echo 'Unsafe path' >&2; exit 2; fi
done
if [[ ! "$top" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then echo 'Unsafe top' >&2; exit 2; fi
[[ -f "$rtl" ]] || { echo 'Missing RTL' >&2; exit 2; }
[[ ! -e "$out" ]] || { echo 'Refusing overwrite' >&2; exit 2; }
command -v yosys >/dev/null || { echo 'MISSING_TOOL: yosys' >&2; exit 3; }
yosys -Q -T -p "read_verilog -sv $rtl; hierarchy -check -top $top; synth -top $top; check -assert; write_verilog -noattr $out; stat"
[[ -s "$out" ]] || { echo 'Empty generic netlist' >&2; exit 1; }
echo 'ASIC_GENERIC_SYNTH_PASS_NOT_MAPPED'
