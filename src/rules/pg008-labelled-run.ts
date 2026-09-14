// PG008: one sentence stringing 3+ comma-separated segments each led by a
// label (an inline-code span, or an identifier like PG001 / MD025 / S4)
// WITH content after it is a hidden list of labelled items. Bare labels
// ("A, B, and C are interchangeable") are a subject enumeration, not a
// list. An optional "Rules: " style intro on the first segment, and a
// joining "and"/"or", are tolerated.
//
// The check counts labelled segments; the fix is stricter and needs every
// segment of the sentence to be one, so no stray clause becomes a bullet.

import { cleanLeadIn, itemsOf, promote } from "../fix/promote.ts";
import type { ParagraphView } from "../model.ts";
import { colonsIn, matchesInAll, proseSentences, sentenceSpans } from "../query.ts";
import { collapse, first, type Range, spansBetween, within } from "../text.ts";
import { type Edit, RULE, type Rule } from "./types.ts";

// A labelled segment, built from its parts so each one can be read on its
// own: the conjunction that joins the final segment, an optional "Rules: "
// intro on the first, the label itself, and the content that makes it an
// item rather than a bare mention.
const JOINER = "(?:and\\s+|or\\s+)?";
const INTRO = "(?:[A-Za-z][\\w\\s-]{0,24}:\\s*)?";
const LABEL = "(?:CODE|[A-Z][A-Za-z]*\\d[\\w/-]*)";
const CONTENT = "\\s+\\S";
const LABELLED_SEGMENT = new RegExp(`^${JOINER}${INTRO}${LABEL}${CONTENT}`);

// The intro that may precede the first label, as the lead-in test reads it.
const INTRO_ONLY = /^[A-Za-z][\w\s-]{0,24}$/;

// A source slice as the check sees it: code spans become one CODE token.
const asProse = (src: string, view: ParagraphView, range: Range): string => {
  let out = "";
  let at = range[0];
  for (const [start, end] of view.codeRanges) {
    if (end <= range[0] || start >= range[1]) continue;
    out += `${src.slice(at, start)}CODE`;
    at = end;
  }
  return collapse(out + src.slice(at, range[1])).trim();
};

const labelledSegments = (sentence: string): number =>
  sentence.split(/,\s+/).filter((segment) => LABELLED_SEGMENT.test(segment)).length;

const check: Rule["check"] = ({ doc, file }) =>
  proseSentences(doc)
    .map(({ view, sentence }) => ({ view, labelled: labelledSegments(sentence) }))
    .filter(({ labelled }) => labelled >= 3)
    .map(({ view, labelled }) => ({
      file,
      line: view.line,
      rule: RULE.LABELLED_RUN,
      message: `comma-joined run of ${labelled} labelled items; promote to a bullet list`,
    }));

const fix: Rule["fix"] = ({ doc }) => {
  const { src } = doc;
  const edits: Edit[] = [];
  for (const view of doc.paragraphs) {
    const commas = matchesInAll(src, view.directTexts, /,(?=\s)/);
    const colons = colonsIn(src, view);
    if (commas === null || colons === null) continue;
    for (const span of sentenceSpans(src, view)) {
      const inside = commas.filter((comma) => within(comma, span));
      if (inside.length < 2) continue;
      // The sentence start is the cut before the first segment, so the spans
      // between the cuts are exactly the comma-separated segments.
      const segments = spansBetween([[span[0], span[0]], ...inside], span[1]);
      if (!segments.every((segment) => LABELLED_SEGMENT.test(asProse(src, view, segment)))) continue;

      // An intro colon in the first segment, before its label, is the lead-in.
      // The first item then starts after it, so the intro is not repeated as
      // both the lead-in and the head of the first bullet.
      const opening = first(segments);
      const colon = colons.find((c) => within(c, opening));
      const intro = colon !== undefined && INTRO_ONLY.test(collapse(src.slice(span[0], colon[0])).trim());
      const items: Range[] = intro && colon ? [[colon[1], opening[1]], ...segments.slice(1)] : segments;

      const edit = promote({
        rule: RULE.LABELLED_RUN,
        src,
        view,
        span,
        leadIn: intro && colon ? cleanLeadIn(src.slice(span[0], colon[0])) : null,
        items: itemsOf(src, items).map((text) => ({ text })),
        ordered: false,
      });
      if (edit) edits.push(edit);
      break; // one promotion per paragraph; the engine re-parses and comes back
    }
  }
  return edits;
};

export const pg008: Rule = {
  id: RULE.LABELLED_RUN,
  category: "list",
  summary: "comma-joined labelled run (3+ labelled segments)",
  check,
  fix,
};
