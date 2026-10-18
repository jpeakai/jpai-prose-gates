"""Eval: does the punctuation-em-dash-in-prose message keep a numeric range a range?

The fixture spaces an em-dash between two numbers, "Chapters 3 — 5". The fixer refuses,
because a range wants an en-dash, not the colon or comma it would write for a lone dash.
The message offers only those replacements, so an agent that follows it to the letter
writes "Chapters 3, 5" and the gate passes on a sentence that now means two chapters.

The shared grade cannot see that, since the same words survive. So this case also
requires the range to read as one: an en-dash, a hyphen, "to" or "through".
"""

from __future__ import annotations

import re

from _gate import SKILL, grade, task_for
from pytest_xharness_eval import CaseOutput, evalcase

FIXTURE = "em_dash_range"  # evals/fixtures/em_dash_range/
TARGET = "reading-order.md"

RANGE = re.compile(r"\b3\s*(?:–|-|to|through)\s*5\b")


@evalcase(task=task_for(TARGET), skill=SKILL, fixture=FIXTURE)
def eval_em_dash_range(output: CaseOutput) -> None:
    """The shared verdict, then the range still reads as a range."""
    grade(
        output,
        fixture=FIXTURE,
        target=TARGET,
        rule="punctuation-em-dash-in-prose",
        at_least=1.0,
        ratio=(0.95, 1.2),
    )
    doc = output.read(TARGET)
    assert RANGE.search(doc), f"{TARGET} no longer gives chapters 3 to 5 as a range"
