// structure-bold-label-list-item: a list in which every item opens with a bold label and a colon. The
// decoration is on every item alike, so the bold carries no information. This is a style choice that
// many documents make on purpose, this repo's own among them, so the rule starts off and a project turns
// it on. A list reports once, and only when it has at least three items.

import type { List, ListItem, Node } from "mdast";
import { SKIP, visitParents } from "unist-util-visit-parents";
import { quoted, tellFinding, textOf } from "../tells.ts";
import { type Finding, RULE, type Rule } from "./types.ts";

const MIN_ITEMS = 3;

// The bold label an item opens with, when it has one: bold text that ends in a colon, or bold text with
// a colon straight after it.
const labelOf = (item: ListItem): string | null => {
  const paragraph = item.children[0];
  if (paragraph?.type !== "paragraph") return null;
  const [lead, after] = paragraph.children;
  if (lead?.type !== "strong") return null;
  const label = textOf(lead);
  const colon = label.trimEnd().endsWith(":") || (after?.type === "text" && after.value.startsWith(":"));
  return colon ? label.replace(/:\s*$/, "") : null;
};

const check: Rule["check"] = ({ doc, file }) => {
  const found: Finding[] = [];
  visitParents(doc.tree, (node: Node, ancestors) => {
    if (node.type === "code" || node.type === "blockquote") return SKIP;
    if (node.type !== "list" || quoted(ancestors)) return undefined;
    const items = (node as List).children;
    const labels = items.map(labelOf);
    if (items.length < MIN_ITEMS || labels.some((l) => l === null)) return undefined;
    found.push(
      tellFinding(RULE.BOLD_LABELS, file, node.position?.start.line ?? 1, {
        what: `every list item opens with a bold label (${items.length} items)`,
        evidence: `${labels[0]}:`,
        instruction: "If the labels add nothing the items do not, write the list as a sentence or drop the bold.",
      }),
    );
    return undefined;
  });
  return found;
};

export const structureBoldLabelListItem: Rule = {
  id: RULE.BOLD_LABELS,
  category: "structure",
  summary: "a list whose every item opens with a bold label and a colon",
  defaultSeverity: "off",
  check,
};
