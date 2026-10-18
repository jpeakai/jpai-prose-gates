"""The shared verdict: this repository's own gate, plus proof the prose survived the edit.

Each case seeds one markdown file that fails one rule the fixer cannot settle, tells the
agent only to make the gate pass, and leaves the finding message as the agent's sole
guide. What these cells measure is the message, so every case grades the same way and the
report's turn and tool-call counts compare like with like:

1. **The seed still fails as described.** The fixture is gated before grading and must
   report exactly its one rule. A fixture that drifts from its rule is the host's fault,
   so it raises :class:`RuntimeError` and the cell grades ``error``, not ``fail``.
2. **Scope.** Only the target file changed, and nothing was added beside it. A new config
   file would turn the rule off rather than satisfy it.
3. **Nothing was hidden.** No new code fence or inline code span: the gate skips code, so
   wrapping a sentence in backticks is a way to zero findings with no rewrite at all.
4. **The content survived.** The seed's content words, outside code and minus stopwords,
   are still there at the case's recall, and every seed sentence keeps at least half of
   its own content words, so no sentence was deleted wholesale.
5. **No compression.** The prose word count stays within the case's ratio of the seed.
   The messages ask for a split, not a shorter text, and this is where a cut shows.
6. **The gate is clean.** The agent's file is gated with this repository's ``src/bin.ts``
   with plugins off, never a published copy, and must report zero findings of any rule.

Zero findings alone is not the verdict: deleting the paragraph also reaches zero.
"""

from __future__ import annotations

import json
import re
import subprocess
from collections import Counter
from pathlib import Path

from pytest_xharness_eval import CaseOutput
from pytest_xharness_eval.verify import check_files_written, check_no_files_added, check_rollout

EVALS = Path(__file__).resolve().parent
SKILL_DIR = EVALS.parent
REPO = SKILL_DIR.parent.parent
GATE = REPO / "src" / "bin.ts"

SKILL = re.search(r"^name:\s*(\S+)", (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8"), re.MULTILINE)[1]

#: The command the agent is told to make pass, and the grader runs. Plugins are off, so a
#: plugin installed in this repository can never change what a cell is graded against.
GATE_ARGV = ("bun", "run", str(GATE), "--no-plugins")

#: What a run may leave beside the file: a tool cache directory, and nothing else.
SCRATCH = (".*_cache/*",)

#: What a user types after naming the skill. One sentence for every case, so a difference
#: between cells is the fixture's and its message's, never the wording's.
TASK = "Make `{command} {target}` exit 0 by editing {target} in place."

#: Words too common to carry a document's content. Splitting a sentence adds and drops
#: these freely, so they are left out of every recall figure.
STOPWORDS = frozenset(
    "a an the and or but so yet nor of to in on at by for from with as into onto than then "
    "this that these those it its is are was were be been being has have had do does did "
    "which who whom whose when while if because although though unless where whereas "
    "not no every each both all any one also there their they them he she we you i".split()
)

_FENCE = re.compile(r"^(`{3,}|~{3,}).*?^\1[ \t]*$", re.MULTILINE | re.DOTALL)
_FENCE_LINE = re.compile(r"^[ \t]*(?:`{3,}|~{3,})", re.MULTILINE)
_INLINE_CODE = re.compile(r"`[^`\n]+`")
_COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)
_WORD = re.compile(r"[A-Za-z0-9_]+")


def task_for(target: str) -> str:
    """The task sentence for one case's target file."""
    return TASK.format(command=" ".join(GATE_ARGV), target=target)


def fixture_path(fixture: str, target: str) -> Path:
    """The seed document a case starts from: ``evals/fixtures/<fixture>/<target>``."""
    return EVALS / "fixtures" / fixture / target


# -- the gate ---------------------------------------------------------------------------


def gate(path: Path) -> list[dict[str, object]]:
    """Gate ``path`` with this repository's source; return its findings.

    Raises:
        RuntimeError: the gate could not run or printed no JSON (no ``bun``, a usage error).
            That is the host, not the agent, so the cell grades ``error`` rather than ``fail``.
    """
    result = subprocess.run(
        [*GATE_ARGV, "--json", str(path)],
        cwd=path.parent,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode not in (0, 1):
        raise RuntimeError(f"the gate exited {result.returncode} on {path}:\n{result.stdout}{result.stderr}")
    try:
        report = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"the gate printed no JSON for {path}:\n{result.stdout}{result.stderr}") from exc
    return list(report["findings"])


def _summary(findings: list[dict[str, object]]) -> str:
    return "\n".join(f"  {f['rule']} (line {f['line']}): {f['message']}" for f in findings)


def require_seed_fails(fixture: str, target: str, rule: str) -> None:
    """The committed fixture reports exactly ``rule``, so the case still tests that message."""
    findings = gate(fixture_path(fixture, target))
    rules = {str(f["rule"]) for f in findings}
    if rules != {rule}:
        raise RuntimeError(
            f"fixture {fixture}/{target} should fail {rule} alone, it reports {sorted(rules)}:\n{_summary(findings)}"
        )


def check_gate_clean(output: CaseOutput, target: str) -> None:
    """The real verdict: this repository's gate reports zero findings on the agent's file."""
    findings = gate(output.path(target))
    assert not findings, f"{len(findings)} finding(s) remain in {target}:\n{_summary(findings)}"


# -- the prose survived -----------------------------------------------------------------


def prose(doc: str) -> str:
    """The document with code fences, inline code and comments removed: what the gate reads."""
    return _INLINE_CODE.sub(" ", _COMMENT.sub(" ", _FENCE.sub(" ", doc)))


def words(text: str) -> list[str]:
    """Every word, lowercased."""
    return [w.lower() for w in _WORD.findall(text)]


def stem(word: str) -> str:
    """A crude stem, so a split that turns "has bumped" into "bumps" keeps the word."""
    for suffix in ("ing", "ed", "es", "s"):
        if word.endswith(suffix) and len(word) - len(suffix) >= 3:
            return word[: -len(suffix)]
    return word


def content_words(text: str) -> Counter[str]:
    """The words that carry content: every word but the stopwords, stemmed and counted."""
    return Counter(stem(w) for w in words(text) if w not in STOPWORDS)


def recall(seed: Counter[str], got: Counter[str]) -> float:
    """The share of the seed's content words, counted with multiplicity, still present."""
    total = sum(seed.values())
    return 1.0 if total == 0 else sum(min(n, got[w]) for w, n in seed.items()) / total


def seed_sentences(doc: str) -> list[str]:
    """The seed's prose lines that are not headings. The fixtures hold one sentence per line."""
    return [line for line in prose(doc).splitlines() if line.strip() and not line.lstrip().startswith("#")]


def check_nothing_hidden(doc: str, seed: str, target: str) -> None:
    """No new code fence or inline code span, either of which the gate would skip."""
    fences, seed_fences = len(_FENCE_LINE.findall(doc)), len(_FENCE_LINE.findall(seed))
    spans, seed_spans = len(_INLINE_CODE.findall(doc)), len(_INLINE_CODE.findall(seed))
    assert fences <= seed_fences, (
        f"{target} has {fences} fence line(s), the seed had {seed_fences}: prose hidden in code"
    )
    assert spans <= seed_spans, (
        f"{target} has {spans} inline code span(s), the seed had {seed_spans}: prose hidden in code"
    )


def check_content_kept(doc: str, seed: str, target: str, *, at_least: float) -> None:
    """The seed's content words survive at ``at_least`` recall, and no sentence went whole."""
    got = content_words(prose(doc))
    kept = recall(content_words(prose(seed)), got)
    missing = sorted((content_words(prose(seed)) - got).elements())
    assert kept >= at_least, f"{target} kept {kept:.0%} of the seed's content words, below {at_least:.0%}: {missing}"
    for sentence in seed_sentences(seed):
        own = content_words(sentence)
        share = recall(own, got)
        assert share >= 0.5, f"{target} lost a sentence, keeping {share:.0%} of its content words: {sentence!r}"


def check_length_kept(doc: str, seed: str, target: str, *, ratio: tuple[float, float]) -> None:
    """The prose word count stays within ``ratio`` of the seed's: split, not compressed."""
    lo, hi = ratio
    got, want = len(words(prose(doc))), len(words(prose(seed)))
    assert lo * want <= got <= hi * want, (
        f"{target} has {got} words, the seed had {want}; the case allows {lo:.2f}x to {hi:.2f}x"
    )


# -- the whole verdict ------------------------------------------------------------------


def grade(
    output: CaseOutput,
    *,
    fixture: str,
    target: str,
    rule: str,
    at_least: float,
    ratio: tuple[float, float],
) -> None:
    """Every case's verdict, in the order the module docstring gives it."""
    require_seed_fails(fixture, target, rule)
    check_rollout(output)
    check_files_written(output, target)
    check_no_files_added(output, allow=SCRATCH)
    seed = fixture_path(fixture, target).read_text(encoding="utf-8")
    doc = output.read(target)
    check_nothing_hidden(doc, seed, target)
    check_content_kept(doc, seed, target, at_least=at_least)
    check_length_kept(doc, seed, target, ratio=ratio)
    check_gate_clean(output, target)
