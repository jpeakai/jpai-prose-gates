"""Eval: does the paragraph-sentence-budget-exceeded message get a wall of text broken well?

The fixture is one paragraph over the sentence budget, about setup and then review. The
rule has no fixer, per PRS-0030, because where a paragraph breaks is a judgement about
its topics. Its message counts the topics and names the sentences to break after.

Following the message changes no word at all, only blank lines, so this case is the
strictest: every content word stays, and the word count may move by a heading at most.
"""

from __future__ import annotations

from _gate import SKILL, grade, task_for
from pytest_xharness_eval import CaseOutput, evalcase

FIXTURE = "paragraph_over_budget"  # evals/fixtures/paragraph_over_budget/
TARGET = "onboarding.md"


@evalcase(task=task_for(TARGET), skill=SKILL, fixture=FIXTURE)
def eval_paragraph_break(output: CaseOutput) -> None:
    """Scope, nothing hidden, content kept, no compression, then the gate is clean."""
    grade(
        output,
        fixture=FIXTURE,
        target=TARGET,
        rule="paragraph-sentence-budget-exceeded",
        at_least=1.0,
        ratio=(0.95, 1.25),
    )
