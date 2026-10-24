// list-semicolon-delimited-run: a run of items joined by semicolons is a wall of text hiding a
// list. The fix needs a colon lead-in to know where the list starts, and
// refuses without one.

import { cleanLeadIn, itemsBetween, promote } from "../fix/promote.ts";
import type { ParagraphView } from "../model.ts";
import { colonsBefore, colonsIn, matchesInAll, proseSentences, sentenceSpans } from "../query.ts";
import { countOf, first, within } from "../text.ts";
import { MIN_ITEMS, minItemsOf } from "./options.ts";
import { type Edit, RULE, type Rule } from "./types.ts";

const SEMICOLON = /;/g;

// Two semicolons join three items.
export const DEFAULT_MIN_SEMICOLON_ITEMS = 3;

const check: Rule["check"] = ({ doc, file, options }) => {
  const minItems = minItemsOf(options, DEFAULT_MIN_SEMICOLON_ITEMS);
  return proseSentences(doc)
    .map(({ view, sentence }) => ({ view, semicolons: countOf(sentence, SEMICOLON) }))
    .filter(({ semicolons }) => semicolons + 1 >= minItems)
    .map(({ view, semicolons }) => ({
      file,
      line: view.line,
      rule: RULE.SEMICOLON_LIST,
      message: `semicolon-delimited list (${semicolons} ';'); promote to a bullet list`,
    }));
};

// The first sentence with enough semicolons and a colon lead-in is the only
// one tried: one promotion per paragraph, and the engine re-parses and
// comes back for the rest.
const fixParagraph = (src: string, view: ParagraphView, minItems: number): Edit | null => {
  const semicolons = matchesInAll(src, view.directTexts, SEMICOLON);
  const colons = colonsIn(src, view);
  if (semicolons === null || colons === null) return null;
  for (const span of sentenceSpans(src, view)) {
    const inside = semicolons.filter((semicolon) => within(semicolon, span));
    if (inside.length === 0 || inside.length + 1 < minItems) continue;
    // The outermost colon before the first item opens the lead-in, so a
    // "Note: the rules: a; b; c" keeps the whole of "Note: the rules".
    const colon = colonsBefore(colons, span, first(inside)[0])[0];
    if (!colon) continue;

    return promote({
      rule: RULE.SEMICOLON_LIST,
      src,
      view,
      span,
      leadIn: cleanLeadIn(src.slice(span[0], colon[0])),
      items: itemsBetween(src, [colon, ...inside], span[1]).map((text) => ({ text })),
      ordered: false,
    });
  }
  return null;
};

const fix: Rule["fix"] = ({ doc, options }) => {
  const minItems = minItemsOf(options, DEFAULT_MIN_SEMICOLON_ITEMS);
  return doc.paragraphs
    .map((view) => fixParagraph(doc.src, view, minItems))
    .filter((edit): edit is Edit => edit !== null);
};

export const listSemicolonDelimitedRun: Rule = {
  id: RULE.SEMICOLON_LIST,
  category: "list",
  summary: "semicolon-delimited list (2+ ';' in one sentence)",
  options: MIN_ITEMS,
  check,
  fix,
};
