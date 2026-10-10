// The phrase rules: stock phrasing that signals importance or authority instead of stating a fact. Each rule
// is shown a phrase it must report and a use it must leave alone, because a tell rule that cries wolf gets
// switched off. Sentences are written for these tests, in the style the humanizer catalogue describes.

import { describe, expect, test } from "bun:test";
import { BUILTIN } from "../src/rules/registry.ts";
import { tell } from "./helpers.ts";

interface Case {
  rule: string;
  hit: string[];
  clean: string[];
}

const CASES: Case[] = [
  {
    rule: "phrase-ai-overused-word",
    hit: [
      "We delve into the data.",
      "She delved deeper into the archive.",
      "A rich tapestry of cultures.",
      "The team worked meticulously on it.",
      "Understanding the intricacies of the market.",
      "The interplay between cost and speed.",
      "Funding bolstered the project.",
      "A pivotal release for the team.",
      "The film garnered praise.",
      "This underscores the need for care.",
      "The evolving landscape of tools.",
    ],
    clean: [
      "Use the key to unlock the gate.",
      "The report is robust and valuable.",
      "Press the underscore key, then the underscore character again.",
      "Delvecchio wrote the report.",
      "A crucial step, and a vibrant colour.",
      "See the highlights of the match.",
    ],
  },
  {
    rule: "phrase-staged-run-up",
    hit: [
      "Let's dive into how caching works.",
      "Let’s explore the options.",
      "Here's what you need to know.",
      "Without further ado, the results.",
      "Here's the thing about retries.",
      "Let's be honest about the cost.",
      "Is it worth the price? Honestly? It depends.",
      "Let's break this down.",
    ],
    clean: [
      "The honest answer depends on usage.",
      "Honestly, it depends on usage.",
      "We dive into the sea at dawn.",
      "Explore the options in the menu.",
    ],
  },
  {
    rule: "phrase-stock-closer-line",
    hit: [
      "Caching cuts repeat work.\n\nThat is the real win.",
      "Retries hide outages.\n\nThat distinction matters.",
      "A pause.\n\nLet that sink in.",
      "Read that again.",
    ],
    clean: [
      "That is the real win for users who cache.",
      "Nothing here is the real win.",
      "It matters. That distinction matters because it changes the cost.",
    ],
  },
  {
    rule: "phrase-inflated-significance-claim",
    hit: [
      "The institute was established in 1989, marking a pivotal moment in the history of statistics.",
      "The library stands as a testament to careful design.",
      "It plays a crucial role in the pipeline.",
      "This underscores its importance to the team.",
      "The company continues to thrive.",
      "Despite these challenges, the town grew.",
      "Exciting times lie ahead.",
      "The future looks bright for the company.",
      "It left an indelible mark on the field.",
    ],
    clean: [
      "The library was built in 1989 and has four rooms.",
      "The testament was read aloud in court.",
      "The key role belongs to the parser.",
    ],
  },
  {
    rule: "phrase-sales-language-claim",
    hit: [
      "Nestled within the breathtaking region of Gonder, the town is small.",
      "A stunning view of the bay.",
      "The hotel boasts a rooftop pool.",
      "It is renowned for its cuisine.",
      "A diverse array of shops.",
      "A town in the heart of Ethiopia.",
    ],
    clean: ["The cat nestled into the blanket.", "The vase is stunned by nothing."],
  },
  {
    rule: "phrase-negative-contrast-pair",
    hit: [
      "It's not just about the beat; it's part of the atmosphere.",
      "It's not merely a song, it's a statement.",
      "This is not only a tool but also a habit.",
      "This does not mean every choice is equal. It means no external system confirms which is right.",
      "That's not simply a fix, it's a rewrite.",
    ],
    clean: [
      "It is not a bug.",
      "The parser does not mean to guess.",
      "He is not here, but she is.",
      "Not every rule has a fixer.",
    ],
  },
  {
    rule: "phrase-arguing-with-no-one",
    hit: [
      "To be clear, nothing changes.",
      "I'm not saying the docs do not matter.",
      "Don't get me wrong, it works.",
      "A tempting approach would be to restart the service.",
      "One might be tempted to cache everything.",
      "You might think the fix is simple.",
    ],
    clean: ["Being clear matters.", "The approach is simple.", "He said nothing."],
  },
  {
    rule: "phrase-vague-connection-link",
    hit: [
      "He is associated with the Rajhans Orchestra.",
      "The concerts ran in connection with the festival.",
      "The tool is linked to the registry.",
    ],
    clean: ["He founded the Rajhans Orchestra.", "The link points to the registry."],
  },
  {
    rule: "phrase-borrowed-authority-claim",
    hit: [
      "Experts argue the river is crucial.",
      "Industry reports say sales fell.",
      "Some critics disagree.",
      "Observers have cited the decline.",
    ],
    clean: ["Researchers at the university measured it.", "The report from the agency says sales fell."],
  },
  {
    rule: "phrase-sayings-sound-deep",
    hit: [
      "At its core, what matters is readiness.",
      "The real question is whether teams adapt.",
      "What really matters is trust.",
      "Symmetry is the language of trust.",
    ],
    clean: ["The core of the system is the parser.", "The question is whether teams adapt."],
  },
  {
    rule: "phrase-document-self-reference",
    hit: [
      "The table below compares the vendors.",
      "This section is organised by owner.",
      "The figures are compiled from vendor pages.",
      "This function was added to replace the old approach.",
    ],
    clean: ["The vendors differ in price.", "Prices come from each vendor's page."],
  },
  {
    rule: "phrase-avoided-copula-verb",
    hit: [
      "Gallery 825 serves as the exhibition space.",
      "The gallery stands as a landmark.",
      "The module functions as a cache.",
      "The service operates as a proxy.",
      "The hotel boasts four rooms.",
    ],
    clean: ["The server serves requests.", "She stands at the door.", "The function returns a value."],
  },
  {
    rule: "phrase-shallow-participle-rider",
    hit: [
      "The temple is painted blue, symbolizing the bluebonnets.",
      "The festival ran for a week, highlighting the town's history.",
      "The change shipped, reflecting the team's care.",
      "It was built in 1900, showcasing local craft.",
    ],
    clean: [
      "Highlighting the cells helps you find them.",
      "Reflecting on the week, we shipped it.",
      "The tests pass, and the build is green.",
    ],
  },
  {
    rule: "phrase-stacked-hedge-run",
    hit: [
      "It could potentially possibly be argued that the policy might help.",
      "This may perhaps seem somewhat odd to some readers.",
    ],
    clean: [
      "It could be argued that the policy helps.",
      "This may help, and it might not.",
      "The parser may fail on input that could be malformed.",
    ],
  },
];

describe.each(CASES)("$rule", ({ rule, hit, clean }) => {
  test.each(hit)("reports: %s", async (text) => {
    expect((await tell(`${text}\n`, rule)).length).toBeGreaterThan(0);
  });

  test.each(clean)("leaves alone: %s", async (text) => {
    expect(await tell(`${text}\n`, rule)).toEqual([]);
  });

  test("leaves a quotation, code and a table cell alone", async () => {
    const phrase = (hit[0] ?? "").split("\n\n").at(-1) ?? "";
    expect(await tell(`> ${phrase}\n`, rule)).toEqual([]);
    expect(await tell(`\`\`\`text\n${phrase}\n\`\`\`\n`, rule)).toEqual([]);
    expect(await tell(`| Col |\n|---|\n| ${phrase} |\n`, rule)).toEqual([]);
  });

  test("gives the finding a line, a message that ends in advice, and the parts apart", async () => {
    const [finding] = await tell(`Opening line.\n\n${hit[0] ?? ""}\n`, rule);
    expect(finding?.line).toBeGreaterThanOrEqual(3);
    expect(finding?.message).toMatch(/: ".+"\. .+[.!]$/);
    expect(finding?.evidence).toBeString();
    expect(finding?.instruction).toBeString();
    expect(finding?.preserve).toBeString();
  });
});

describe("a stock closer is the whole sentence", () => {
  test("names the closer as the evidence", async () => {
    const [finding] = await tell("Caching cuts repeat work.\n\nThat is the real win.\n", "phrase-stock-closer-line");
    expect(finding?.line).toBe(3);
    expect(finding?.evidence).toBe("That is the real win.");
  });

  test("does not report a short paragraph that merely repeats, as API reference text does", async () => {
    const src = "Nothing.\n\nNothing.\n\nWhether it matches.\n\nWhether it matches.\n";
    expect(await tell(src, "phrase-stock-closer-line")).toEqual([]);
  });
});

describe("a phrase that wraps over lines", () => {
  test("is reported on the line where it starts", async () => {
    const [finding] = await tell("Caching is fast.\nLet's dive\ninto the details.\n", "phrase-staged-run-up");
    expect(finding?.line).toBe(2);
  });
});

describe("the message of a negative contrast", () => {
  test("keeps a contrast that corrects a belief the reader holds, in the advice", async () => {
    const [finding] = await tell("It's not just a feature; it's a shift.\n", "phrase-negative-contrast-pair");
    expect(finding?.instruction).toContain("corrects a belief the reader already holds");
  });
});

describe("the hedge option", () => {
  test("lets a project ask for two hedges instead of three", async () => {
    const src = "This may possibly be wrong.\n";
    expect(await tell(src, "phrase-stacked-hedge-run")).toEqual([]);
    expect(
      await tell(src, "phrase-stacked-hedge-run", { "phrase-stacked-hedge-run": ["error", { min: 2 }] }),
    ).toHaveLength(1);
  });

  test("counts hedges only inside one sentence", async () => {
    expect(await tell("It may help. It might not. It could vary.\n", "phrase-stacked-hedge-run")).toEqual([]);
  });
});

describe("which new rules are on by default", () => {
  // A rule is on only when a hit is a defect in nearly any document and rewording clears it. That is
  // true of a stock phrase and of markup no person types. A heuristic or a style choice starts off, and
  // a project that wants it turns it on, when it fails the run like any other (PRS-0035).
  const ON = [
    "residue-tool-markup-artifact",
    "residue-chatbot-wrapper-phrase",
    "phrase-ai-overused-word",
    "phrase-staged-run-up",
    "phrase-stock-closer-line",
    "phrase-inflated-significance-claim",
    "phrase-sales-language-claim",
    "phrase-borrowed-authority-claim",
  ];
  const OFF = [
    "residue-unfilled-placeholder-text",
    "phrase-negative-contrast-pair",
    "phrase-arguing-with-no-one",
    "phrase-vague-connection-link",
    "phrase-sayings-sound-deep",
    "phrase-document-self-reference",
    "phrase-avoided-copula-verb",
    "phrase-shallow-participle-rider",
    "phrase-stacked-hedge-run",
    "structure-emoji-in-heading",
    "structure-thematic-break-density",
    "structure-title-case-heading",
    "structure-heading-restating-sentence",
    "structure-bold-label-list-item",
    "sentence-repeated-opening-run",
    "sentence-short-fragment-run",
    "punctuation-spaced-dash-in-prose",
    "punctuation-curly-quote-in-prose",
  ];

  test.each(ON)("%s fails the run", (id) => expect(BUILTIN.levels.get(id as never)).toBe("error"));
  test.each(OFF)("%s starts off", (id) => expect(BUILTIN.levels.get(id as never)).toBe("off"));

  test("every new rule is listed once, and no rule is left out", () => {
    const original = new Set([
      "sentence-one-per-line",
      "sentence-word-budget-exceeded",
      "list-semicolon-delimited-run",
      "list-interpunct-joined-run",
      "list-inline-enumeration-markers",
      "list-comma-labelled-run",
      "list-stacked-interpunct-runs",
      "punctuation-em-dash-in-prose",
      "punctuation-interpunct-in-prose",
    ]);
    const fresh = BUILTIN.catalogue.map((r) => r.id as string).filter((id) => !original.has(id));
    expect(new Set([...ON, ...OFF])).toEqual(new Set(fresh));
    expect(ON.length + OFF.length).toBe(fresh.length);
  });

  test("no rule reports at a level between on and off", () => {
    for (const level of BUILTIN.levels.values()) expect(["error", "off"]).toContain(level);
  });
});
