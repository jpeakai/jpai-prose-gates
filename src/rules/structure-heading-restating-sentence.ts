// structure-heading-restating-sentence: a heading followed by a short sentence that says nothing the heading
// did not. The test is strict and has no judgement in it: every content word of the first sentence must
// already be in the heading, ignoring a plural s. "Speed matters" under "Performance" passes, because
// whether two words mean the same is a reader's call. "Configuration options" under "Configuration
// options" does not.

import type { Heading, Node } from "mdast";
import { SKIP, visitParents } from "unist-util-visit-parents";
import { quoted, tellFinding, textOf } from "../tells.ts";
import { sentences } from "../text.ts";
import { type Finding, RULE, type Rule } from "./types.ts";

const STOP = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "our",
  "the",
  "this",
  "that",
  "to",
  "we",
  "with",
  "you",
  "your",
]);
const MAX_SENTENCE_WORDS = 10;

const contentWords = (text: string): string[] =>
  (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((w) => !STOP.has(w)).map((w) => w.replace(/s$/, ""));

const check: Rule["check"] = ({ doc, file }) => {
  const found: Finding[] = [];
  visitParents(doc.tree, (node: Node, ancestors) => {
    if (node.type === "code" || node.type === "blockquote") return SKIP;
    if (node.type !== "heading" || quoted(ancestors)) return undefined;
    const parent = ancestors.at(-1) as { children: Node[] } | undefined;
    const next = parent?.children[parent.children.indexOf(node) + 1];
    if (next?.type !== "paragraph") return undefined;
    const view = doc.paragraphs.find((p) => p.node === next);
    const first = view ? sentences(view.prose)[0] : undefined;
    if (!view || !first || first.split(/\s+/).length > MAX_SENTENCE_WORDS) return undefined;
    const heading = new Set(contentWords(textOf(node as Heading)));
    const said = contentWords(first);
    if (said.length === 0 || !said.every((w) => heading.has(w))) return undefined;
    found.push(
      tellFinding(RULE.HEADING_RESTATED, file, view.line, {
        what: "first sentence restates the heading",
        evidence: first,
        instruction: "Delete the sentence and begin with something the heading does not say.",
      }),
    );
    return undefined;
  });
  return found;
};

export const structureHeadingRestatingSentence: Rule = {
  id: RULE.HEADING_RESTATED,
  category: "structure",
  summary: "a first sentence whose every content word is already in the heading",
  defaultSeverity: "off",
  check,
};
