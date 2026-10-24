// list-comma-code-run: three or more inline-code spans joined by commas, with
// an optional "and"/"or" before the last, are a hidden list of bare items:
// "touches `a.yaml`, `b.json` and `Makefile`". Each item is only its code
// span, so this is the bare-item sibling of list-comma-labelled-run, whose
// items carry content after the label. Plain words stay prose, because a
// series like "parse, fix and verify" is ordinary English, not a list.
//
// The check counts a run anywhere in a sentence; the fix is stricter and
// needs the run to close the sentence after a lead-in, so no text is left
// trailing the list it would become.

import { cleanLeadIn, promote } from "../fix/promote.ts";
import type { ParagraphView } from "../model.ts";
import { proseSentences, sentenceSpans } from "../query.ts";
import { collapse, last, type Range, within } from "../text.ts";
import { MIN_ITEMS, minItemsOf } from "./options.ts";
import { type Edit, RULE, type Rule } from "./types.ts";

// The run as the check reads prose, where each code span is one CODE token.
const RUN = /CODE(?:\s*,\s+CODE)*(?:\s*,?\s+(?:and|or)\s+CODE)?/g;

export const DEFAULT_MIN_CODE_ITEMS = 3;

// The longest run in a sentence, counted in code spans.
const longestRun = (sentence: string): number =>
  Math.max(0, ...[...sentence.matchAll(RUN)].map((m) => m[0].split("CODE").length - 1));

const check: Rule["check"] = ({ doc, file, options }) => {
  const minItems = minItemsOf(options, DEFAULT_MIN_CODE_ITEMS);
  return proseSentences(doc)
    .map(({ view, sentence }) => ({ view, items: longestRun(sentence) }))
    .filter(({ items }) => items >= minItems)
    .map(({ view, items }) => ({
      file,
      line: view.line,
      rule: RULE.CODE_RUN,
      message: `comma-joined run of ${items} code spans; promote to a bullet list`,
    }));
};

// What may sit between two items in the source: a comma, or before the last
// item a conjunction with an optional comma. Anything else, such as the
// "](url)" of a link or an emphasis marker, ends the run.
const COMMA = /^\s*,\s+$/;
const JOINER = /^\s*,?\s+(?:and|or)\s+$/;

// After the last item only the sentence's terminal may follow.
const TAIL = /^\s*[.!?]?\s*$/;

// The code spans that close the sentence as a run, in order, or null when
// the sentence does not end on one.
const tailRun = (src: string, codes: Range[], span: Range, minItems: number): Range[] | null => {
  const inside = codes.filter((code) => within(code, span));
  if (inside.length < minItems || !TAIL.test(src.slice(last(inside)[1], span[1]))) return null;
  const run = [last(inside)];
  for (let i = inside.length - 2; i >= 0; i--) {
    const gap = src.slice((inside[i] as Range)[1], (run[0] as Range)[0]);
    const joins = COMMA.test(gap) || (run.length === 1 && JOINER.test(gap));
    if (!joins) break;
    run.unshift(inside[i] as Range);
  }
  return run.length >= minItems ? run : null;
};

// A colon already closing the lead-in inside emphasis, as in "**Paths:**",
// is kept as written rather than given a second colon after the marker.
const EMPHASISED_COLON = /:[*_]+$/;

// The lead-in must end in whitespace, so an item that opens inside a link,
// emphasis or a bracket is never cut away from its opening mark.
const leadInOf = (head: string): string | null => {
  if (!/\s$/.test(head)) return null;
  const trimmed = collapse(head).trim();
  return EMPHASISED_COLON.test(trimmed) ? trimmed : cleanLeadIn(head);
};

const fixParagraph = (src: string, view: ParagraphView, minItems: number): Edit | null => {
  for (const span of sentenceSpans(src, view)) {
    const run = tailRun(src, view.codeRanges, span, minItems);
    if (run === null) continue;
    const leadIn = leadInOf(src.slice(span[0], (run[0] as Range)[0]));
    if (leadIn === null) continue;
    return promote({
      rule: RULE.CODE_RUN,
      src,
      view,
      span,
      leadIn,
      items: run.map(([start, end]) => ({ text: src.slice(start, end) })),
      ordered: false,
    });
  }
  return null;
};

// One promotion per paragraph, as for the other list rules: the engine
// re-parses and comes back for the rest.
const fix: Rule["fix"] = ({ doc, options }) => {
  const minItems = minItemsOf(options, DEFAULT_MIN_CODE_ITEMS);
  return doc.paragraphs
    .map((view) => fixParagraph(doc.src, view, minItems))
    .filter((edit): edit is Edit => edit !== null);
};

export const listCommaCodeRun: Rule = {
  id: RULE.CODE_RUN,
  category: "list",
  summary: "comma-joined run of 3+ inline code spans",
  options: MIN_ITEMS,
  check,
  fix,
};
