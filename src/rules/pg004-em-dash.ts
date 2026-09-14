// PG004: an em-dash in prose. Code is exempt by construction, since only
// text nodes are read. The fix is deliberately narrow: a pair of dashes
// around an aside becomes parentheses, a lone dash becomes a colon, and
// anything else stays reported for a human.

import type { Node } from "mdast";
import { first, last } from "../fix/ends.ts";
import { matchesIn } from "../fix/spans.ts";
import type { DirectText, DocModel, Range } from "../model.ts";
import { type Edit, RULE, type Rule } from "./types.ts";
import { textsContaining } from "./utils.ts";

const EM_DASH = "—";

// Any horizontal space around the dash belongs to it, including no-break and
// zero-width spaces, or the swap strands one in front of the colon.
const DASH = /[\p{Zs}\t​]*—[\p{Zs}\t​]*/u;

// What an aside must not be: an enumeration marker in disguise.
const MARKER_LIKE = /^(?:[a-z]|[ivx]+|\d+)$/i;

interface Dash {
  range: Range; // the dash with its surrounding spaces
  text: DirectText; // the text node it sits in
}

// One paragraph, heading or table cell: the dashes it holds and the text
// nodes they came from. A block whose source and parsed value disagree is
// refused whole, so a swap never lands next to a glyph the fixer cannot see.
interface Block {
  texts: DirectText[];
  dashes: Dash[];
  refused: boolean;
}

const blocksOf = (doc: DocModel): Block[] => {
  const byBlock = new Map<Node, Block>();
  for (const { block, start, end, value } of doc.texts) {
    if (block === undefined || start === undefined || end === undefined) continue;
    let entry = byBlock.get(block);
    if (!entry) {
      entry = { texts: [], dashes: [], refused: false };
      byBlock.set(block, entry);
    }
    const text: DirectText = { value, start, end };
    entry.texts.push(text);
    const found = matchesIn(doc.src, text, DASH);
    if (found === null) entry.refused = true;
    else entry.dashes.push(...found.map((range) => ({ range, text })));
  }
  return [...byBlock.values()];
};

// Absolute offsets of every match of `pattern` across a block's prose text.
const offsetsIn = (src: string, texts: DirectText[], pattern: RegExp): number[] =>
  texts.flatMap((text) =>
    [...src.slice(text.start, text.end).matchAll(pattern)].map((m) => text.start + (m.index ?? 0)),
  );

// The dashes of one sentence, with the one fact about that sentence the
// rewrite needs. A pair only reads as an aside when both halves sit in the
// same sentence, which is why dashes are judged a sentence at a time.
interface Aside {
  dashes: Dash[];
  hasColon: boolean;
}

const asidesIn = (src: string, { texts, dashes }: Block): Aside[] => {
  // Terminals and colons are read only from this block's prose text, so one
  // inside a link, emphasis or code span never splits a sentence.
  const terminals = offsetsIn(src, texts, /[.!?](?=\s)/g);
  const colons = offsetsIn(src, texts, /:/g);
  const sentenceOf = (offset: number): number => terminals.filter((terminal) => terminal < offset).length;

  const bySentence = new Map<number, Dash[]>();
  for (const dash of dashes) {
    const sentence = sentenceOf(dash.range[0]);
    const group = bySentence.get(sentence);
    if (group) group.push(dash);
    else bySentence.set(sentence, [dash]);
  }
  return [...bySentence].map(([sentence, group]) => ({
    dashes: group,
    hasColon: colons.some((colon) => sentenceOf(colon) === sentence),
  }));
};

// A dash touching a line break, the edge of its text node, or punctuation
// that already ends or opens a clause has no clear neighbours to join.
const touchesEdge = (src: string, dash: Dash): boolean =>
  dash.range[0] === dash.text.start ||
  dash.range[1] === dash.text.end ||
  /[\r\n.!?:;,(\\]/.test(src[dash.range[0] - 1] ?? "\n") ||
  /[\r\n.!?:;,)]/.test(src[dash.range[1]] ?? "\n");

// What the dashes of one sentence become, or null when the shape is not one
// of the two the fix trusts.
const replacementFor = (src: string, { dashes, hasColon }: Aside): string | null => {
  const opening = first(dashes);
  const closing = last(dashes);

  // A pair wraps an aside, so it becomes parentheses. An aside that reads as
  // "(b)" would plant a PG007 marker and hide the word from the fingerprint.
  if (dashes.length === 2) {
    const inner = src.slice(opening.range[1], closing.range[0]);
    return MARKER_LIKE.test(inner.trim()) ? null : ` (${inner}) `;
  }

  // A lone dash joins two clauses, so it becomes a colon. A numeric range
  // like 1—2 or 2020 — 2021 wants an en-dash instead, and a sentence that
  // already has a colon would read as two labels.
  if (dashes.length === 1) {
    const numericRange = /\d/.test(src[opening.range[0] - 1] ?? "") && /\d/.test(src[opening.range[1]] ?? "");
    return numericRange || hasColon ? null : ": ";
  }

  // Three or more dashes in one sentence is a shape the fix does not claim
  // to understand, so the finding stays for a human.
  return null;
};

const rewrite = (src: string, aside: Aside): Edit | null => {
  if (aside.dashes.some((dash) => touchesEdge(src, dash))) return null;
  const text = replacementFor(src, aside);
  if (text === null) return null;
  return {
    rule: RULE.EM_DASH,
    start: first(aside.dashes).range[0],
    end: last(aside.dashes).range[1],
    text,
    expect: { kind: "same-shape" },
  };
};

const check: Rule["check"] = ({ doc, file }) =>
  textsContaining(doc, EM_DASH).map((text) => ({
    file,
    line: text.line,
    rule: RULE.EM_DASH,
    message: "em-dash in prose; use comma, colon, parentheses, or two sentences",
  }));

const fix: Rule["fix"] = ({ doc }) =>
  blocksOf(doc)
    .filter((block) => !block.refused && block.dashes.length > 0)
    .flatMap((block) => asidesIn(doc.src, block))
    .map((aside) => rewrite(doc.src, aside))
    .filter((edit): edit is Edit => edit !== null);

export const pg004: Rule = {
  id: RULE.EM_DASH,
  category: "punctuation",
  summary: "em-dash U+2014 in prose",
  check,
  fix,
};
