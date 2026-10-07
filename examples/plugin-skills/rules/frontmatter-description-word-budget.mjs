// frontmatter-description-word-budget: a sentence in a frontmatter value that
// runs past the word budget. It reads every string whose nearest key is in
// `keys`, which default to `description`, at any depth, so it covers the
// description of an agent skill and a description nested under a `metadata` key.
// It is a plain module so the same file works as a local rule in
// .prose-gates/rules and inside a packaged plugin.
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
