"""Snapshot one live eval sweep into evals/results/sweep.json, for the agent evals page.

The sweep's cache is git-ignored and changes with every run, so the page reads this
committed snapshot instead. For each cell it keeps the verdict, turns, tool calls,
seconds and estimated cost from the cache index, the file the agent left in its kept
build workspace, and the agent's own closing message.

Usage: uv run --only-group evals evals/snapshot.py [CACHE]   (default .xharness_eval_cache)
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path

log = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[1]
FIXTURES = PROJECT_ROOT / "evals" / "prose-gates" / "evals" / "fixtures"
CASES = PROJECT_ROOT / "evals" / "prose-gates" / "evals"
OUT = PROJECT_ROOT / "evals" / "results" / "sweep.json"


def target_of(fixture: str) -> str:
    """The one markdown file a fixture seeds, which the agent is asked to fix."""
    files = sorted(p.name for p in (FIXTURES / fixture).glob("*.md"))
    if len(files) != 1:
        raise ValueError(f"fixture {fixture} must hold exactly one markdown file, found {files}")
    return files[0]


def question_of(case: str) -> str:
    """The first docstring line of the eval module, without its "Eval: " prefix."""
    text = (CASES / f"{case}.py").read_text(encoding="utf-8")
    first = text.split('"""', 2)[1].strip().splitlines()[0]
    return first.removeprefix("Eval: ")


def closing_message(cache: Path, session_id: str) -> str:
    """The agent's own final message, from the cell's result.json."""
    found = list((cache / "results").rglob(f"{session_id}/result.json"))
    if len(found) != 1:
        raise FileNotFoundError(f"expected one result.json for session {session_id}, found {len(found)}")
    return (json.loads(found[0].read_text(encoding="utf-8")).get("final_text") or "").strip()


def relative(text: str, workspace: Path) -> str:
    """The message with this machine's absolute paths made relative, since the page is public."""
    for root in (workspace.resolve(), PROJECT_ROOT):
        text = text.replace(f"{root}/", "").replace(str(root), ".")
    if str(Path.home()) in text:
        raise ValueError(f"a closing message still names a path under {Path.home()}")
    return text


def snapshot(cache: Path) -> dict:
    cells = json.loads((cache / "report" / "index.json").read_text(encoding="utf-8"))["cells"]
    live = [c for c in cells if c["verdict"] != "dry-run"]
    if not live:
        raise ValueError(f"{cache} holds no live cells")
    out = []
    for c in sorted(live, key=lambda c: (c["case"], c["family_tier"], c["harness"], c["model"])):
        target = target_of(c["fixture"])
        workspace = cache / "build" / f"{c['case']}-{c['harness']}-{c['model']}"
        out.append(
            {
                "case": c["case"],
                "question": question_of(c["case"]),
                "fixture": c["fixture"],
                "target": target,
                "harness": c["harness"],
                "model": c["model"],
                "tier": c["family_tier"],
                "verdict": c["verdict"],
                "turns": c["turns"],
                "tool_calls": c["tool_calls"],
                "seconds": round(c["duration_ms"] / 1000),
                "cost_usd": round(c["estimated_cost_usd"] or 0.0, 4),
                "rewrite": (workspace / target).read_text(encoding="utf-8"),
                "closing_message": relative(closing_message(cache, c["session_id"]), workspace),
            }
        )
    return {"swept_on": max(c["at"] for c in live)[:10], "cells": out}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("cache", nargs="?", default=".xharness_eval_cache", type=Path)
    parser.add_argument("-v", "--verbose", action="store_true", help="debug logging")
    parser.add_argument("-q", "--quiet", action="store_true", help="errors only")
    args = parser.parse_args()
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.ERROR if args.quiet else logging.INFO)
    data = snapshot(args.cache)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    log.info("wrote %s cells to %s", len(data["cells"]), OUT.relative_to(PROJECT_ROOT))


if __name__ == "__main__":
    main()
