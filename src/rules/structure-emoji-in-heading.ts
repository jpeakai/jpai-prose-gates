// structure-emoji-in-heading: an emoji or a decorative arrow in a heading. A heading names what its section
// holds, and a pictograph in front of it decorates every section alike.

import type { Heading, Node } from "mdast";
import { SKIP, visitParents } from "unist-util-visit-parents";
import { quoted, tellFinding, textOf } from "../tells.ts";
import { type Finding, RULE, type Rule } from "./types.ts";

// A pictograph, an emoji, or an arrow used as an ornament. The copyright, registered and trade mark
// signs count as pictographs in Unicode and belong in a heading, so they are excluded.
const PICTOGRAPH = /(?![©®™])\p{Extended_Pictographic}|\p{Emoji_Presentation}|[→⇒]/gu;

const check: Rule["check"] = ({ doc, file }) => {
  const found: Finding[] = [];
  visitParents(doc.tree, (node: Node, ancestors) => {
    if (node.type === "code" || node.type === "blockquote") return SKIP;
    if (node.type !== "heading" || quoted(ancestors)) return undefined;
    const glyphs = [...new Set(textOf(node as Heading, false).match(PICTOGRAPH) ?? [])];
    if (glyphs.length === 0) return undefined;
    found.push(
      tellFinding(RULE.EMOJI_HEADING, file, node.position?.start.line ?? 1, {
        what: "emoji in a heading",
        evidence: glyphs.join(" "),
        instruction: "Remove the emoji and let the words name the section.",
      }),
    );
    return undefined;
  });
  return found;
};

export const structureEmojiInHeading: Rule = {
  id: RULE.EMOJI_HEADING,
  category: "structure",
  summary: "an emoji or decorative arrow in a heading",
  defaultSeverity: "off",
  check,
};
