// The command line: check files, optionally fix them first. The process
// glue lives in bin.ts so tests can call main() directly.

import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { checkModel } from "./check.ts";
import { UsageError } from "./config.ts";
import { fixMarkdownReport } from "./fix/engine.ts";
import { buildDocModel } from "./model.ts";
import { setUp } from "./project.ts";
import { RULES } from "./rules/index.ts";
import { CATEGORIES } from "./rules/types.ts";

const USAGE = `usage: prose-gates <file.md> [...more] [--fix] [--json] [--max-words N] [--config FILE]

Deterministic prose gates (* = autofixable):
${CATEGORIES.map((c) =>
  [`  ${c}:`, ...RULES.filter((r) => r.category === c).map((r) => `    ${r.id}${r.fix ? "*" : " "} ${r.summary}`)].join(
    "\n",
  ),
).join("\n")}

Examples of every rule, with fixes: RULES.md

Code blocks are exempt, except fences tagged markdown/md: those hold
markdown templates and their body is audited recursively (check-only).

--fix applies every fix it can prove safe, then reports what remains.
A fixer that is unsure leaves the text alone and the finding stays.
--config FILE reads that config instead of prose-gates.config.json or .mjs at the project root.
Exits 1 when findings remain, 2 on usage error.`;

interface Parsed {
  values: { fix?: boolean; json?: boolean; help?: boolean; "max-words"?: string; config?: string };
  positionals: string[];
}

const parse = (argv: string[]): Parsed =>
  parseArgs({
    args: argv,
    options: {
      fix: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
      "max-words": { type: "string" },
      config: { type: "string" },
    },
    allowPositionals: true,
    strict: true,
  });

const run = async (argv: string[], cwd: string): Promise<number> => {
  let parsed: Parsed;
  try {
    parsed = parse(argv);
  } catch (err) {
    throw new UsageError(err instanceof Error ? err.message : String(err));
  }
  const { values, positionals } = parsed;
  if (values.help) {
    console.log(USAGE);
    return 0;
  }
  // Absent means the rule's own option, then the default. Present is a flag
  // that wins for this run.
  const maxWords = values["max-words"] === undefined ? undefined : Number(values["max-words"]);
  if (positionals.length === 0) throw new UsageError("no files given");
  if (maxWords !== undefined && (Number.isNaN(maxWords) || maxWords < 1)) {
    throw new UsageError(`--max-words must be a number of at least 1, not "${values["max-words"]}"`);
  }

  const registry = await setUp({ cwd, configPath: values.config });
  const perFile = await Promise.all(
    positionals.map(async (file) => {
      let src = await readFile(file, "utf8");
      if (values.fix) {
        const fixed = fixMarkdownReport(src, registry).output;
        if (fixed !== src) {
          await writeFile(file, fixed);
          src = fixed;
        }
      }
      return checkModel(buildDocModel(src), file, maxWords, registry);
    }),
  );
  const all = perFile.flat();

  if (values.json) {
    console.log(JSON.stringify({ findings: all, files: positionals.length }, null, 2));
  } else {
    for (const f of all) console.log(`${f.file}:${f.line} ${f.rule} ${f.message}`);
    console.log(`${all.length} finding(s) in ${positionals.length} file(s)`);
  }
  return all.length > 0 ? 1 : 0;
};

// A usage error prints its reason and the usage, and exits 2. Anything else is
// a runtime failure and propagates to bin.ts, which exits 1.
export const main = async (argv: string[] = process.argv.slice(2), cwd: string = process.cwd()): Promise<number> => {
  try {
    return await run(argv, cwd);
  } catch (err) {
    if (!(err instanceof UsageError)) throw err;
    console.error(`error: ${err.message}`);
    console.error(USAGE);
    return 2;
  }
};
