// PG004: an em-dash in prose. Code is exempt by construction, since only
// text nodes are read. The fix is deliberately narrow: a pair of dashes
// around an aside becomes parentheses, a lone dash becomes a colon, and
// anything else stays reported for a human.

import type { Node } from "mdast";
import { first, last } from "../fix/ends.ts";
import { matchesIn } from "../fix/spans.ts";
import type { DirectText, DocModel, Range } from "../model.ts";
import { type Edit, RULE, type Rule } from "./types.ts";

// Any horizontal space around the dash belongs to it, including no-break and
// zero-width spaces, or the swap strands one in front of the colon.
const DASH = /[\p{Zs}\t​]*—[\p{Zs}\t​]*/u;

// An aside that reads as an enumeration marker, "(b)", would plant a PG007
// marker and hide the word from the content fingerprint.
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
    const text: DirectText = { value, start, end };
    const entry = byBlock.get(block) ?? { texts: [], dashes: [], refused: false };
    byBlock.set(block, entry);
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

// The rewrite for the dashes of one sentence, or null when the shape is not
// one of the two the fix trusts.
const rewrite = (
  src: string,
  group: Dash[],
  sentence: number,
  sentenceOf: (offset: number) => number,
  colons: number[],
): Edit | null => {
  const opening = first(group);
  const closing = last(group);
  // A dash touching a line break, the edge of its text node, or punctuation
  // that already ends or opens a clause has no clear neighbours to join.
  const touchesEdge = (dash: Dash): boolean =>
    dash.range[0] === dash.text.start ||
    dash.range[1] === dash.text.end ||
    /[\r\n.!?:;,(\\]/.test(src[dash.range[0] - 1] ?? "\n") ||
    /[\r\n.!?:;,)]/.test(src[dash.range[1]] ?? "\n");
  if (group.some(touchesEdge)) return null;

  let text: string;
  if (group.length === 2) {
    const inner = src.slice(opening.range[1], closing.range[0]);
    if (MARKER_LIKE.test(inner.trim())) return null;
    text = ` (${inner}) `;
  } else if (group.length === 1) {
    // A numeric range like 1—2 or 2020 — 2021 wants an en-dash, not a colon,
    // and a sentence that already has a colon would read as two labels.
    if (/\d/.test(src[opening.range[0] - 1] ?? "") && /\d/.test(src[opening.range[1]] ?? "")) return null;
    if (colons.some((colon) => sentenceOf(colon) === sentence)) return null;
    text = ": ";
  } else {
    return null;
  }
  return { rule: RULE.EM_DASH, start: opening.range[0], end: closing.range[1], text, expect: { kind: "same-shape" } };
};

const check: Rule["check"] = ({ doc, file }) =>
  doc.texts
    .filter((text) => text.value.includes("—"))
    .map((text) => ({
      file,
      line: text.line,
      rule: RULE.EM_DASH,
      message: "em-dash in prose; use comma, colon, parentheses, or two sentences",
    }));

const fix: Rule["fix"] = ({ doc }) => {
  const { src } = doc;
  const edits: Edit[] = [];
  for (const { texts, dashes, refused } of blocksOf(doc)) {
    if (refused || dashes.length === 0) continue;
    // Sentence terminals and colons, read only from prose text in this block.
    const terminals = offsetsIn(src, texts, /[.!?](?=\s)/g);
    const colons = offsetsIn(src, texts, /:/g);
    const sentenceOf = (offset: number): number => terminals.filter((terminal) => terminal < offset).length;

    // Dashes are rewritten a sentence at a time: a pair only reads as an
    // aside when both halves sit in the same sentence.
    const groups = new Map<number, Dash[]>();
    for (const dash of dashes) {
      const sentence = sentenceOf(dash.range[0]);
      groups.set(sentence, [...(groups.get(sentence) ?? []), dash]);
    }
    for (const [sentence, group] of groups) {
      const edit = rewrite(src, group, sentence, sentenceOf, colons);
      if (edit) edits.push(edit);
    }
  }
  return edits;
};

export const pg004: Rule = {
  id: RULE.EM_DASH,
  category: "punctuation",
  summary: "em-dash U+2014 in prose",
  check,
  fix,
};
