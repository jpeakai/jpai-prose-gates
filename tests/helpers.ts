// Shared test helpers. Temporary files live under the project's own tmp/,
// never the system temp dir, so every artifact a test writes is inspectable.

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { checkMarkdown } from "../src/index.ts";

export const PROJECT_ROOT = resolve(import.meta.dir, "..");
const TMP = join(PROJECT_ROOT, "tmp", "tests");

export const tempFile = (content: string, name = "doc.md"): string => {
  mkdirSync(TMP, { recursive: true });
  const file = join(mkdtempSync(join(TMP, "prose-gates-")), name);
  writeFileSync(file, content);
  return file;
};

export const rules = (src: string, maxWords?: number): string[] =>
  checkMarkdown(src, "doc.md", maxWords).map((f) => f.rule);
