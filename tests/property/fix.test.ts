// Properties every fix must hold over generated markdown, built from the
// same slop the rules hunt: wrapped sentences, dashes, interpuncts, inline
// enumerations and semicolon lists, mixed with the structures that make a
// rewrite dangerous (code spans, links, emphasis, lists, quotes, fences).

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { fingerprint } from "../../src/fix/verify.ts";
import { checkMarkdown, fixMarkdown, fixMarkdownReport } from "../../src/index.ts";
import { parse } from "../../src/model.ts";

const word = fc.constantFrom("alpha", "beta", "gamma", "delta", "Bun", "tree", "parser", "x2", "API", "docs");

const inline = fc.oneof(
  { weight: 6, arbitrary: word },
  { weight: 1, arbitrary: word.map((w) => `\`${w}\``) },
  { weight: 1, arbitrary: word.map((w) => `*${w}*`) },
  { weight: 1, arbitrary: word.map((w) => `[${w}](https://e.example/${w})`) },
  { weight: 1, arbitrary: fc.constantFrom("—", " — ", "·", " · ", ";", ",", ":", "(a)", "(b)", "(1)", "(2)") },
);

const sentence = fc
  .array(inline, { minLength: 1, maxLength: 14 })
  .chain((parts) => fc.constantFrom(".", "!", "?", "").map((end) => `${parts.join(" ")}${end}`));

const joiner = fc.constantFrom(" ", "\n", " ", " ");

const paragraph = fc.array(fc.tuple(sentence, joiner), { minLength: 1, maxLength: 4 }).map((pairs) =>
  pairs
    .map(([s, j]) => s + j)
    .join("")
    .trimEnd(),
);

const block = fc.oneof(
  { weight: 6, arbitrary: paragraph },
  { weight: 1, arbitrary: paragraph.map((p) => `# ${p.replace(/\n/g, " ")}`) },
  { weight: 1, arbitrary: paragraph.map((p) => `- ${p.replace(/\n/g, "\n  ")}`) },
  { weight: 1, arbitrary: paragraph.map((p) => `> ${p.replace(/\n/g, "\n> ")}`) },
  { weight: 1, arbitrary: paragraph.map((p) => `\`\`\`\n${p}\n\`\`\``) },
);

const doc = fc.array(block, { minLength: 1, maxLength: 5 }).map((blocks) => `${blocks.join("\n\n")}\n`);

const RUNS = { numRuns: 400 };

describe("fix properties", () => {
  test("never throws, even on content the fixers cannot handle", () => {
    fc.assert(
      fc.property(doc, (src) => {
        fixMarkdown(src);
      }),
      RUNS,
    );
  });

  test("is idempotent", () => {
    fc.assert(
      fc.property(doc, (src) => {
        const once = fixMarkdown(src);
        expect(fixMarkdown(once)).toBe(once);
      }),
      RUNS,
    );
  });

  test("preserves every content word", () => {
    fc.assert(
      fc.property(doc, (src) => {
        expect(fingerprint(parse(fixMarkdown(src)))).toEqual(fingerprint(parse(src)));
      }),
      RUNS,
    );
  });

  test("never increases the finding count", () => {
    fc.assert(
      fc.property(doc, (src) => {
        expect(checkMarkdown(fixMarkdown(src), "doc.md").length).toBeLessThanOrEqual(
          checkMarkdown(src, "doc.md").length,
        );
      }),
      RUNS,
    );
  });

  test("leaves fenced code byte-identical", () => {
    const fence = fc.tuple(paragraph, paragraph).map(([a, b]) => `${a}\n\n\`\`\`\n${b}\n\`\`\`\n`);
    fc.assert(
      fc.property(fence, (src) => {
        const body = src.slice(src.indexOf("```"));
        expect(fixMarkdown(src).endsWith(body)).toBe(true);
      }),
      RUNS,
    );
  });

  test("never applies a PG002 fix", () => {
    fc.assert(
      fc.property(doc, (src) => {
        expect(fixMarkdownReport(src).applied.some((a) => a.rule === "PG002")).toBe(false);
      }),
      RUNS,
    );
  });
});
