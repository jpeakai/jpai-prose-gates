"""Eval: does the list-semicolon-delimited-run message get a list promoted when the fixer refuses?

The fixture is the case RULES.md shows as reported: a semicolon-delimited run with no
colon lead-in. The fixer promotes a run only after a colon, because with none there is no
lead-in to keep, so it refuses and the finding stays. The message still asks for a bullet
list, which leaves the agent to supply the lead-in the fixer would not guess.

A promotion keeps every item and adds at most a word to the lead-in, so the recall is 90%
across this short document and the word count may grow by 30%.
"""

from __future__ import annotations

from _gate import SKILL, grade, task_for
from pytest_xharness_eval import CaseOutput, evalcase

FIXTURE = "semicolon_without_lead_in"  # evals/fixtures/semicolon_without_lead_in/
TARGET = "release-checklist.md"


@evalcase(task=task_for(TARGET), skill=SKILL, fixture=FIXTURE)
def eval_semicolon_list(output: CaseOutput) -> None:
    """Scope, nothing hidden, content kept, no compression, then the gate is clean."""
    grade(
        output,
        fixture=FIXTURE,
        target=TARGET,
        rule="list-semicolon-delimited-run",
        at_least=0.9,
        ratio=(0.9, 1.3),
    )
