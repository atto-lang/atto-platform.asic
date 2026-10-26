#!/usr/bin/env bash
set -euo pipefail
# PDK-free generic standard-cell-neutral synthesis; NOT a technology-mapped circuit.
if [[ $# -ne 3 ]]; then echo 'Usage: synth-generic.sh INPUT.sv TOP OUTPUT.v' >&2; exit 2; fi
rtl=$1; top=$2; out=$3
repo_root="$(pwd -P)"
[[ "$repo_root" =~ ^/[A-Za-z0-9._/-]+$ ]] || { echo 'Unsafe repository root' >&2; exit 2; }
command -v realpath >/dev/null || { echo 'MISSING_TOOL: realpath' >&2; exit 3; }
validate_relative_path() {
  local path="$1" part cursor=""
  [[ "$path" =~ ^[A-Za-z0-9._-]+(/[A-Za-z0-9._-]+)*$ ]] || { echo 'Unsafe path' >&2; exit 2; }
  IFS='/' read -r -a parts <<<"$path"
  for part in "${parts[@]}"; do
    [[ "$part" != "." && "$part" != ".." ]] || { echo 'Unsafe path' >&2; exit 2; }
    cursor="${cursor:+$cursor/}$part"
    [[ ! -L "$cursor" ]] || { echo 'Symlink path rejected' >&2; exit 2; }
  done
}
validate_relative_path "$rtl"
validate_relative_path "$out"
if [[ ! "$top" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then echo 'Unsafe top' >&2; exit 2; fi
[[ -f "$rtl" && ! -L "$rtl" ]] || { echo 'Missing RTL' >&2; exit 2; }
rtl_real="$(realpath -- "$rtl")"
[[ "$rtl_real" == "$repo_root/"* ]] || { echo 'RTL escaped repository root' >&2; exit 2; }
out_parent="$(dirname -- "$out")"
test -d "$out_parent" || { echo 'Missing output directory' >&2; exit 2; }
out_parent_real="$(cd "$out_parent" && pwd -P)"
[[ "$out_parent_real" == "$repo_root" || "$out_parent_real" == "$repo_root/"* ]] ||
  { echo 'Output escaped repository root' >&2; exit 2; }
out_real="$out_parent_real/$(basename -- "$out")"
[[ "$out_real" =~ ^/[A-Za-z0-9._/-]+$ ]] || { echo 'Unsafe resolved output path' >&2; exit 2; }
[[ ! -e "$out_real" && ! -L "$out_real" ]] || { echo 'Refusing overwrite' >&2; exit 2; }
command -v yosys >/dev/null || { echo 'MISSING_TOOL: yosys' >&2; exit 3; }
yosys -Q -T -p "read_verilog -sv $rtl_real; hierarchy -check -top $top; synth -top $top; check -assert; write_verilog -noattr $out_real; stat"
[[ -s "$out_real" ]] || { echo 'Empty generic netlist' >&2; exit 1; }
echo 'ASIC_GENERIC_SYNTH_PASS_NOT_MAPPED'
