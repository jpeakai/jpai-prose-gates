// PG005: a stray interpunct in prose. One inside a reported run is left to
// PG006 or PG009. The fix swaps a spaced interpunct for a comma; a glyph
// with no space on either side (a product name, a unit) is left alone.

import { matchesIn } from "../fix/spans.ts";
import { inRanges } from "../model.ts";
import { type Edit, RULE, type Rule } from "./types.ts";

const INTERPUNCT = "·";
const GLYPH = /·/;
// Only a separator reads as a comma: the spaces on both sides are what make
// the glyph a joiner rather than part of a name.
const SEPARATOR = /[ \t]+·[ \t]+/;

const check: Rule["check"] = ({ doc, file, runs }) => {
  const reported = runs.map((run) => run.range);
  return doc.texts
    .filter((text) => text.value.includes(INTERPUNCT))
    .filter((text) => text.start === undefined || !inRanges(text.start, reported))
    .map((text) => ({
      file,
      line: text.line,
      rule: RULE.INTERPUNCT,
      message: "interpunct in prose; use a comma, slash, or a list",
    }));
};

const fix: Rule["fix"] = ({ doc, runs }) => {
  const reported = runs.map((run) => run.range);
  const edits: Edit[] = [];
  for (const { start, end, value } of doc.texts) {
    if (start === undefined || end === undefined || !value.includes(INTERPUNCT)) continue;
    if (inRanges(start, reported)) continue;
    const text = { value, start, end };
    // Every glyph in the node must be a spaced separator. A mixed node holds
    // at least one the fix would leave behind, so it refuses whole.
    const glyphs = matchesIn(doc.src, text, GLYPH);
    const separators = matchesIn(doc.src, text, SEPARATOR);
    if (glyphs === null || separators === null || glyphs.length !== separators.length) continue;
    for (const [from, to] of separators) {
      edits.push({ rule: RULE.INTERPUNCT, start: from, end: to, text: ", ", expect: { kind: "same-shape" } });
    }
  }
  return edits;
};

export const pg005: Rule = {
  id: RULE.INTERPUNCT,
  category: "punctuation",
  summary: "interpunct U+00B7 in prose",
  check,
  fix,
};
