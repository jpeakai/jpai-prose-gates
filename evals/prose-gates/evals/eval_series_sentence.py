"""Eval: does the sentence-word-budget-exceeded message split a sentence that is mostly a series?

The fixture's long sentence carries one clause of action and two comma series, of
platforms and of runtimes. The clause estimate reads the series as clauses, per the
known overcount in PRS-0034, so the message asks for more sentences than the ideas
need. This case shows whether an agent follows the count, or groups the series instead.

Either way the content must survive, so the recall and ratio match the plain split case.
"""

from __future__ import annotations

from _gate import SKILL, grade, task_for
from pytest_xharness_eval import CaseOutput, evalcase

FIXTURE = "sentence_with_series"  # evals/fixtures/sentence_with_series/
TARGET = "supported-platforms.md"


@evalcase(task=task_for(TARGET), skill=SKILL, fixture=FIXTURE)
def eval_series_sentence(output: CaseOutput) -> None:
    """Scope, nothing hidden, content kept, no compression, then the gate is clean."""
    grade(
        output,
        fixture=FIXTURE,
        target=TARGET,
        rule="sentence-word-budget-exceeded",
        at_least=0.9,
        ratio=(0.9, 1.4),
    )
