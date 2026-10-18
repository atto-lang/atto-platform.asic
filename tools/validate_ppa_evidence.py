#!/usr/bin/env python3
"""ASIC PPA reporting preflight. Does not validate physical evidence itself."""
import json
import math
import re
import sys
from pathlib import Path

DIGEST = re.compile(r"^[0-9a-f]{64}$")
KEYS = {"schema_version", "stage", "rtl_sha256", "netlist_sha256",
        "library_sha256", "corner", "toolchain", "constraints_sha256",
        "synth_log_sha256", "physical_log_sha256", "equivalence_log_sha256",
        "cell_area_um2", "timing_slack_ns", "estimated_power_mw",
        "switching_activity_sha256", "power_model_sha256"}


class Rejected(ValueError):
    pass


def require(test, message):
    if not test:
        raise Rejected(message)


def digest(text, mandatory=False):
    return type(text) is str and (bool(DIGEST.fullmatch(text)) or
                                   (not mandatory and not text))


def finite(value):
    return type(value) in (int, float) and -sys.float_info.max <= value <= sys.float_info.max and math.isfinite(value)


def validate(info):
    require(isinstance(info, dict) and set(info) == KEYS, "missing/unknown PPA fields")
    require(type(info["schema_version"]) is int and info["schema_version"] == 1,
            "unknown schema")
    stage = info["stage"]
    require(type(stage) is str and stage in {"GENERIC_SYNTH", "CELL_MAPPED", "PLACED_ROUTED"},
            "unknown ASIC evidence stage")
    for name in ("rtl_sha256", "netlist_sha256", "constraints_sha256", "synth_log_sha256"):
        require(digest(info[name], True), f"{name} requires exact SHA-256")
    for name in ("library_sha256", "physical_log_sha256", "equivalence_log_sha256",
                 "switching_activity_sha256", "power_model_sha256"):
        require(digest(info[name]), f"bad {name}")
    require(isinstance(info["toolchain"], str) and 0 < len(info["toolchain"]) <= 256,
            "versioned toolchain required")
    require(isinstance(info["corner"], str) and len(info["corner"]) <= 128,
            "corner must be a bounded string")
    area, slack, power = (info["cell_area_um2"], info["timing_slack_ns"],
                          info["estimated_power_mw"])
    require(area is None or (finite(area) and area >= 0), "invalid area")
    require(slack is None or finite(slack), "invalid timing slack")
    require(power is None or (finite(power) and power >= 0), "invalid power estimate")
    if stage == "GENERIC_SYNTH":
        require(not info["library_sha256"] and not info["corner"] and
                not info["physical_log_sha256"] and
                area is None and slack is None and power is None,
                "generic synthesis cannot imply cell mapping/physical PPA")
    else:
        require(info["library_sha256"] and info["corner"] and
                info["equivalence_log_sha256"] and area is not None,
                "mapped ASIC metrics require standard-cell library, corner, equivalence, area")
        if stage == "PLACED_ROUTED":
            require(info["physical_log_sha256"] and slack is not None,
                    "routed ASIC PPA needs physical log and timing slack")
        else:
            require(not info["physical_log_sha256"],
                    "cell-mapped stage cannot claim placed/routed results")
    if power is not None:
        require(bool(info["switching_activity_sha256"]) and
                bool(info["power_model_sha256"]),
                "power estimate needs justified activity and power library")
    else:
        require(not info["switching_activity_sha256"] and
                not info["power_model_sha256"],
                "orphaned power estimation provenance")
    return {"admitted_shape": True, "stage": stage,
            "power_kind": "MODEL_ESTIMATE" if power is not None else "UNKNOWN",
            "silicon_measured": False}



def unique_json_fields(pairs):
    """Reject ambiguous duplicate JSON keys, including in nested evidence objects."""
    obj = {}
    for key, value in pairs:
        if key in obj:
            raise Rejected(f"duplicate JSON field: {key}")
        obj[key] = value
    return obj


def main(argv):
    if len(argv) != 2:
        print("usage: validate_ppa_evidence.py report.json", file=sys.stderr)
        return 64
    try:
        path = Path(argv[1])
        if path.stat().st_size > 65536:
            raise Rejected("manifest too large")
        print(json.dumps(validate(json.loads(path.read_text(encoding="utf8"), object_pairs_hook=unique_json_fields)),
                         sort_keys=True))
        return 0
    except (OSError, ValueError, UnicodeError) as exc:
        print(f"REJECTED: {exc}", file=sys.stderr)
        return 65


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
