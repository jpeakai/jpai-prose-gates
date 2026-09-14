// PG005: a stray interpunct in prose. One inside a reported run is left to
// PG006 or PG009. The fix swaps a spaced interpunct for a comma; a glyph
// with no space on either side (a product name, a unit) is left alone.

import { matchesIn } from "../fix/spans.ts";
import { type DocModel, inRanges } from "../model.ts";
import { interpunctRuns } from "./interpunct.ts";
import { type Edit, RULE, type Rule } from "./types.ts";

const fix = (doc: DocModel): Edit[] => {
  const runs = interpunctRuns(doc).map((r) => r.range);
  const edits: Edit[] = [];
  for (const t of doc.texts) {
    if (t.start === undefined || t.end === undefined || !t.value.includes("·")) continue;
    if (inRanges(t.start, runs)) continue;
    const text = { value: t.value, start: t.start, end: t.end };
    const glyphs = matchesIn(doc.src, text, /·/);
    const spaced = matchesIn(doc.src, text, /[ \t]+·[ \t]+/);
    if (glyphs === null || spaced === null || glyphs.length !== spaced.length) continue;
    for (const [start, end] of spaced) {
      edits.push({ rule: RULE.INTERPUNCT, start, end, text: ", ", expect: { kind: "same-shape" } });
    }
  }
  return edits;
};

export const pg005: Rule = {
  id: RULE.INTERPUNCT,
  category: "punctuation",
  summary: "interpunct U+00B7 in prose",
  check: ({ doc, file, runs }) => {
    const suppressed = runs.map((r) => r.range);
    return doc.texts
      .filter((t) => t.value.includes("·") && !(t.offset != null && inRanges(t.offset, suppressed)))
      .map((t) => ({
        file,
        line: t.line,
        rule: RULE.INTERPUNCT,
        message: "interpunct in prose; use a comma, slash, or a list",
      }));
  },
  fix,
};
