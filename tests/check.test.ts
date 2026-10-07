import { describe, expect, test } from "bun:test";
import { checkMarkdown, fixMarkdown } from "../src/index.ts";
import { countClauses, lengthMessage } from "../src/rules/sentence-word-budget-exceeded.ts";
import { rules } from "./helpers.ts";

describe("sentence-one-per-line mid-sentence line wrap", () => {
  test("flags a sentence wrapped across lines", async () => {
    expect(await rules("This sentence continues on\nthe next line for no reason.\n")).toContain(
      "sentence-one-per-line",
    );
  });

  test("accepts one sentence per line", async () => {
    expect(await rules("First sentence here.\nSecond sentence follows.\n")).toHaveLength(0);
  });

  test("ignores wraps inside fenced code blocks", async () => {
    expect(await rules("```text\nnot a sentence just\nwrapped code\n```\n")).toHaveLength(0);
  });

  test("reports the wrapped line number", async () => {
    const findings = await checkMarkdown("# Title\n\nGood line here.\nBad wrap starts\nhere.\n", "doc.md");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(4);
  });
});

describe("sentence-word-budget-exceeded sentence word budget", () => {
  test("flags a sentence over 25 words", async () => {
    const long = `${Array.from({ length: 30 }, (_, i) => `word${i}`).join(" ")}.`;
    expect(await rules(`${long}\n`)).toContain("sentence-word-budget-exceeded");
  });

  test("respects a custom budget", async () => {
    expect(await rules("One two three four five six seven eight.\n", 5)).toContain("sentence-word-budget-exceeded");
  });

  test("counts inline code as one word", async () => {
    const words = Array.from({ length: 20 }, (_, i) => `w${i}`).join(" ");
    const found = await rules(`${words} \`a very long inline code span with many words inside it\`.\n`);
    expect(found.filter((r) => r === "sentence-word-budget-exceeded")).toHaveLength(0);
  });

  test.each([
    ["a simple sentence", "The parser reads the file.", 1],
    ["a semicolon", "The parser reads the file; the rules query it.", 2],
    ["a colon with text after it", "One rule matters: never guess.", 2],
    ["a comma before a conjunction", "The parser reads the file, and the rules query it.", 2],
    ["a relative clause counted once", "The tree, which the parser builds, is shared.", 2],
    ["a leading subordinator", "Because the tree is shared, every rule agrees if it reads it.", 3],
    ["subordinators only as whole words", "The iffy whichever widget.", 1],
  ])("counts clauses in %s", (_, sentence, expected) => {
    expect(countClauses(sentence)).toBe(expected);
  });

  test("the message asks for a split into at least as many sentences as clauses", () => {
    const sentence =
      "The fixer reads the tree, and it proposes an edit because the rule fired, which the engine verifies when it reparses the document again.";
    expect(lengthMessage(sentence, 10)).toBe(
      `sentence has 24 words (budget 10) and 5 potential clauses; split it into about 5 shorter sentences, one idea each, rather than compressing the wording: "${sentence.slice(0, 60)}..."`,
    );
  });

  test("a long single clause still asks for at least two sentences, scaled by length", () => {
    const words = Array.from({ length: 60 }, (_, i) => `w${i}`).join(" ");
    expect(lengthMessage(words, 25)).toContain("and 1 potential clause; split it into about 3 shorter sentences");
  });

  test("a short excerpt is not marked as truncated", () => {
    expect(lengthMessage("One two three four five six.", 5)).toEndWith(': "One two three four five six."');
  });
});

describe("list-semicolon-delimited-run semicolon lists", () => {
  test("flags two or more semicolons in one sentence", async () => {
    expect(await rules("We ship parsing; then linting; then fixing.\n")).toContain("list-semicolon-delimited-run");
  });

  test("allows a single joining semicolon", async () => {
    expect(
      (await rules("The cache is warm; queries are fast.\n")).filter((r) => r === "list-semicolon-delimited-run"),
    ).toHaveLength(0);
  });
});

describe("punctuation-em-dash-in-prose/punctuation-interpunct-in-prose glyph tells", () => {
  test("flags em-dash and interpunct in prose but not in code", async () => {
    const found = await rules("A tell — right here.\n\nAlso a · dot.\n\n```\ncode — with · glyphs\n```\n");
    expect(found).toContain("punctuation-em-dash-in-prose");
    expect(found).toContain("punctuation-interpunct-in-prose");
    expect(found).toHaveLength(2);
  });
});

describe("list-interpunct-joined-run interpunct-joined inline list", () => {
  test("flags a separator run as one disguised list, not per-glyph punctuation-interpunct-in-prose spam", async () => {
    const found = await rules("[a](https://a) · [b](https://b) · [c](https://c) · plain d\n");
    expect(found).toEqual(["list-interpunct-joined-run"]);
  });

  test("counts the items in the message", async () => {
    const findings = await checkMarkdown("one · two · three · four\n", "doc.md");
    expect(findings[0]?.message).toContain("4 items");
  });

  test("a single stray interpunct stays punctuation-interpunct-in-prose", async () => {
    expect(await rules("A stray · here.\n")).toEqual(["punctuation-interpunct-in-prose"]);
  });
});

describe("list-inline-enumeration-markers inline enumeration", () => {
  test("flags (a)/(b) enumerators inlined in one paragraph", async () => {
    const src = "Two duties: (a) *name things* using canonical terms; (b) *keep it current* in the same change.\n";
    expect(await rules(src)).toContain("list-inline-enumeration-markers");
  });

  test("flags numeric (1)/(2) families", async () => {
    expect(await rules("Steps: (1) parse the file and (2) emit findings.\n")).toContain(
      "list-inline-enumeration-markers",
    );
  });

  test("a lone (a) back-reference does not fire", async () => {
    expect((await rules("See item (a) above.\n")).filter((r) => r === "list-inline-enumeration-markers")).toHaveLength(
      0,
    );
  });

  test("enumerators inside code are exempt", async () => {
    expect(
      (await rules("Run `f((a), (b))` here.\n")).filter((r) => r === "list-inline-enumeration-markers"),
    ).toHaveLength(0);
  });
});

describe("list-comma-labelled-run comma-joined labelled run", () => {
  test("flags a sentence of 3+ comma-joined labelled items", async () => {
    const src = "Rules: PG001 mid-sentence wrap, PG002 word budget, PG003 semicolon list, PG004 em-dash tell.\n";
    expect(await rules(src)).toContain("list-comma-labelled-run");
  });

  test("counts inline-code labels too", async () => {
    expect(await rules("Targets: `fmt` formats, `vet` inspects, `race` detects data races.\n")).toContain(
      "list-comma-labelled-run",
    );
  });

  test("plain comma prose without labels does not fire", async () => {
    expect(await rules("We need eggs, milk, butter, and flour today.\n")).toHaveLength(0);
  });

  test("two labelled segments stay under the threshold", async () => {
    expect(
      (await rules("Use sentence-one-per-line for wraps, sentence-word-budget-exceeded for budgets.\n")).filter(
        (r) => r === "list-comma-labelled-run",
      ),
    ).toHaveLength(0);
  });

  test("a bare-label subject enumeration does not fire", async () => {
    const src = "The files `README.md`, `AGENTS.md`, and `CLAUDE.md` serve one role together.\n";
    expect((await rules(src)).filter((r) => r === "list-comma-labelled-run")).toHaveLength(0);
  });
});

describe("list-stacked-interpunct-runs stacked interpunct runs", () => {
  test("runs stacked across lines replace list-interpunct-joined-run and ask for a nested list", async () => {
    const src =
      "Group A: [a](https://a) · [b](https://b) · [c](https://c).\nGroup B: [d](https://d) · [e](https://e) · [f](https://f).\n";
    const findings = await checkMarkdown(src, "doc.md");
    expect(findings.map((f) => f.rule)).toEqual(["list-stacked-interpunct-runs"]);
    expect(findings[0]?.message).toContain("nested list");
  });

  test("a single-line run stays list-interpunct-joined-run", async () => {
    expect(await rules("[a](https://a) · [b](https://b) · [c](https://c)\n")).toEqual(["list-interpunct-joined-run"]);
  });
});

describe("embedded markdown fences", () => {
  test("audits a ```markdown fence body and maps the finding to the file line", async () => {
    const src = "Intro sentence.\n\n```markdown\nA wrapped sentence goes\nonward here.\n```\n";
    const findings = await checkMarkdown(src, "doc.md");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.rule).toBe("sentence-one-per-line");
    expect(findings[0]?.line).toBe(4);
  });

  test("other fence languages stay exempt", async () => {
    expect(await rules("```text\nA wrapped sentence goes\nonward here.\n```\n")).toHaveLength(0);
  });

  test("code fences nested inside the template stay exempt", async () => {
    const src = "````markdown\nClean sentence.\n\n```sh\nwrapped code stays\nexempt here\n```\n````\n";
    expect(await rules(src)).toHaveLength(0);
  });

  test("--fix never rewrites through a fence boundary", async () => {
    const src = "```markdown\nA wrapped sentence goes\nonward here.\n```\n";
    expect(await fixMarkdown(src)).toBe(src);
  });
});

describe("frontmatter is metadata, not prose", () => {
  const record = `---
type: Architecture Decision
title: Vendor the FastAPI template as a frozen snapshot, not a tracked fork
description: Upstream is a one-time seed; this fork diverges permanently
tags: [vendoring, upstream, scope]
status: accepted
provenance: Imported at commit 486f054 — the alternative was a git subtree
enforced_in:
  - fullstack-template/
generated: { by: human:maintainer, at: 2026-09-01T00:00:00Z }
---

Body prose stays audited.
`;

  test("ignores YAML frontmatter entirely", async () => {
    // Without the frontmatter extension the block parses as a thematicBreak
    // plus a setext heading, and every text rule fires on the raw YAML.
    expect(await rules(record)).toHaveLength(0);
  });

  test("still audits the body beneath frontmatter", async () => {
    const findings = await checkMarkdown(`${record}\nA sentence that wraps\nacross two lines.\n`, "doc.md");
    expect(findings.map((f) => f.rule)).toContain("sentence-one-per-line");
  });

  test("reports body line numbers past the frontmatter block", async () => {
    const findings = await checkMarkdown("---\ntitle: x\n---\n\nGood line.\nBad wrap starts\nhere.\n", "doc.md");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(6);
  });

  test("ignores TOML frontmatter too", async () => {
    expect(await rules('+++\ntitle = "a — b; c; d"\n+++\n\nBody line.\n')).toHaveLength(0);
  });

  test("a mid-document thematic break is still not frontmatter", async () => {
    // Only a block at the very start is frontmatter; `---` later in the file
    // must keep its normal meaning.
    expect(await rules("Intro line.\n\n---\n\nA sentence that wraps\nacross lines.\n")).toContain(
      "sentence-one-per-line",
    );
  });

  test("does not swallow a setext heading", async () => {
    expect(await rules("Body text first.\n\nA Real Setext Heading\n---\n\nMore body.\n")).toHaveLength(0);
  });
});
