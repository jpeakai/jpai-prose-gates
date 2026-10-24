// list-comma-plain-run: a long series of short plain-word items closing a
// sentence, as in "Tags: alpha, beta, rc, next, canary", is a hidden list.
// A short series such as "parse, fix and verify" is ordinary English, so
// the default threshold is five items, and the run has to be announced by
// a colon or joined by "and"/"or" before its last item. An item is one to
// three plain words: a code span, a number, a link or emphasis ends the
// run, so list-comma-code-run and list-comma-labelled-run keep theirs.
//
// The check counts the run that closes a sentence; the fix is stricter and
// needs a colon lead-in, because without one there is no telling where the
// first item starts.

import nlp from "compromise";
import { cleanLeadIn, itemsBetween, promote } from "../fix/promote.ts";
import type { ParagraphView } from "../model.ts";
import { colonsBefore, colonsIn, matchesInAll, proseSentences, sentenceSpans } from "../query.ts";
import { first, last, type Range, within } from "../text.ts";
import { MIN_ITEMS, minItemsOf } from "./options.ts";
import { type Edit, RULE, type Rule } from "./types.ts";

export const DEFAULT_MIN_PLAIN_ITEMS = 5;

// One to three plain words, and nothing else.
const WORD = "[A-Za-z][A-Za-z'’-]*";
const ITEM = new RegExp(`^${WORD}(?:\\s+${WORD}){0,2}$`);
const JOINER = /\s+(?:and|or)\s+/;
const OXFORD = /^(?:and|or)\s+/;
const TERMINAL = /[.!?]+$/;

// A verb between an item's first and last words makes it a clause with a
// subject, as in "magenta are colours". A verb at either end is still a
// name for a thing: "sign off", or "unit tests", which compromise reads as
// a verb. A participle after a determiner describes the noun, as
// language.ts reads "the signed tag".
const isClause = (item: string): boolean => {
  const doc = nlp(item);
  doc.match("(#Determiner|#Adjective|#Value) [(#PastTense|#Participle)] #Noun", 0).tag("Adjective");
  const terms = (doc.json() as { terms: { tags: string[] }[] }[]).flatMap((s) => s.terms);
  return terms.slice(1, -1).some((t) => t.tags.includes("Verb"));
};

// CODE is how prose spells a code span, which is list-comma-code-run's.
const isItem = (text: string): boolean => {
  const item = text.trim();
  return ITEM.test(item) && !/\bCODE\b/.test(item) && !isClause(item);
};

// The items of the run that closes a sentence, counted the way the fix will
// cut them, or 0 when the sentence does not close on one.
export const plainRun = (sentence: string): number => {
  const segments = sentence.replace(TERMINAL, "").trim().split(/,\s+/);
  const closing = segments.pop() as string;
  // "d, and e" has an Oxford comma, so its last segment is one item; "d and
  // e" holds the last two.
  const oxford = OXFORD.test(closing);
  const tail = oxford ? [closing.replace(OXFORD, "")] : closing.split(JOINER);
  if (!tail.every(isItem)) return 0;
  let items = tail.length;
  // The sentence's own first segment is never counted here: a short subject,
  // as in "One finding, with a file, ...", reads like an item.
  while (segments.length > 1 && isItem(last(segments))) {
    segments.pop();
    items++;
  }
  // After a colon, the segment before the run carries the first item. Without
  // one, where that item starts is a guess, so the segment is not counted:
  // the count can fall one short, but never runs one over.
  let colon = false;
  if (segments.length > 0) {
    const head = last(segments);
    const at = head.lastIndexOf(":");
    colon = at >= 0 && isItem(head.slice(at + 1));
    if (colon) items++;
  }
  return colon || oxford || tail.length > 1 ? items : 0;
};

const check: Rule["check"] = ({ doc, file, options }) => {
  const minItems = minItemsOf(options, DEFAULT_MIN_PLAIN_ITEMS);
  return proseSentences(doc)
    .map(({ view, sentence }) => ({ view, items: plainRun(sentence) }))
    .filter(({ items }) => items >= minItems)
    .map(({ view, items }) => ({
      file,
      line: view.line,
      rule: RULE.PLAIN_RUN,
      message: `comma-joined run of ${items} items; promote to a bullet list`,
    }));
};

const fixParagraph = (src: string, view: ParagraphView, minItems: number): Edit | null => {
  const commas = matchesInAll(src, view.directTexts, /,(?=\s)/);
  const colons = colonsIn(src, view);
  if (commas === null || colons === null) return null;
  for (const span of sentenceSpans(src, view)) {
    const inside = commas.filter((comma) => within(comma, span));
    if (inside.length === 0) continue;
    const colon = colonsBefore(colons, span, first(inside)[0]).pop();
    if (!colon) continue;
    // A final "and"/"or" with no comma before it is a cut of its own. After
    // an Oxford comma it is not, and the last item sheds it instead.
    const after = last(inside)[1];
    const rest = src.slice(after, span[1]);
    const joiner = /^\s+(?:and|or)\s+/.test(rest) ? null : JOINER.exec(rest);
    const cuts: Range[] = [colon, ...inside];
    if (joiner) cuts.push([after + joiner.index, after + joiner.index + joiner[0].length]);
    const items = itemsBetween(src, cuts, span[1]);
    if (items.length < minItems || !items.every(isItem)) continue;
    return promote({
      rule: RULE.PLAIN_RUN,
      src,
      view,
      span,
      leadIn: cleanLeadIn(src.slice(span[0], colon[0])),
      items: items.map((text) => ({ text })),
      ordered: false,
    });
  }
  return null;
};

const fix: Rule["fix"] = ({ doc, options }) => {
  const minItems = minItemsOf(options, DEFAULT_MIN_PLAIN_ITEMS);
  return doc.paragraphs
    .map((view) => fixParagraph(doc.src, view, minItems))
    .filter((edit): edit is Edit => edit !== null);
};

export const listCommaPlainRun: Rule = {
  id: RULE.PLAIN_RUN,
  category: "list",
  summary: `comma-joined run of plain-word items (default ${DEFAULT_MIN_PLAIN_ITEMS}+)`,
  options: MIN_ITEMS,
  check,
  fix,
};
