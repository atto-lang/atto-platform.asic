# ASIC readiness and restrictions

The mapped-cell script demands an explicitly authorized Liberty path, and no PDK is distributed in this repo. No FPGA run, placed-and-routed ASIC, timing signoff, DRC/LVS proof, GDSII signoff or fabricated chip is claimed.
The sky130hd profile deliberately has null technology prerequisites. The self-contained example is not evidence Oreslang emitted it.
Next acceptance gates: pin a licensed/approved PDK, STA corner + constraints, tech LEF and std-cell LEF, named OpenROAD-flow-scripts revision, mapped netlist, complete physical run, independent STA/DRC/LVS reports, and external foundry/tapeout authorization.
Evidence validator checks manifest shape only, not report authenticity.
Reference RFC: https://github.com/ores-truffle-oreslang/oreslang-common-source/pull/65
