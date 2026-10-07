// frontmatter-description-word-budget, written in TypeScript. A sentence in a
// frontmatter value that runs past the word budget, for any string whose nearest
// key is in `keys` (default `description`), at any depth.
//
// It never fixes: shortening a sentence changes its words.
//
// The file is a plain module, so it works as a local rule in .prose-gates/rules
// and inside the packaged plugin. The type import is erased at run time, so the
// runtime only has to be able to import TypeScript.

import type { PluginFinding, PluginRule } from "@jpeakai/prose-gates";

export const categories: Record<string, string> = {
  frontmatter: "Keys in the leading metadata block of a file",
};

const rule: PluginRule = {
  category: "frontmatter",
  summary: "sentence in a frontmatter value longer than the word budget",
  options: { keys: "string[]", maxWords: "number" },
  check({ doc, maxWords, options, helpers }): PluginFinding[] {
    const keys = (options.keys as string[] | undefined) ?? ["description"];
    const frontmatter = doc.frontmatter;
    if (!frontmatter) return [];
    // `scalars` walks the whole YAML document, so a nested key matches too.
    return frontmatter.scalars
      .filter((scalar) => scalar.key !== null && keys.includes(scalar.key))
      .flatMap((scalar) =>
        helpers
          .sentences(scalar.value)
          .filter((sentence) => helpers.words(sentence) > maxWords)
          .map((sentence) => ({
            line: scalar.line,
            message: `${scalar.path.join(".")}: ${helpers.lengthMessage(sentence, maxWords)}`,
          })),
      );
  },
};

export default rule;
