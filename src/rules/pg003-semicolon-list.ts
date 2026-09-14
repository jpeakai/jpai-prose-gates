// PG003: a run of items joined by semicolons is a wall of text hiding a
// list. The fix needs a colon lead-in to know where the list starts, and
// refuses without one.

import { first } from "../fix/ends.ts";
import { cleanLeadIn, itemsBetween, promote } from "../fix/promote.ts";
import { matchesInAll, sentenceSpans, within } from "../fix/spans.ts";
import { sentences } from "../model.ts";
import { type Edit, type Finding, RULE, type Rule } from "./types.ts";

const check: Rule["check"] = ({ doc, file }) => {
  const findings: Finding[] = [];
  for (const view of doc.paragraphs) {
    if (view.inTable) continue;
    for (const sentence of sentences(view.prose)) {
      const semicolons = (sentence.match(/;/g) ?? []).length;
      if (semicolons < 2) continue;
      findings.push({
        file,
        line: view.line,
        rule: RULE.SEMICOLON_LIST,
        message: `semicolon-delimited list (${semicolons} ';'); promote to a bullet list`,
      });
    }
  }
  return findings;
};

const fix: Rule["fix"] = ({ doc }) => {
  const { src } = doc;
  const edits: Edit[] = [];
  for (const view of doc.paragraphs) {
    const semicolons = matchesInAll(src, view.directTexts, /;/);
    const colons = matchesInAll(src, view.directTexts, /:/);
    if (semicolons === null || colons === null) continue;
    for (const span of sentenceSpans(src, view)) {
      const inside = semicolons.filter((semicolon) => within(semicolon, span));
      if (inside.length < 2) continue;
      // The lead-in ends at the last colon before the first item.
      const colon = colons.find((c) => within(c, span) && c[1] <= first(inside)[0]);
      if (!colon) continue;

      const edit = promote({
        rule: RULE.SEMICOLON_LIST,
        src,
        view,
        span,
        leadIn: cleanLeadIn(src.slice(span[0], colon[0])),
        items: itemsBetween(src, [colon, ...inside], span[1]).map((text) => ({ text })),
        ordered: false,
      });
      if (edit) edits.push(edit);
      break; // one promotion per paragraph; the engine re-parses and comes back
    }
  }
  return edits;
};

export const pg003: Rule = {
  id: RULE.SEMICOLON_LIST,
  category: "list",
  summary: "semicolon-delimited list (2+ ';' in one sentence)",
  check,
  fix,
};
