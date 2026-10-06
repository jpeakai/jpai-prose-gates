// frontmatter-description-word-budget: a sentence in a frontmatter value that
// runs past the word budget. It reads the keys named in `keys`, which default
// to `description`, so it covers the description of an agent skill. It is a
// plain module so the same file works as a local rule in .prose-gates/rules and
// inside a packaged plugin.
//
// It never fixes: shortening a sentence changes its words.

export const categories = {
  frontmatter: "Keys in the leading metadata block of a file",
};

export default {
  category: "frontmatter",
  summary: "sentence in a frontmatter value longer than the word budget",
  options: { keys: "string[]", maxWords: "number" },
  check({ doc, maxWords, options, helpers }) {
    const keys = options.keys ?? ["description"];
    const frontmatter = doc.frontmatter;
    if (!frontmatter) return [];
    return frontmatter.entries
      .filter((entry) => keys.includes(entry.key))
      .flatMap((entry) =>
        helpers
          .sentences(entry.value)
          .filter((sentence) => helpers.words(sentence) > maxWords)
          .map((sentence) => ({ line: entry.line, message: `${entry.key}: ${helpers.lengthMessage(sentence, maxWords)}` })),
      );
  },
};
