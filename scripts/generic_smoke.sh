#!/usr/bin/env bash
set -euo pipefail
for x in iverilog vvp yosys sha256sum; do
  command -v "$x" >/dev/null || { echo "REQUIRED_TOOL_MISSING: $x" >&2; exit 2; }
done
mkdir -p build
yosys -Q -T -l build/generic-synth.log -p 'read_verilog fixtures/add8.v; hierarchy -check -top add8; synth -top add8; check -assert; stat; write_verilog -noattr build/add8_generic.v'
test -s build/add8_generic.v
iverilog -g2012 -s add8_tb -o build/netlist-sim build/add8_generic.v fixtures/add8_tb.sv
vvp build/netlist-sim | tee build/netlist-sim.log
grep -q 'PASS: ASIC platform fixture 65536 simulation vectors' build/netlist-sim.log
# Capture formal gate stdout and its error text without masking a failure.
bash scripts/equivalence_gate.sh fixtures/add8.v build/add8_generic.v 2>&1 | tee build/equivalence-positive.log
test -s build/equivalence-positive.log
grep -Fq 'Equivalence successfully proven!' build/equivalence-positive.log
grep -Fq 'PASS: Yosys 8-bit combinational functional equivalence' build/equivalence-positive.log
bash scripts/test_equivalence_gate.sh
sha256sum fixtures/add8.v build/add8_generic.v > build/sha256.txt
echo 'PASS: generic gate netlist only. NOT Liberty mapped; NOT placed/routed; NOT silicon.'
