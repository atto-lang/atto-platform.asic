#!/usr/bin/env bash
set -euo pipefail
: "$PDK_NAME" "$PDK_DIR" "$LIBERTY_PATH" "$CLOCK_SDC" "$OPENROAD_BIN"
test -d "$PDK_DIR" && test -s "$LIBERTY_PATH" && test -s "$CLOCK_SDC" || { echo 'PDK/Liberty/SDC required' >&2; exit 2; }
command -v "$OPENROAD_BIN" >/dev/null || { echo 'OpenROAD required' >&2; exit 2; }
echo 'Physical backend intentionally gated until reviewed technology mapping, floorplan, DRC/LVS and timing recipe exists.' >&2
exit 2
