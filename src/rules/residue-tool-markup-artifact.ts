// residue-tool-markup-artifact: markup a chat tool leaves behind when its output is pasted as text, such
// as a citation object, a tracking parameter or a wrapper tag. It reads text, link and image addresses,
// and raw html. Code and quoted text are exempt, because a document about these markers shows them.
// It reports only: the marker stood for a citation or a card, and deleting it is the author's choice.

import type { Node } from "mdast";
import { SKIP, visitParents } from "unist-util-visit-parents";
import { scan } from "../lexicon.ts";
import { TOOL_MARKUP } from "../lexicons/tool-markup.ts";
import { quoted, tellFinding } from "../tells.ts";
import { type Finding, RULE, type Rule } from "./types.ts";

type Carrier = Node & { value?: string; url?: string; title?: string | null; alt?: string | null };

// What a node carries that a reader or a browser would see: its text, or the address a link points to.
const carried = (node: Carrier): string[] => {
  if (node.type === "text" || node.type === "html") return [node.value ?? ""];
  if (node.type === "link" || node.type === "definition") return [node.url ?? "", node.title ?? ""];
  if (node.type === "image") return [node.url ?? "", node.title ?? "", node.alt ?? ""];
  return [];
};

const check: Rule["check"] = ({ doc, file }) => {
  const found: Finding[] = [];
  const seen = new Set<string>();
  visitParents(doc.tree, (node: Node, ancestors) => {
    if (node.type === "code" || node.type === "inlineCode" || node.type === "blockquote") return SKIP;
    const startLine = node.position?.start.line ?? 1;
    for (const text of carried(node as Carrier)) {
      for (const { entry, text: evidence, index } of scan(TOOL_MARKUP, text)) {
        const line = startLine + (text.slice(0, index).match(/\n/g)?.length ?? 0);
        const key = `${line}:${evidence}`;
        if (seen.has(key) || quoted(ancestors)) continue;
        seen.add(key);
        found.push(
          tellFinding(RULE.TOOL_MARKUP, file, line, {
            what: `tool markup left in the text (${entry.label ?? "chat tool marker"})`,
            evidence,
            instruction: "Delete the marker. If the claim needs a source, add a real citation.",
            preserve: "The sentence the marker was attached to.",
          }),
        );
      }
    }
    return undefined;
  });
  return found;
};

export const residueToolMarkupArtifact: Rule = {
  id: RULE.TOOL_MARKUP,
  category: "residue",
  summary: "markup a chat tool leaves in pasted text (citation objects, tracking parameters)",
  check,
};
