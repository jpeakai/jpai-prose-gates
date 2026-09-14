// PG004: an em-dash in prose. Code is exempt by construction, since only
// text nodes are read. The fix is deliberately narrow: a pair of dashes
// around an aside becomes parentheses, a lone dash becomes a colon, and
// anything else stays reported for a human.

import { matchesIn } from "../fix/spans.ts";
import type { DocModel, Range, TextView } from "../model.ts";
import { type Edit, RULE, type Rule } from "./types.ts";

// Any horizontal space around the dash belongs to it, including no-break and
// zero-width spaces, or the swap strands one in front of the colon.
const DASH = /[\p{Zs}\t\u200b]*—[\p{Zs}\t\u200b]*/u;

// An aside that reads as an enumeration marker, "(b)", would plant a PG007
// marker and hide the word from the content fingerprint.
const MARKER_LIKE = /^(?:[a-z]|[ivx]+|\d+)$/i;

interface Dash {
  range: Range; // the dash with its surrounding spaces
  text: TextView;
}

const fix = (doc: DocModel): Edit[] => {
  const { src } = doc;
  const byBlock = new Map<unknown, { texts: TextView[]; dashes: Dash[]; refused: boolean }>();
  for (const t of doc.texts) {
    if (t.block === undefined || t.start === undefined || t.end === undefined) continue;
    const entry = byBlock.get(t.block) ?? { texts: [], dashes: [], refused: false };
    byBlock.set(t.block, entry);
    entry.texts.push(t);
    const found = matchesIn(src, { value: t.value, start: t.start, end: t.end }, DASH);
    if (found === null) entry.refused = true;
    else entry.dashes.push(...found.map((range) => ({ range, text: t })));
  }

  const edits: Edit[] = [];
  for (const { texts, dashes, refused } of byBlock.values()) {
    if (refused || dashes.length === 0) continue;
    // Sentence terminals and colons, read only from prose text in this block.
    const terminals: number[] = [];
    const colons: number[] = [];
    for (const t of texts) {
      const slice = src.slice(t.start, t.end);
      for (const m of slice.matchAll(/[.!?](?=\s)/g)) terminals.push((t.start as number) + (m.index ?? 0));
      for (const m of slice.matchAll(/:/g)) colons.push((t.start as number) + (m.index ?? 0));
    }
    const sentenceOf = (offset: number): number => terminals.filter((x) => x < offset).length;
    const groups = new Map<number, Dash[]>();
    for (const d of dashes) {
      const key = sentenceOf(d.range[0]);
      groups.set(key, [...(groups.get(key) ?? []), d]);
    }

    for (const [sentence, group] of groups) {
      const edit = rewrite(src, group, sentence, sentenceOf, colons);
      if (edit) edits.push(edit);
    }
  }
  return edits;
};

const rewrite = (
  src: string,
  group: Dash[],
  sentence: number,
  sentenceOf: (offset: number) => number,
  colons: number[],
): Edit | null => {
  const first = group[0] as Dash;
  const last = group[group.length - 1] as Dash;
  // A dash touching a line break, the edge of its text node, or punctuation
  // that already ends or opens a clause has no clear neighbours to join.
  const touchesEdge = (d: Dash): boolean =>
    d.range[0] === d.text.start ||
    d.range[1] === d.text.end ||
    /[\r\n.!?:;,(\\]/.test(src[d.range[0] - 1] ?? "\n") ||
    /[\r\n.!?:;,)]/.test(src[d.range[1]] ?? "\n");
  if (group.some(touchesEdge)) return null;

  let text: string;
  if (group.length === 2) {
    const inner = src.slice(first.range[1], last.range[0]);
    if (MARKER_LIKE.test(inner.trim())) return null;
    text = ` (${inner}) `;
  } else if (group.length === 1) {
    // A numeric range like 1—2 or 2020 — 2021 wants an en-dash, not a colon,
    // and a sentence that already has a colon would read as two labels.
    if (/\d/.test(src[first.range[0] - 1] ?? "") && /\d/.test(src[first.range[1]] ?? "")) return null;
    if (colons.some((c) => sentenceOf(c) === sentence)) return null;
    text = ": ";
  } else {
    return null;
  }
  return {
    rule: RULE.EM_DASH,
    start: first.range[0],
    end: last.range[1],
    text,
    expect: { kind: "same-shape" },
  };
};

export const pg004: Rule = {
  id: RULE.EM_DASH,
  category: "punctuation",
  summary: "em-dash U+2014 in prose",
  check: ({ doc, file }) =>
    doc.texts
      .filter((t) => t.value.includes("—"))
      .map((t) => ({
        file,
        line: t.line,
        rule: RULE.EM_DASH,
        message: "em-dash in prose; use comma, colon, parentheses, or two sentences",
      })),
  fix,
};
