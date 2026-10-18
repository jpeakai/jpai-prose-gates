import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AmbiguousConceptsError,
  buildDocModel,
  type ConceptModel,
  ConceptsFileError,
  loadConcepts,
  NO_CONCEPTS,
  parseConcepts,
  setUp,
} from "../src/index.ts";
import { languageOf, sentenceOf } from "../src/language.ts";
import { PROJECT_ROOT, runCli, tempDirs } from "./helpers.ts";

const tmp = tempDirs();

const GLOSSARY = `# Glossary

The terms of a small tool.

\`\`\`mermaid
flowchart LR
    PG["Prose Gate"]:::rule
    LR["Local Rule"]:::rule
    PL["Plugin"]:::rule
    AG["Agent"]:::people
    RL["Release"]:::info

    LR -- is a kind of --> PL
    PL -- adds --> PG
    AG -. never runs .-> RL
\`\`\`

## Agent

An automated contributor.

## Local Rule

A rule file in the project.

## Plugin

A package of rules.

## Prose Gate

One check over markdown.

## Release

A published version.
`;

const caught = (run: () => unknown): unknown => {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error("expected a throw");
};

const model = (): ConceptModel => parseConcepts("GLOSSARY.md", GLOSSARY);

const mentions = (prose: string, concepts = model()) =>
  languageOf(prose, concepts).sentences.flatMap((s) => s.concepts.map((m) => [m.concept, m.text]));

describe("reading a concept file", () => {
  test("each H2 is a concept, and each edge a relation by concept name", () => {
    const m = model();
    expect(m.file).toBe("GLOSSARY.md");
    expect(m.concepts.map((c) => c.name)).toEqual(["Agent", "Local Rule", "Plugin", "Prose Gate", "Release"]);
    expect(m.relations).toEqual([
      { from: "Local Rule", verb: "is a kind of", to: "Plugin", never: false },
      { from: "Plugin", verb: "adds", to: "Prose Gate", never: false },
      { from: "Agent", verb: "never runs", to: "Release", never: true },
    ]);
  });

  test("an is-a-kind-of edge gives a concept its kinds, nearest first", () => {
    const src = GLOSSARY.replace("    AG -.", "    PL -- is a kind of --> PG\n    AG -.");
    const kinds = new Map(parseConcepts("G.md", src).concepts.map((c) => [c.name, c.kinds]));
    expect(kinds.get("Local Rule")).toEqual(["Plugin", "Prose Gate"]);
    expect(kinds.get("Agent")).toEqual([]);
  });

  test("node ids are local to their diagram", () => {
    const second = '```mermaid\nflowchart LR\n    PL["Release"]\n    AG["Agent"]\n    AG -- tags --> PL\n```\n';
    const m = parseConcepts("G.md", GLOSSARY.replace("## Agent", `${second}\n## Agent`));
    expect(m.relations.at(-1)).toEqual({ from: "Agent", verb: "tags", to: "Release", never: false });
  });

  test("an unlabelled edge is a relation with no verb, solid or dotted", () => {
    const src = GLOSSARY.replace("    AG -.", "    PG --> RL\n    RL -.-> AG\n    AG -.");
    expect(parseConcepts("G.md", src).relations.slice(2, 4)).toEqual([
      { from: "Prose Gate", verb: "", to: "Release", never: false },
      { from: "Release", verb: "", to: "Agent", never: true },
    ]);
  });

  test.each([
    ["no H2 headings", "# Glossary\n\nJust prose.\n", "it has no H2 headings"],
    ["a repeated term", `${GLOSSARY}\n## Plugin\n\nAgain.\n`, 'the term "Plugin" has two headings'],
    ["a node that is no term", GLOSSARY.replace('RL["Release"]', 'RL["Releases"]'), 'node "Releases" is not a term'],
    ["an edge to an undeclared node", GLOSSARY.replace("--> PG", "--> XX"), 'names "XX", which no node declares'],
    [
      "a kind of itself",
      GLOSSARY.replace("--> PL\n", "--> PL\n    PL -- is a kind of --> LR\n"),
      "is a kind of itself",
    ],
  ])("a file with %s is a concepts-file error", (_, src, reason) => {
    const error = caught(() => parseConcepts("GLOSSARY.md", src)) as ConceptsFileError;
    expect(error).toBeInstanceOf(ConceptsFileError);
    expect([error.code, error.file]).toEqual(["concepts-file", "GLOSSARY.md"]);
    expect(error.message).toContain(reason);
  });

  test("this repo's own glossary parses, with its hierarchy and its prohibition", () => {
    const m = parseConcepts("GLOSSARY.md", readFileSync(join(PROJECT_ROOT, "GLOSSARY.md"), "utf8"));
    expect(m.concepts.find((c) => c.name === "Local Rule")?.kinds).toEqual(["Plugin"]);
    expect(m.relations.filter((r) => r.never).map((r) => [r.from, r.to])).toContainEqual(["Agent", "Release"]);
  });
});

describe("finding the concept file", () => {
  test("GLOSSARY.md or CONCEPTS.md at the root, and nothing without one", async () => {
    expect((await loadConcepts(tmp.project({ "GLOSSARY.md": GLOSSARY }))).file).toBe("GLOSSARY.md");
    expect((await loadConcepts(tmp.project({ "CONCEPTS.md": GLOSSARY }))).file).toBe("CONCEPTS.md");
    expect(await loadConcepts(tmp.project({ "README.md": "# Hi\n" }))).toBe(NO_CONCEPTS);
  });

  test("both at one root is ambiguous rather than a pick", async () => {
    const root = tmp.project({ "GLOSSARY.md": GLOSSARY, "CONCEPTS.md": GLOSSARY });
    const error = (await loadConcepts(root).catch((e: unknown) => e)) as AmbiguousConceptsError;
    expect(error).toBeInstanceOf(AmbiguousConceptsError);
    expect([error.code, error.files]).toEqual(["concepts-ambiguous", ["GLOSSARY.md", "CONCEPTS.md"]]);
  });

  test("a run reads the file at its project root, and a bad one stops it with exit 2", async () => {
    const root = tmp.project({ "package.json": "{}", "GLOSSARY.md": GLOSSARY, "docs/a.md": "# A\n" });
    const { registry } = await setUp({ cwd: join(root, "docs") });
    expect(registry.concepts.concepts).toHaveLength(5);

    const bad = tmp.project({ "package.json": "{}", "GLOSSARY.md": "# Glossary\n", "a.md": "# A\n" });
    const { code, stderr } = await runCli(bad, ["a.md"]);
    expect(code).toBe(2);
    expect(stderr).toContain("GLOSSARY.md: not a concept file, because it has no H2 headings");
  });
});

describe("concepts in the language view", () => {
  test("a sentence names a concept in any case, singular or plural, and multi-word as one", () => {
    expect(mentions("A local rule runs before the prose gates. Plugins load first.")).toEqual([
      ["Local Rule", "local rule"],
      ["Prose Gate", "prose gates"],
      ["Plugin", "Plugins"],
    ]);
  });

  test("a mention carries its concept's kinds", () => {
    const [mention] = languageOf("Each local rule loads.", model()).sentences[0]?.concepts ?? [];
    expect(mention).toEqual({ concept: "Local Rule", text: "local rule", start: 1, length: 2, kinds: ["Plugin"] });
  });

  test("a one-word concept counts only where it reads as a noun", () => {
    expect(mentions("The release is tagged.")).toEqual([["Release", "release"]]);
    expect(mentions("Release the package.")).toEqual([]);
  });

  test("the longest concept wins and mentions never overlap", () => {
    const src = GLOSSARY.replace("## Release", "## Rule\n\nA check.\n\n## Release");
    expect(mentions("A local rule loads.", parseConcepts("G.md", src))).toEqual([["Local Rule", "local rule"]]);
  });

  test("with no concept file, or one sentence on its own, a sentence names none", () => {
    expect(mentions("A local rule loads.", NO_CONCEPTS)).toEqual([]);
    expect(sentenceOf("A local rule loads.").concepts).toEqual([]);
    expect(["A plugin loads."].map(sentenceOf)[0]?.concepts).toEqual([]);
  });

  test("the document model carries the concepts to every paragraph", () => {
    const doc = buildDocModel("# T\n\nThe agent runs.\n", model());
    expect(doc.concepts.file).toBe("GLOSSARY.md");
    expect(doc.paragraphs[0]?.language.sentences[0]?.concepts.map((m) => m.concept)).toEqual(["Agent"]);
  });
});

// The Concepts section of docs/plugins.md shows a local rule that reads the
// mentions. The block is run exactly as written, so the guide cannot drift.
describe("the concepts example in docs/plugins.md", () => {
  test("loads as a local rule and reports a concept not written in Title Case", async () => {
    const guide = readFileSync(join(PROJECT_ROOT, "docs", "plugins.md"), "utf8");
    const section = guide.slice(guide.indexOf("## Concepts"));
    const block = /```js\n([\s\S]*?)```/.exec(section)?.[1] ?? "";
    expect(block).toContain("sentence.concepts");
    const root = tmp.project({
      "package.json": "{}",
      "GLOSSARY.md": GLOSSARY,
      ".prose-gates/rules/paragraph-concept-in-title-case.mjs": block,
      "doc.md": "# Title\n\nEach Local Rule is a Plugin.\n\nEach local rule is a plugin.\n",
    });
    const { stdout } = await runCli(root, ["doc.md"]);
    expect(stdout).toContain('doc.md:5 local/paragraph-concept-in-title-case write "local rule" as "Local Rule"');
    expect(stdout).toContain('doc.md:5 local/paragraph-concept-in-title-case write "plugin" as "Plugin"');
    expect(stdout.match(/local\/paragraph-concept-in-title-case/g)).toHaveLength(2);
  });
});
