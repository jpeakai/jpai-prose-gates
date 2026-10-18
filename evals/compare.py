"""Compare eval sweeps of two finding-message variants, case by case and model by model.

Each live sweep writes ``<cache>/report/history.jsonl``, one record per graded cell. Run
the variant under test in its own worktree or with its own cache directory, then hand the
cache roots here, the baseline first:

    uv run evals/compare.py .xharness_eval_cache ../variant/.xharness_eval_cache

The figures are the ones message quality moves: the pass rate, and the mean turns and
tool calls a cell took to reach a clean gate. A better message passes more cells in fewer
turns. Dry-run records carry no figures, so they are left out. Stdlib only.
"""

from __future__ import annotations

import argparse
import json
import logging
from collections import defaultdict
from pathlib import Path
from statistics import mean

log = logging.getLogger("evals.compare")

GRADED = ("pass", "fail", "error")


def load(cache: Path) -> dict[tuple[str, str], list[dict]]:
    """Every graded record under ``cache``, keyed by case and ``harness/model[--effort]``."""
    out: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for line in (cache / "report" / "history.jsonl").read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        rec = json.loads(line)
        if rec.get("verdict") not in GRADED:
            continue
        cell = f"{rec['harness']}/{rec['model']}" + (f"--{rec['effort']}" if rec.get("effort") else "")
        out[(rec["case"], cell)].append(rec)
    return out


def row(records: list[dict]) -> str:
    """One variant's figures for one case and cell."""
    if not records:
        return "     -"
    passed = sum(r["verdict"] == "pass" for r in records)
    cost = [r["estimated_cost_usd"] for r in records if r.get("estimated_cost_usd") is not None]
    return (
        f"{passed}/{len(records)} pass  "
        f"{mean(r['turns'] for r in records):5.1f} turns  "
        f"{mean(r['tool_calls'] for r in records):5.1f} tools  "
        f"${mean(cost) if cost else 0:.4f}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("caches", nargs="+", type=Path, help="cache roots, the baseline first")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    sweeps = [(str(c), load(c)) for c in args.caches]
    keys = sorted({k for _, s in sweeps for k in s})
    for case, cell in keys:
        log.info("%s [%s]", case, cell)
        for name, sweep in sweeps:
            log.info("  %-40s %s", name, row(sweep.get((case, cell), [])))


if __name__ == "__main__":
    main()
