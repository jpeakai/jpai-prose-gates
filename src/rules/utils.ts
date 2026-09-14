// What more than one rule needs in order to read a document the same way.
// The helpers in src/fix/ work on source offsets, so they belong to the fix
// half; these work on the views, sentences and counts a rule reasons about,
// so a reader can tell which half of a rule module a call belongs to.

import { matchesInAll, within } from "../fix/spans.ts";
import { type DocModel, type ParagraphView, type Range, sentences, type TextView } from "../model.ts";

// Table cells are exempt by construction, so every rule that reads running
// prose starts here rather than filtering for itself.
export const proseParagraphs = (doc: DocModel): ParagraphView[] => doc.paragraphs.filter((view) => !view.inTable);

// One sentence with the paragraph it came from, so a finding can name the
// line without the rule tracking it through a nested loop.
export interface ProseSentence {
  view: ParagraphView;
  sentence: string;
}

export const proseSentences = (doc: DocModel): ProseSentence[] =>
  proseParagraphs(doc).flatMap((view) => sentences(view.prose).map((sentence) => ({ view, sentence })));

// The prose text nodes holding a glyph. This is how a punctuation rule finds
// what it reports, and it reads headings and list items as well as
// paragraphs, because a stray glyph is wrong wherever it sits.
export const textsContaining = (doc: DocModel, glyph: string): TextView[] =>
  doc.texts.filter((text) => text.value.includes(glyph));

// How many times a pattern matches. The pattern must be global: matchAll
// throws otherwise, which is the loud failure we want over a silent count
// of one.
export const countOf = (text: string, pattern: RegExp): number => [...text.matchAll(pattern)].length;

// The colons of a paragraph as source ranges, or null when one of them
// cannot be trusted. Every rule that promotes a list needs these to find the
// lead-in that announces it.
export const colonsIn = (src: string, view: ParagraphView): Range[] | null => matchesInAll(src, view.directTexts, /:/);

// The colons that could announce a list: inside `range`, and closing before
// the first item starts. Which one a rule takes is the only thing the list
// rules disagree about, so they pick from this rather than each writing the
// filter again.
export const colonsBefore = (colons: Range[], range: Range, item: number): Range[] =>
  colons.filter((colon) => within(colon, range) && colon[1] <= item);
