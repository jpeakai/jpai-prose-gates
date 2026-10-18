#!/usr/bin/env bun
// Fail the site build when a page shows a fence's backticks as text.
//
// MkDocs renders fences with pymdownx.superfences. A fence it rejects is not
// an error to MkDocs: the block is published as a paragraph that starts with
// three backticks. tests/fences.test.ts checks the info strings in the source,
// and this checks the built pages, which catches any other way a fence breaks.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { Glob } from "bun";

const SITE = join("tmp", "site");

// A rejected fence becomes a paragraph that opens with its backticks. A code
// line that starts with backticks is not a sign, since a fence may hold a fence.
const LITERAL_FENCE = /<p>```/;

const printHelp = (): void => {
  console.log(
    [
      "Usage: bun run scripts/check-site.ts",
      "",
      `Exit 1 when any page under ${SITE} shows a code fence as text.`,
      "",
      "Options:",
      "  -h, --help  Show this help and exit",
    ].join("\n"),
  );
};

const main = async (): Promise<void> => {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: { help: { type: "boolean", short: "h", default: false } },
    strict: true,
  });
  if (values.help) {
    printHelp();
    return;
  }
  const pages = [...new Glob("**/*.html").scanSync({ cwd: SITE })].sort();
  if (pages.length === 0) throw new Error(`no pages under ${SITE}; run mkdocs build first`);
  const broken: string[] = [];
  for (const page of pages) {
    const lines = (await readFile(join(SITE, page), "utf8")).split("\n");
    for (const [i, line] of lines.entries()) if (LITERAL_FENCE.test(line)) broken.push(`${page}:${i + 1}`);
  }
  if (broken.length > 0) {
    console.error(`error: ${broken.length} code fence(s) rendered as text:\n${broken.join("\n")}`);
    process.exit(1);
  }
  console.log(`no fence rendered as text in ${pages.length} page(s)`);
};

main().catch((err: unknown) => {
  console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
