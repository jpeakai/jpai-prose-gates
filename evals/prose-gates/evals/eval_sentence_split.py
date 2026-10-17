"""Eval: does the sentence-word-budget-exceeded message get a long sentence split, not cut?

The fixture holds one sentence of several clauses, about twice the word budget, between
two short ones. The rule has no fixer, per PRS-0006, because shortening a sentence
changes its words. Its message counts the words and the clauses and asks for a split into shorter sentences
rather than a compressed one, and that request is what this case grades.

The split usually takes the paragraph past its sentence budget, so a cell that
follows the first message then meets paragraph-sentence-budget-exceeded too. Closing that
second loop is part of the case, and it shows in the turn count.

Splitting adds subjects and drops joining words, so the recall is 90% and the word count
may grow by 40%. A compressed rewrite falls below either floor.
"""

from __future__ import annotations

from _gate import SKILL, grade, task_for
from pytest_xharness_eval import CaseOutput, evalcase

FIXTURE = "sentence_over_budget"  # evals/fixtures/sentence_over_budget/
TARGET = "release-guide.md"


@evalcase(task=task_for(TARGET), skill=SKILL, fixture=FIXTURE)
def eval_sentence_split(output: CaseOutput) -> None:
    """Scope, nothing hidden, content kept, no compression, then the gate is clean."""
    grade(
        output,
        fixture=FIXTURE,
        target=TARGET,
        rule="sentence-word-budget-exceeded",
        at_least=0.9,
        ratio=(0.9, 1.4),
    )
