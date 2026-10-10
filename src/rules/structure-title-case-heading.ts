// structure-title-case-heading: a heading in title case, where every main word is capitalised. The tell is
// a small word such as "And" or "Of" written with a capital, which a proper name rarely has, together
// with at least two main words that are capitalised too. A heading of proper names, such as a product
// name, can still match, which is why the rule starts off.

import type { Heading, Node } from "mdast";
import { SKIP, visitParents } from "unist-util-visit-parents";
import { quoted, tellFinding, textOf } from "../tells.ts";
import { type Finding, RULE, type Rule } from "./types.ts";

const SMALL = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "or",
  "over",
  "the",
  "to",
  "with",
]);

const MIN_WORDS = 4;
const MIN_MAIN_WORDS = 2;

const isTitleCase = (text: string): boolean => {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < MIN_WORDS) return false;
  const rest = words.slice(1);
  const capitalSmall = rest.some((w) => SMALL.has(w.toLowerCase()) && /^[A-Z]/.test(w));
  const main = rest.filter((w) => /^[A-Za-z][A-Za-z.]{3,}$/.test(w) && !SMALL.has(w.toLowerCase()));
  return capitalSmall && main.length >= MIN_MAIN_WORDS && main.every((w) => /^[A-Z]/.test(w));
};

const check: Rule["check"] = ({ doc, file }) => {
  const found: Finding[] = [];
  visitParents(doc.tree, (node: Node, ancestors) => {
    if (node.type === "code" || node.type === "blockquote") return SKIP;
    if (node.type !== "heading" || quoted(ancestors)) return undefined;
    const text = textOf(node as Heading).trim();
    if (!isTitleCase(text)) return undefined;
    found.push(
      tellFinding(RULE.TITLE_CASE, file, node.position?.start.line ?? 1, {
        what: "heading in title case",
        evidence: text,
        instruction: "Use sentence case: capitalise the first word and proper names only.",
        preserve: "Every proper name, acronym and product name exactly as written.",
      }),
    );
    return undefined;
  });
  return found;
};

export const structureTitleCaseHeading: Rule = {
  id: RULE.TITLE_CASE,
  category: "structure",
  summary: "a heading that capitalises every main word",
  defaultSeverity: "off",
  check,
};
