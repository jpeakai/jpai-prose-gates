// PG003: a run of items joined by semicolons is a wall of text hiding a
// list. The fix needs a colon lead-in to know where the list starts, and
// refuses without one.

import { first } from "../fix/ends.ts";
import { cleanLeadIn, itemsBetween, promote } from "../fix/promote.ts";
import { matchesInAll, sentenceSpans, within } from "../fix/spans.ts";
import { type Edit, RULE, type Rule } from "./types.ts";
import { colonsBefore, colonsIn, countOf, proseSentences } from "./utils.ts";

const SEMICOLON = /;/g;

const check: Rule["check"] = ({ doc, file }) =>
  proseSentences(doc)
    .map(({ view, sentence }) => ({ view, semicolons: countOf(sentence, SEMICOLON) }))
    .filter(({ semicolons }) => semicolons >= 2)
    .map(({ view, semicolons }) => ({
      file,
      line: view.line,
      rule: RULE.SEMICOLON_LIST,
      message: `semicolon-delimited list (${semicolons} ';'); promote to a bullet list`,
    }));

const fix: Rule["fix"] = ({ doc }) => {
  const { src } = doc;
  const edits: Edit[] = [];
  for (const view of doc.paragraphs) {
    const semicolons = matchesInAll(src, view.directTexts, SEMICOLON);
    const colons = colonsIn(src, view);
    if (semicolons === null || colons === null) continue;
    for (const span of sentenceSpans(src, view)) {
      const inside = semicolons.filter((semicolon) => within(semicolon, span));
      if (inside.length < 2) continue;
      // The outermost colon before the first item opens the lead-in, so a
      // "Note: the rules: a; b; c" keeps the whole of "Note: the rules".
      const colon = colonsBefore(colons, span, first(inside)[0])[0];
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
