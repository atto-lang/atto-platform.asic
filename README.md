# Oreslang ASIC platform — generic-netlist verification only

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
