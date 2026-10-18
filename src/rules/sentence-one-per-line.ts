// sentence-one-per-line: a newline inside a paragraph whose preceding non-space character
// does not end a sentence is a mid-sentence wrap, and a sentence break with no
// newline puts several sentences on one line. The fix reflows the paragraph to
// one sentence per line, so the check reports every paragraph the fix changes.

import { isStacked, paragraphsOf } from "../interpunct.ts";
import type { ParagraphView } from "../model.ts";
import { proseParagraphs } from "../query.ts";
import { collapse, inRanges } from "../text.ts";
import { type Edit, RULE, type Rule } from "./types.ts";

// A line break after one of these ends a sentence, so it is authored layout.
const TERMINALS = new Set([".", "!", "?", ":", ";"]);

// What may sit between the terminal and the break: trailing space, a carriage
// return, or the backslash form of a hard break.
const TRAILING = new Set([" ", "\t", "\r", "\\"]);

// A sentence ends at a terminal followed by space, and the next one opens with
// a capital or an opening delimiter. Anything else is an abbreviation.
const SENTENCE_BREAK = /[.!?]\s+(?=[A-Z`"'([])/g;

// Offsets within the paragraph where a line break interrupts a sentence.
const wrapsIn = (view: ParagraphView): number[] => {
  const wraps: number[] = [];
  for (let i = 0; i < view.raw.length; i++) {
    if (view.raw[i] !== "\n") continue;
    if (inRanges(view.startOffset + i, view.codeRanges)) continue;
    let j = i - 1;
    while (j >= 0 && TRAILING.has(view.raw.charAt(j))) j--;
    if (j >= 0 && !TERMINALS.has(view.raw.charAt(j))) wraps.push(i);
  }
  return wraps;
};

// The paragraph with each code span masked character for character, keeping
// whitespace, so offsets stay aligned and a terminal inside a code span never
// reads as the end of a sentence.
const masked = (view: ParagraphView): string =>
  [...view.raw].map((ch, i) => (inRanges(view.startOffset + i, view.codeRanges) && !/\s/.test(ch) ? "x" : ch)).join("");

// Offsets within the paragraph of a sentence break that has no newline in it,
// one per line, since one finding per line is enough to name it.
const packedIn = (view: ParagraphView): number[] => {
  const lines = new Set<number>();
  const at: number[] = [];
  const text = masked(view);
  for (const match of text.matchAll(SENTENCE_BREAK)) {
    if (match[0].includes("\n")) continue;
    const offset = match.index ?? 0;
    const line = text.slice(0, offset).split("\n").length;
    if (lines.has(line)) continue;
    lines.add(line);
    at.push(offset);
  }
  return at;
};

// The paragraph rewritten with one sentence per line.
const reflow = (view: ParagraphView): string => {
  const indent = " ".repeat(view.startColumn - 1);
  const eol = view.raw.includes("\r\n") ? "\r\n" : "\n";
  const joined = collapse(view.raw);
  const joinedMask = collapse(masked(view));

  const lines: string[] = [];
  let from = 0;
  for (const match of joinedMask.matchAll(SENTENCE_BREAK)) {
    const at = match.index ?? 0;
    lines.push(joined.slice(from, at + 1));
    from = at + match[0].length;
  }
  lines.push(joined.slice(from));
  return lines.map((line, i) => (i === 0 ? line.trim() : indent + line.trim())).join(eol);
};

const lineOf = (view: ParagraphView, at: number): number => view.line + view.raw.slice(0, at).split("\n").length - 1;

const check: Rule["check"] = ({ doc, file }) =>
  proseParagraphs(doc).flatMap((view) => [
    ...wrapsIn(view).map((at) => ({
      file,
      line: lineOf(view, at),
      rule: RULE.WRAP,
      message: "mid-sentence line wrap; write one sentence per line",
    })),
    ...packedIn(view).map((at) => ({
      file,
      line: lineOf(view, at),
      rule: RULE.WRAP,
      message: "several sentences on one line; write one sentence per line",
    })),
  ]);

const fix: Rule["fix"] = ({ doc, runs }) => {
  const edits: Edit[] = [];
  // Interpunct runs stacked on several lines are a nested list list-stacked-interpunct-runs either
  // promotes or leaves for a human. Joining the lines would destroy the
  // structure and hand list-interpunct-joined-run a flat run it would merge wrongly.
  const stacked = new Set(paragraphsOf(doc, runs.filter(isStacked)));
  for (const view of proseParagraphs(doc)) {
    // A hard break is structure the author chose, so the paragraph is left
    // exactly as written.
    if (view.inBlockquote || view.hasBreak) continue;
    if (stacked.has(view)) continue;

    const text = reflow(view);
    if (text === view.raw) continue;
    edits.push({
      rule: RULE.WRAP,
      start: view.startOffset,
      end: view.endOffset,
      text,
      expect: { kind: "same-tree" },
    });
  }
  return edits;
};

export const sentenceOnePerLine: Rule = {
  id: RULE.WRAP,
  category: "sentence",
  summary: "mid-sentence line wrap or several sentences on one line (one sentence per line)",
  check,
  fix,
};
