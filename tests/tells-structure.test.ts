// The structure, sentence and punctuation tells. These read the markdown tree, not just prose, so each is tested
// on a heading, a list or a glyph in the places it must see, and in the places it must leave alone.

import { describe, expect, test } from "bun:test";
import { fixMarkdown } from "../src/index.ts";
import { tell, tellsOn } from "./helpers.ts";

describe("structure-emoji-in-heading", () => {
  const RULE = "structure-emoji-in-heading";

  test.each([
    ["an emoji", "## 🚀 Launch phase\n"],
    ["an emoji after the words", "## Launch phase 🚀\n"],
    ["a lightbulb", "# 💡 Key insight\n"],
    ["a check mark", "### ✅ Done\n"],
    ["an ornamental arrow", "## Next steps →\n"],
    ["an emoji in emphasis", "## The **🎯 goal**\n"],
  ])("reports %s", async (_name, src) => {
    expect(await tell(src, RULE)).toHaveLength(1);
  });

  test.each([
    ["plain words", "## Launch phase\n"],
    ["a trade mark sign", "## Acme™ and Widget®\n"],
    ["a copyright sign", "## Licence ©\n"],
    ["an emoji in a paragraph, which another matter", "A paragraph 🚀 here.\n"],
    ["an emoji in a quotation", "> ## 🚀 Launch\n"],
    ["an emoji in code", "## Use `🚀` carefully\n"],
  ])("leaves %s alone", async (_name, src) => {
    expect(await tell(src, RULE)).toEqual([]);
  });

  test("names the pictograph and the line", async () => {
    const [finding] = await tell("Intro.\n\n## 🚀 Launch phase\n", RULE);
    expect(finding?.line).toBe(3);
    expect(finding?.evidence).toBe("🚀");
  });
});

describe("structure-thematic-break-density", () => {
  const RULE = "structure-thematic-break-density";
  const section = (n: number): string => `---\n\n## Part ${n}\n\nText ${n}.\n\n`;

  test("reports three rules that each sit before a heading, once", async () => {
    const found = await tell(`Intro.\n\n${section(1)}${section(2)}${section(3)}`, RULE);
    expect(found).toHaveLength(1);
    expect(found[0]?.line).toBe(3);
    expect(found[0]?.message).toContain("3 of them");
  });

  test("leaves two alone, and lets a project change the count", async () => {
    const src = `Intro.\n\n${section(1)}${section(2)}`;
    expect(await tell(src, RULE)).toEqual([]);
    expect(await tell(src, RULE, { [RULE]: ["warn", { min: 2 }] })).toHaveLength(1);
  });

  test("counts only a rule right before a heading", async () => {
    const src = "One.\n\n---\n\nTwo.\n\n---\n\nThree.\n\n---\n\nFour.\n";
    expect(await tell(src, RULE)).toEqual([]);
  });

  test("does not count frontmatter as a break", async () => {
    const src = `---\ntitle: x\n---\n\n## One\n\nText.\n\n## Two\n\nText.\n\n## Three\n\nText.\n`;
    expect(await tell(src, RULE)).toEqual([]);
  });
});

describe("structure-title-case-heading", () => {
  const RULE = "structure-title-case-heading";

  test.each([
    "## Strategic Negotiations And Global Partnerships",
    "## How To Configure ESLint With TypeScript",
    "### Getting Started With The Business Model Canvas",
    "## Key Takeaways From The Keynote",
  ])("reports %s", async (heading) => {
    expect(await tell(`${heading}\n`, RULE)).toHaveLength(1);
  });

  test.each([
    "## Strategic negotiations and global partnerships",
    "## Data model",
    "## Why Node.js is fast",
    "## Install Node.js And Bun",
    "## Rules And Tools",
    "## The Business Model",
    "## OpenAI Vision Models",
  ])("leaves %s alone", async (heading) => {
    expect(await tell(`${heading}\n`, RULE)).toEqual([]);
  });

  test("leaves a quoted heading alone", async () => {
    expect(await tell("> ## Strategic Negotiations And Global Partnerships\n", RULE)).toEqual([]);
  });

  test("asks to keep proper names while it lowers the rest", async () => {
    const [finding] = await tell("## Using GitHub Actions For Release Automation\n", RULE);
    expect(finding?.preserve).toContain("proper name");
  });
});

describe("structure-heading-restating-sentence", () => {
  const RULE = "structure-heading-restating-sentence";

  test("reports a first sentence made only of the heading's own words", async () => {
    const [finding] = await tell("## Configuration options\n\nConfiguration options.\n\nThen the real text.\n", RULE);
    expect(finding?.line).toBe(3);
  });

  test("ignores a plural s and a small word", async () => {
    expect(await tell("## Installing the package\n\nThe packages.\n", RULE)).toHaveLength(1);
  });

  test("leaves a sentence that adds a word alone", async () => {
    expect(await tell("## Installation\n\nInstallation takes a minute.\n", RULE)).toEqual([]);
    expect(await tell("## Performance\n\nSpeed matters.\n", RULE)).toEqual([]);
  });

  test("leaves a long first sentence alone", async () => {
    const long = "configuration options for every part of the system and then some more words to run long enough";
    expect(await tell(`## Configuration options\n\n${long}.\n`, RULE)).toEqual([]);
  });

  test("needs a paragraph right after the heading", async () => {
    expect(await tell("## Configuration options\n\n- Configuration options.\n", RULE)).toEqual([]);
    expect(await tell("## Configuration options\n", RULE)).toEqual([]);
  });
});

describe("structure-bold-label-list-item", () => {
  const RULE = "structure-bold-label-list-item";

  test("reports a list whose every item opens with a bold label and a colon", async () => {
    const src =
      "- **User experience:** A new interface.\n- **Performance:** Faster algorithms.\n- **Security:** Encryption.\n";
    const found = await tell(src, RULE);
    expect(found).toHaveLength(1);
    expect(found[0]?.evidence).toBe("User experience:");
  });

  test("reads a colon outside the bold too", async () => {
    const src = "- **One**: a.\n- **Two**: b.\n- **Three**: c.\n";
    expect(await tell(src, RULE)).toHaveLength(1);
  });

  test("leaves a mixed list, a short list and a plain list alone", async () => {
    expect(await tell("- **One:** a.\n- two b.\n- **Three:** c.\n", RULE)).toEqual([]);
    expect(await tell("- **One:** a.\n- **Two:** b.\n", RULE)).toEqual([]);
    expect(await tell("- one\n- two\n- three\n", RULE)).toEqual([]);
    expect(await tell("- **Bold** but no colon.\n- **Bold** again.\n- **Bold** more.\n", RULE)).toEqual([]);
  });

  test("starts off, because the style is a choice many documents make", async () => {
    const { checkMarkdown } = await import("../src/index.ts");
    const src = "- **One:** a.\n- **Two:** b.\n- **Three:** c.\n";
    expect((await checkMarkdown(src, "doc.md")).map((f) => f.rule)).not.toContain(RULE);
  });
});

describe("sentence-repeated-opening-run", () => {
  const RULE = "sentence-repeated-opening-run";

  test("reports three sentences that open the same way, once", async () => {
    const found = await tell("She noted the door. She noted the lock. She filed both away.\n", RULE);
    expect(found).toHaveLength(1);
    expect(found[0]?.message).toContain('3 sentences in a row begin with "she"');
  });

  test("ignores the, a and an, which prose repeats constantly", async () => {
    expect(await tell("The parser reads it. The tree is built. The rules run.\n", RULE)).toEqual([]);
  });

  test("ignores inline code at the start, which is not a word the author chose", async () => {
    const src = "`a` is one. `b` is two. `c` is three.\n";
    expect(await tell(src, RULE)).toEqual([]);
  });

  test("leaves two alone, and lets a project change the length", async () => {
    const src = "She came. She saw.\n";
    expect(await tell(src, RULE)).toEqual([]);
    expect(await tell(src, RULE, { [RULE]: ["warn", { minRun: 2 }] })).toHaveLength(1);
  });

  test("does not run across paragraphs or list items", async () => {
    expect(await tell("She came.\n\nShe saw.\n\nShe left.\n", RULE)).toEqual([]);
    expect(await tell("- She came.\n- She saw.\n- She left.\n", RULE)).toEqual([]);
  });

  test("reports each run in a paragraph separately", async () => {
    const src = "We ran it. We saw it. We fixed it. Then it passed. They ran it. They saw it. They fixed it.\n";
    expect(await tell(src, RULE)).toHaveLength(2);
  });
});

describe("sentence-short-fragment-run", () => {
  const RULE = "sentence-short-fragment-run";

  test("reports a row of very short sentences", async () => {
    const found = await tell("It had no taste. No prior. No nostalgia. No fear. The old rules were gone.\n", RULE);
    expect(found).toHaveLength(1);
    expect(found[0]?.evidence).toBe("It had no taste. No prior. No nostalgia. No fear.");
  });

  test("leaves one emphatic short sentence alone", async () => {
    expect(await tell("The build failed. Fix it before you merge the change into main.\n", RULE)).toEqual([]);
  });

  test("does not read a lone initial as a fragment", async () => {
    expect(await tell("P. Resnick. IETF.\n", RULE)).toEqual([]);
  });

  test("lets a project change the run length", async () => {
    const src = "No prior. No taste.\n";
    expect(await tell(src, RULE)).toEqual([]);
    expect(await tell(src, RULE, { [RULE]: ["warn", { minRun: 2 }] })).toHaveLength(1);
  });
});

describe("punctuation-spaced-dash-in-prose", () => {
  const RULE = "punctuation-spaced-dash-in-prose";

  test.each([
    ["a spaced en dash", "The policy – announced without warning – affects workers.\n"],
    ["a spaced double hyphen", "The changes -- long overdue -- take effect now.\n"],
    ["a dash in a heading", "## Plan – and then some\n"],
  ])("reports %s", async (_name, src) => {
    expect((await tell(src, RULE)).length).toBeGreaterThan(0);
  });

  test.each([
    ["a number range", "Pages 3–5 and years 2020–2025.\n"],
    ["a command flag", "Run it with --fix and --json.\n"],
    ["a hyphen", "A well-known tool - used daily.\n"],
    ["code", "Use `a -- b` here.\n"],
    ["a quotation", "> The changes -- long overdue -- take effect.\n"],
    ["an em dash, which has its own rule", "A fix — here.\n"],
  ])("leaves %s alone", async (_name, src) => {
    expect(await tell(src, RULE)).toEqual([]);
  });

  test("has no fixer, so --fix leaves it", async () => {
    const src = "A fix – here.\n";
    expect(await fixMarkdown(src, tellsOn())).toBe(src);
  });
});

describe("punctuation-curly-quote-in-prose", () => {
  const RULE = "punctuation-curly-quote-in-prose";

  test("reports a curly double quote", async () => {
    expect(await tell("He said “the project is on track” today.\n", RULE)).toHaveLength(2);
  });

  test("leaves a straight quote, an apostrophe and code alone", async () => {
    expect(await tell('He said "stop" and it\'s done.\n', RULE)).toEqual([]);
    expect(await tell("He said it’s done.\n", RULE)).toEqual([]);
    expect(await tell("Use `“x”` as a string.\n", RULE)).toEqual([]);
  });

  test("starts off, because editors curl quotes on their own", async () => {
    const { checkMarkdown } = await import("../src/index.ts");
    expect((await checkMarkdown("He said “stop”.\n", "doc.md")).map((f) => f.rule)).not.toContain(RULE);
  });
});
