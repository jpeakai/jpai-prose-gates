#!/usr/bin/env bun
// Assemble the MkDocs source tree at tmp/site-src.
//
// MkDocs serves one docs_dir, but this repo's documents live at the root, in
// docs/ and in adrs/. The tree is copied with the repo's own layout, so every
// relative link between documents keeps working. Only links that leave the
// published set (the examples and the license) become GitHub URLs. The prose
// gates run over the real files, never over this copy.
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";

const REPO_URL = "https://github.com/jpeakai/jpai-prose-gates";
const OUT = join("tmp", "site-src");
const ROOT_FILES = ["README.md", "RULES.md", "GLOSSARY.md", "CONTRIBUTING.md"];

// A link target that points at a directory or file the site does not carry.
const EXTERNAL_LINKS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\]\((?:\.\.\/)?(examples\/[^)\s]*)\)/g, `](${REPO_URL}/tree/main/$1)`],
  [/\]\((?:\.\.\/)?(LICENSE|package\.json)\)/g, `](${REPO_URL}/blob/main/$1)`],
];

const printHelp = (): void => {
  console.log(
    [
      "Usage: bun run scripts/assemble-site.ts",
      "",
      `Copy the documents into ${OUT} for MkDocs, keeping the repo layout.`,
      "",
      "Options:",
      "  -h, --help  Show this help and exit",
    ].join("\n"),
  );
};

const rewriteLinks = (text: string): string =>
  EXTERNAL_LINKS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);

const copyMarkdown = async (from: string, to: string): Promise<void> => {
  await writeFile(to, rewriteLinks(await readFile(from, "utf8")));
};

const assemble = async (): Promise<void> => {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(join(OUT, "docs"), { recursive: true });
  await mkdir(join(OUT, "adrs"), { recursive: true });

  for (const file of ROOT_FILES) await copyMarkdown(file, join(OUT, file));
  for (const file of (await readdir("docs")).filter((f) => f.endsWith(".md"))) {
    await copyMarkdown(join("docs", file), join(OUT, "docs", file));
  }
  for (const file of await readdir("adrs")) {
    // The .yml records are the authored source, so the site carries only the
    // generated reading surface: markdown, the graph data and the graph page.
    if (file.endsWith(".yml")) continue;
    if (file.endsWith(".md")) await copyMarkdown(join("adrs", file), join(OUT, "adrs", file));
    else await cp(join("adrs", file), join(OUT, "adrs", file));
  }
  console.log(`assembled site source at ${OUT}`);
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
  await assemble();
};

main().catch((err: unknown) => {
  console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
