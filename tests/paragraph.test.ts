import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gapCohesion, planBreaks } from "../src/cohesion.ts";
import { parseConfig } from "../src/config.ts";
import { buildRegistry, checkMarkdown, type Finding, fixMarkdown, UsageError } from "../src/index.ts";
import { type LanguageView, languageOf, sentenceOf, sentenceTexts } from "../src/language.ts";
import { buildDocModel } from "../src/model.ts";
import { FIX_ORDER, RULES } from "../src/rules/index.ts";
import { paragraphMessage } from "../src/rules/paragraph-sentence-budget-exceeded.ts";
import { BUILTIN_CATEGORIES } from "../src/rules/registry.ts";
import { PROJECT_ROOT, runCli, tempDirs } from "./helpers.ts";

const tmp = tempDirs();

const RULE = "paragraph-sentence-budget-exceeded";

const registryFor = (rules: unknown) =>
  buildRegistry({
    rules: RULES,
    fixOrder: FIX_ORDER,
    categories: BUILTIN_CATEGORIES,
    config: parseConfig("t.json", { rules }),
  });

const findings = async (src: string, registry = registryFor({})) =>
  (await checkMarkdown(src, "doc.md", undefined, registry)).filter((f) => f.rule === RULE);

// Sentences that share no content word, so no two of them hold together.
const unrelated = [
  "Parsers read markdown.",
  "Releases publish nightly.",
  "Plugins load automatically.",
  "Tables stay exempt.",
  "Colours pass contrast.",
  "Budgets bound length.",
  "Frontmatter holds metadata.",
];
const paragraph = (n: number): string => `${unrelated.slice(0, n).join("\n")}\n`;

describe("paragraph-sentence-budget-exceeded counting", () => {
  test("a paragraph at the budget of 5 passes", async () => {
    expect(await findings(paragraph(5))).toEqual([]);
  });

  test("a paragraph over the budget reports its line and sentence count", async () => {
    const [finding, ...rest] = await findings(`# Title\n\n${paragraph(6)}`);
    expect(rest).toEqual([]);
    expect(finding?.line).toBe(3);
    expect(finding?.message).toStartWith("paragraph has 6 sentences (budget 5)");
  });

  test("source wrapping alone does not reset the count", async () => {
    expect(await findings(`${unrelated.slice(0, 6).join(" ")}\n`)).toHaveLength(1);
  });

  test("a blank line starts a paragraph of its own", async () => {
    expect(await findings(`${unrelated.slice(0, 3).join("\n")}\n\n${unrelated.slice(3, 6).join("\n")}\n`)).toEqual([]);
  });

  test.each([
    ["a fenced example", "```text\nexample\n```"],
    ["a list", "- one item"],
    ["a heading", "## Next"],
  ])("%s between paragraphs supplies a break", async (_name, block) => {
    const src = `${unrelated.slice(0, 3).join("\n")}\n\n${block}\n\n${unrelated.slice(3, 6).join("\n")}\n`;
    expect(await findings(src)).toEqual([]);
  });

  test("a paragraph inside a list item is counted", async () => {
    expect(await findings(`- ${unrelated.slice(0, 6).join("\n  ")}\n`)).toHaveLength(1);
  });

  test("a paragraph inside a blockquote is counted", async () => {
    expect(await findings(`> ${unrelated.slice(0, 6).join("\n> ")}\n`)).toHaveLength(1);
  });

  test("table cells, code and frontmatter are exempt", async () => {
    const cell = unrelated.slice(0, 6).join(" ");
    const src = `---\ntitle: ${cell}\n---\n\n| A |\n|---|\n| ${cell} |\n\n\`\`\`text\n${paragraph(7)}\`\`\`\n`;
    expect(await findings(src)).toEqual([]);
  });

  test("the budget comes from the maxSentences option", async () => {
    const strict = registryFor({ [RULE]: ["error", { maxSentences: 2 }] });
    const loose = registryFor({ [RULE]: ["error", { maxSentences: 7 }] });
    expect(await findings(paragraph(3), strict)).toHaveLength(1);
    expect((await findings(paragraph(3), strict))[0]?.message).toContain("(budget 2)");
    expect(await findings(paragraph(7), loose)).toEqual([]);
  });

  test("the rule can be switched off", async () => {
    expect(await findings(paragraph(7), registryFor({ [RULE]: "off" }))).toEqual([]);
  });

  test.each([
    ["a budget below one", { maxSentences: 0 }, /must be at least 1/],
    ["a budget that is not a number", { maxSentences: "five" }, /must be a number/],
  ])("rejects %s with a usage error", (_name, options, message) => {
    expect(() => registryFor({ [RULE]: ["error", options] })).toThrow(message);
    expect(() => registryFor({ [RULE]: ["error", options] })).toThrow(UsageError);
  });

  test("has no fixer, so a fix run leaves the paragraph and the finding", async () => {
    expect(await fixMarkdown(paragraph(6))).toBe(paragraph(6));
    expect(await findings(await fixMarkdown(paragraph(6)))).toHaveLength(1);
  });
});

describe("paragraphSentences", () => {
  test.each([
    ["abbreviations", "Use a gate, e.g. A rule. Then stop.", 2],
    ["i.e. before a capital", "One rule matters, i.e. The first. It wins.", 2],
    ["a title", "Ask Dr. Smith. She knows.", 2],
    ["inline code", "Run CODE now. CODE prints help.", 2],
    ["a version number", "Version 1.2 ships. It works.", 2],
    ["a question inside quotes", 'He asked "why?" and left. Nobody answered.', 2],
    ["a quoted sentence, kept whole, a known compromise limit", '"Stop." The rule fired.', 1],
    ["a lower-case start after a number", "The value is 3. and so on.", 2],
    ["a capital after a number", "It defaults to 5. Short sentences follow.", 2],
    ["a lower-case path opening a sentence", "Plugins are trusted. docs/plugins.md is the guide.", 2],
    ["inline code opening a sentence after a number", "The exit code is 2. CODE prints help.", 2],
    ["a number after a terminal", "It failed twice. 3 retries followed.", 2],
    ["a trailing fragment with no terminal", "First one. Then a second", 2],
    ["etc. inside a sentence", "Files, dirs, etc. are read. Then done.", 2],
    ["a bare url", "See https://example.com/a.b for more. Done.", 2],
  ])("splits %s correctly", (_name, prose, expected) => {
    expect(sentenceTexts(prose)).toHaveLength(expected);
  });

  test("link text counts but a url never splits a sentence", async () => {
    const src = `${unrelated.slice(0, 4).join("\n")}\nSee [the a.b docs](https://example.com/v1.2.Next.html) for more.\n`;
    expect(await findings(src)).toEqual([]);
  });
});

describe("cohesion", () => {
  test("topic terms are content-word lemmas, without function words or the CODE token", () => {
    expect([...sentenceOf("The parser was parsing CODE in the trees.").terms].sort()).toEqual([
      "parse",
      "parser",
      "tree",
    ]);
    expect([...sentenceOf("Releases publish nightly.").terms]).toContain("release");
  });

  test.each([
    ["a pronoun", "It builds a tree.", true],
    ["a possessive", "Its fixer refuses.", true],
    ["an adverb", "Then the rule stops.", true],
    ["a connective", "However, the tree changes.", true],
    ["an article", "The parser reads files.", false],
    ["a noun", "Parsers read files.", false],
  ])("a sentence opening with %s refers back: %p", (_name, sentence, expected) => {
    expect(sentenceOf(sentence).refersBack).toBe(expected);
  });

  test("a parallel opener is CODE or a content lemma, and never a function word", () => {
    expect(sentenceOf("CODE prints help.").opener).toBe("CODE");
    expect(sentenceOf("Parsers read files.").opener).toBe("parser");
    expect(sentenceOf("The parser reads files.").opener).toBeNull();
    expect(sentenceOf("").opener).toBeNull();
  });

  test("a shared word, a back-reference and a parallel opener each tie a gap", () => {
    expect(gapCohesion(["Parsers read files.", "Parsers build trees."].map(sentenceOf))).toEqual([2 + 1]);
    expect(gapCohesion(["Parsers read files.", "It builds trees."].map(sentenceOf))).toEqual([2]);
    expect(gapCohesion(["Parsers read files.", "Releases publish."].map(sentenceOf))).toEqual([0]);
  });

  test("a word shared two sentences apart holds a topic across a stray sentence", () => {
    // Each gap here sits at an edge, with one pair two apart, scaled to two.
    expect(gapCohesion(["Releases publish.", "Tags sign.", "Releases run."].map(sentenceOf))).toEqual([2, 2]);
    expect(gapCohesion(["Releases publish.", "Tags sign.", "Releases run.", "Docs build."].map(sentenceOf))).toEqual([
      2, 1, 0,
    ]);
  });

  test("breaks at every topic turn, then splits a long topic at its weakest gap", () => {
    expect(planBreaks([2, 2, 0, 2, 2, 0], 5)).toEqual({ topics: 3, breaks: [3, 6] });
    expect(planBreaks([3, 3, 3, 1, 3, 3], 5)).toEqual({ topics: 1, breaks: [4] });
  });

  test("a tie between weak gaps goes to the one nearest the middle", () => {
    expect(planBreaks([1, 1, 1, 1, 1, 1], 5)).toEqual({ topics: 1, breaks: [3] });
  });

  test("a group still over budget after a topic break is split again", () => {
    expect(planBreaks([0, 1, 1, 1, 1, 1, 1], 3)).toEqual({ topics: 2, breaks: [1, 4, 6] });
  });
});

describe("paragraphMessage", () => {
  test("names the topics and the breaks", () => {
    expect(paragraphMessage(unrelated.slice(0, 6).map(sentenceOf), 5)).toBe(
      "paragraph has 6 sentences (budget 5) and about 6 topics; break it after sentences 1, 2, 3, 4 and 5, one topic per paragraph",
    );
  });

  test("says one topic throughout when nothing turns", () => {
    const sentences = Array.from({ length: 6 }, (_, i) => `The parser reads file ${i}.`);
    expect(paragraphMessage(sentences.map(sentenceOf), 5)).toBe(
      "paragraph has 6 sentences (budget 5) and one topic throughout; break it after sentence 3, where neighbouring sentences share the fewest words",
    );
  });
});

// The rule runs after the list rules, so a list they report is promoted before
// the paragraph around it is counted.
describe("paragraph-sentence-budget-exceeded after the list rules", () => {
  const withList = `${unrelated.slice(0, 2).join("\n")}\nA release needs: a tag; a log; a build.\n${unrelated.slice(2, 6).join("\n")}\n`;

  test("a paragraph a list rule reports is left to that rule", async () => {
    const all = await checkMarkdown(withList, "doc.md");
    expect(all.map((f) => f.rule)).toEqual(["list-semicolon-delimited-run"]);
  });

  test("the paragraph is counted once the fixer has promoted the list", async () => {
    const fixed = await fixMarkdown(withList);
    expect(fixed).toContain("\n- a tag\n");
    expect(await checkMarkdown(fixed, "doc.md")).toEqual([]);
  });

  test("a list reported on a later line of the paragraph still defers it", async () => {
    const src = `${unrelated.slice(0, 5).join("\n")}\nIt needs: a tag; a log; a build.\n`;
    expect((await checkMarkdown(src, "doc.md")).map((f) => f.rule)).toEqual(["list-semicolon-delimited-run"]);
  });

  test("with the list rule off, the paragraph is counted as it stands", async () => {
    const off = registryFor({ "list-semicolon-delimited-run": "off" });
    expect(await findings(withList, off)).toHaveLength(1);
  });

  test("a finding from another category never defers it", async () => {
    const long = `${Array.from({ length: 30 }, (_, i) => `W${i}`).join(" ")}.`;
    const all = await checkMarkdown(`${unrelated.slice(0, 5).join("\n")}\n${long}\n`, "doc.md");
    expect(all.map((f) => f.rule).sort()).toEqual([RULE, "sentence-word-budget-exceeded"]);
  });
});

// Curated pairs. before.md reports exactly the findings in finding.txt, one
// "rule message" per line. A pair ends in after.md, the rewrite a human makes
// from that guidance, or fixed.md, exactly what --fix writes. Either passes
// every rule.
const FIXTURES = join(PROJECT_ROOT, "tests", "fixtures", "paragraph");
const curated = readdirSync(FIXTURES).sort();

describe("curated before and after paragraphs", () => {
  test("there are curated pairs", () => {
    expect(curated.length).toBeGreaterThan(0);
  });

  test.each(curated)("%s", async (name) => {
    const path = (file: string): string => join(FIXTURES, name, file);
    const read = (file: string): string => readFileSync(path(file), "utf8");
    const before = read("before.md");
    const reported = (await checkMarkdown(before, "before.md")).map((f) => `${f.rule} ${f.message}`);
    expect(reported).toEqual(read("finding.txt").trim().split("\n"));
    const endings = ["after.md", "fixed.md"].filter((file) => existsSync(path(file)));
    expect(endings).toHaveLength(1);
    const ending = endings[0] as string;
    if (ending === "fixed.md") expect(await fixMarkdown(before)).toBe(read("fixed.md"));
    else expect(await fixMarkdown(before)).toBe(before);
    expect(await checkMarkdown(read(ending), ending)).toEqual([]);
  });
});

// compromise must tag and split the same way on both
// runtimes, or a finding would depend on where it ran. The Node bundle is run
// over every curated paragraph and every document in the repo, and its
// paragraph findings must equal Bun's.
describe("the language rules on Bun and Node", () => {
  test("report identical findings", async () => {
    const LANGUAGE_RULES = new Set([RULE, "sentence-word-budget-exceeded"]);
    const long = tmp.file(
      "The fixer reads the tree and proposes an edit because the rule fired, which the engine verifies when it reparses the document and compares the words it finds.\n\nThe rule reads the tree, finds a run, proposes an edit, waits for the engine, and then reports what is left for a human to read.\n",
    );
    const docs = ["README.md", "RULES.md", "GLOSSARY.md", "CONTRIBUTING.md"];
    const files = [...curated.map((name) => join("tests", "fixtures", "paragraph", name, "before.md")), ...docs, long];
    const { stdout } = await runCli(
      PROJECT_ROOT,
      ["--json", "--no-plugins", ...files],
      ["node", join(PROJECT_ROOT, "dist", "bin.js")],
    );
    const keyed = (f: { file: string; line: number; rule: string; message: string }): string =>
      `${f.file}:${f.line} ${f.rule} ${f.message}`;
    const onNode = (JSON.parse(stdout) as { findings: Finding[] }).findings
      .filter((f) => LANGUAGE_RULES.has(f.rule))
      .map(keyed);
    const onBun = (
      await Promise.all(
        files.map(async (file) =>
          (
            await checkMarkdown(readFileSync(file.startsWith("/") ? file : join(PROJECT_ROOT, file), "utf8"), file)
          )
            .filter((f) => LANGUAGE_RULES.has(f.rule))
            .map(keyed),
        ),
      )
    ).flat();
    expect(onNode.sort()).toEqual(onBun.sort());
    expect(onBun.some((f) => f.includes(" sentence-word-budget-exceeded "))).toBe(true);
    expect(onBun.some((f) => f.includes(` ${RULE} `))).toBe(true);
  });
});

// The language view a paragraph exposes to every rule, built on first read.
describe("ParagraphView language", () => {
  const [view] = buildDocModel("The parser reads `src/a.ts` once. It builds a tree.\n").paragraphs;

  test("holds each sentence with its words, tags and lemmas", () => {
    const sentences = view?.language.sentences ?? [];
    expect(sentences.map((s) => s.text)).toEqual(["The parser reads CODE once.", "It builds a tree."]);
    const reads = sentences[0]?.words.find((w) => w.text === "reads");
    expect(reads).toMatchObject({ lemma: "read", content: true });
    expect(reads?.tags).toContain("Verb");
    expect(sentences[0]?.words.find((w) => w.text === "CODE")?.content).toBe(false);
    expect(sentences[1]?.refersBack).toBe(true);
  });

  test("is built once and then reused", () => {
    expect(view?.language).toBe(view?.language as LanguageView);
  });

  test("equals the language of the paragraph's prose", () => {
    expect(view?.language).toEqual(languageOf(view?.prose ?? ""));
  });

  test("an empty prose has no sentences", () => {
    expect(languageOf("").sentences).toEqual([]);
  });
});

// The Language section of docs/plugins.md shows a local rule that reads the
// view. The block is run exactly as written, so the guide cannot drift.
describe("the language example in docs/plugins.md", () => {
  test("loads as a local rule and reports a paragraph that opens with a pronoun", async () => {
    const guide = readFileSync(join(PROJECT_ROOT, "docs", "plugins.md"), "utf8");
    const section = guide.slice(guide.indexOf("## Language"));
    const block = /```js\n([\s\S]*?)```/.exec(section)?.[1] ?? "";
    expect(block).toContain("p.language.sentences");
    const root = tmp.project({
      "package.json": "{}",
      ".prose-gates/rules/paragraph-opens-with-pronoun.mjs": block,
      "doc.md":
        "# Title\n\nIt reads the file.\n\nThe parser reads the file.\n\n| It | x |\n|---|---|\n| It is here | y |\n",
    });
    const { stdout } = await runCli(root, ["doc.md"]);
    expect(stdout).toContain('doc.md:3 local/paragraph-opens-with-pronoun paragraph opens with "It"');
    expect(stdout.match(/local\/paragraph-opens-with-pronoun/g)).toHaveLength(1);
  });
});
