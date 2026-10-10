// structure-thematic-break-density: a horizontal rule directly before most headings. A heading already
// divides sections, so a rule before each one is decoration. The rule counts top-level breaks that sit
// right before a heading and reports once, on the first. Frontmatter is not a break.

import { tellFinding } from "../tells.ts";
import { RULE, type Rule } from "./types.ts";

const DEFAULT_MIN = 3;

const check: Rule["check"] = ({ doc, file, options }) => {
  const min = typeof options.min === "number" ? options.min : DEFAULT_MIN;
  const before = doc.tree.children.flatMap((node, i) =>
    node.type === "thematicBreak" && doc.tree.children[i + 1]?.type === "heading" ? [node] : [],
  );
  const [first] = before;
  if (!first || before.length < min) return [];
  return [
    tellFinding(RULE.RULE_BETWEEN, file, first.position?.start.line ?? 1, {
      what: `horizontal rule before a heading (${before.length} of them)`,
      evidence: "---",
      instruction: "Remove the rules and let the headings divide the sections.",
    }),
  ];
};

export const structureThematicBreakDensity: Rule = {
  id: RULE.RULE_BETWEEN,
  category: "structure",
  summary: "a horizontal rule directly before several headings",
  defaultSeverity: "off",
  options: { min: "number" },
  check,
};
