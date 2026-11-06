#!/usr/bin/env python3
"""ASIC PPA reporting preflight. Does not validate physical evidence itself."""
import json
import os
import stat
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



MAX_REPORT_BYTES = 65536


def _unique_json_members(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise Rejected(f"duplicate JSON member: {key}")
        result[key] = value
    return result


def _reject_non_json_constant(value):
    raise Rejected(f"nonstandard JSON constant: {value}")


def read_report(path):
    """Read only a bounded regular file through one no-follow descriptor.

    Reject FIFO/device reads, final-component symlinks, ambiguous duplicate
    JSON members and nonstandard NaN/Infinity. This is shape admission, not
    provenance authentication or a secure filesystem sandbox.
    """
    if not hasattr(os, "O_NOFOLLOW") or not hasattr(os, "O_NONBLOCK"):
        raise Rejected("safe regular-file admission unsupported on this host")
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        metadata = os.fstat(fd)
        if not stat.S_ISREG(metadata.st_mode):
            raise Rejected("report must be a regular file")
        if not 0 <= metadata.st_size <= MAX_REPORT_BYTES:
            raise Rejected("report exceeds 64 KiB")
        chunks = []
        remaining = MAX_REPORT_BYTES + 1
        while remaining:
            block = os.read(fd, min(16384, remaining))
            if not block:
                break
            chunks.append(block)
            remaining -= len(block)
        if remaining == 0:
            raise Rejected("report exceeds 64 KiB")
        # A bounded read is not sufficient if the same input inode changes
        # between open/stat and EOF. Match the FPGA report reader's
        # regular-file lifecycle fence before parsing any evidence.
        after = os.fstat(fd)
        if (after.st_dev != metadata.st_dev or
                after.st_ino != metadata.st_ino or
                after.st_size != metadata.st_size or
                after.st_mtime_ns != metadata.st_mtime_ns or
                after.st_ctime_ns != metadata.st_ctime_ns or
                sum(map(len, chunks)) != metadata.st_size):
            raise Rejected("report changed during bounded read")
    finally:
        os.close(fd)
    return json.loads(b"".join(chunks).decode("utf-8"),
                      object_pairs_hook=_unique_json_members,
                      parse_constant=_reject_non_json_constant)


def main(argv):
    if len(argv) != 2:
        print("usage: validate_ppa_evidence.py report.json", file=sys.stderr)
        return 64
    try:
        path = Path(argv[1])
        print(json.dumps(validate(read_report(path)), sort_keys=True))
        return 0
    except (OSError, ValueError, UnicodeError, RecursionError) as exc:
        print(f"REJECTED: {exc}", file=sys.stderr)
        return 65


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
