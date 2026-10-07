// frontmatter-description-multiline-string, written in TypeScript. A description
// with several sentences written on one line. The fixer rewrites it as a folded
// block scalar, one sentence per line, which YAML reads back as the same string.
//
//   description: First sentence. Second sentence.
//
// becomes
//
//   description: >-
//     First sentence.
//     Second sentence.
//
// The edit changes how the value is written and nothing it means, and it says so
// with the `same-frontmatter-data` expectation. The engine parses the YAML before
// and after and refuses the edit unless both give identical data.

import type { CheckContext, FixContext, FrontmatterScalar, PluginEdit, PluginFinding, PluginRule } from "@jpeakai/prose-gates";

export const categories: Record<string, string> = {
  frontmatter: "Keys in the leading metadata block of a file",
};

type Context = Pick<CheckContext | FixContext, "doc" | "options" | "helpers">;

// The scalars this rule would rewrite: a single-line plain or quoted string, on
// the same line as its key, with two or more sentences, and no comment after it.
// Anything else is left alone, and no finding is raised for it.
const candidates = ({ doc, options, helpers }: Context): FrontmatterScalar[] => {
  const frontmatter = doc.frontmatter;
  if (!frontmatter) return [];
  const keys = (options.keys as string[] | undefined) ?? ["description"];
  return frontmatter.scalars.filter((scalar) => {
    if (scalar.key === null || !keys.includes(scalar.key)) return false;
    if (scalar.style === "literal" || scalar.style === "folded") return false;
    if (scalar.keyLine !== scalar.line || scalar.value.includes("\n")) return false;
    if (helpers.sentences(scalar.value).length < 2) return false;
    // A comment after the value would become part of the block scalar.
    const lineEnd = doc.src.indexOf("\n", scalar.end);
    const rest = doc.src.slice(scalar.end, lineEnd === -1 ? undefined : lineEnd);
    return rest.trim() === "";
  });
};

const rule: PluginRule = {
  category: "frontmatter",
  summary: "multi-sentence frontmatter value on one line; write it as a folded block",
  options: { keys: "string[]" },
  check(ctx): PluginFinding[] {
    return candidates(ctx).map((scalar) => ({
      line: scalar.line,
      message: `${scalar.path.join(".")}: ${ctx.helpers.sentences(scalar.value).length} sentences on one line; write it as a folded block scalar`,
    }));
  },
  fix(ctx): PluginEdit[] {
    return candidates(ctx).map((scalar) => {
      const pad = " ".repeat(scalar.indent + 2);
      const lines = ctx.helpers.sentences(scalar.value).map((sentence) => `${pad}${sentence}`);
      return {
        start: scalar.start,
        end: scalar.end,
        text: `>-\n${lines.join("\n")}`,
        expect: { kind: "same-frontmatter-data" },
      };
    });
  },
};

export default rule;
