#!/usr/bin/env bash
set -euo pipefail
# Requires authorized technology Liberty; emits mapped netlist only, no physical signoff.
if [[ $# -ne 3 ]]; then echo 'Usage: synth-standard-cells.sh INPUT.sv TOP OUTPUT.v (LIBERTY env required)' >&2; exit 2; fi
rtl=$1; top=$2; out=$3
LIBERTY=$(printenv LIBERTY || true)
repo_root="$(pwd -P)"
[[ "$repo_root" =~ ^/[A-Za-z0-9._/-]+$ ]] || { echo 'Unsafe repository root' >&2; exit 2; }
command -v realpath >/dev/null || { echo 'MISSING_TOOL: realpath' >&2; exit 3; }
validate_repo_path() {
  local path="$1" part cursor=""
  [[ "$path" =~ ^[A-Za-z0-9._-]+(/[A-Za-z0-9._-]+)*$ ]] || { echo 'Unsafe path' >&2; exit 2; }
  IFS='/' read -r -a parts <<<"$path"
  for part in "${parts[@]}"; do
    [[ "$part" != "." && "$part" != ".." ]] || { echo 'Unsafe path' >&2; exit 2; }
    cursor="${cursor:+$cursor/}$part"
    [[ ! -L "$cursor" ]] || { echo 'Symlink path rejected' >&2; exit 2; }
  done
}
validate_repo_path "$rtl"
validate_repo_path "$out"
[[ "$LIBERTY" =~ ^/[A-Za-z0-9._/-]+$ || "$LIBERTY" =~ ^[A-Za-z0-9._-]+(/[A-Za-z0-9._-]+)*$ ]] ||
  { echo 'Unsafe path' >&2; exit 2; }
if [[ ! "$top" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then echo 'Unsafe module name' >&2; exit 2; fi
if [[ ! -f "$rtl" || -L "$rtl" || ! -f "$LIBERTY" ]]; then echo 'Missing source RTL or explicit LIBERTY cell library' >&2; exit 2; fi
rtl_real="$(realpath -- "$rtl")"
[[ "$rtl_real" == "$repo_root/"* ]] || { echo 'RTL escaped repository root' >&2; exit 2; }
LIBERTY="$(realpath -- "$LIBERTY")"
[[ "$LIBERTY" =~ ^/[A-Za-z0-9._/-]+$ ]] ||
  { echo 'Unsafe resolved LIBERTY path' >&2; exit 2; }
out_parent="$(dirname -- "$out")"
test -d "$out_parent" || { echo 'Missing output directory' >&2; exit 2; }
out_parent_real="$(cd "$out_parent" && pwd -P)"
[[ "$out_parent_real" == "$repo_root" || "$out_parent_real" == "$repo_root/"* ]] ||
  { echo 'Output escaped repository root' >&2; exit 2; }
out_real="$out_parent_real/$(basename -- "$out")"
[[ "$out_real" =~ ^/[A-Za-z0-9._/-]+$ ]] || { echo 'Unsafe resolved output path' >&2; exit 2; }
if ! command -v yosys >/dev/null 2>&1; then echo 'MISSING_TOOL: yosys' >&2; exit 3; fi
if [[ -e "$out_real" || -L "$out_real" ]]; then echo 'Refusing overwrite' >&2; exit 2; fi
yosys -Q -T -p "read_verilog -sv $rtl_real; hierarchy -check -top $top; synth -top $top; dfflibmap -liberty $LIBERTY; abc -liberty $LIBERTY; clean; write_verilog -noattr $out_real; stat -liberty $LIBERTY"
[[ -s "$out_real" ]] || { echo 'Empty mapped output' >&2; exit 1; }
echo 'ASIC_CELL_MAPPING_ONLY_PASS'
