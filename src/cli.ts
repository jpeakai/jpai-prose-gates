// The command line: check files, optionally fix them first. The process
// glue lives in bin.ts so tests can call main() directly.

import { parseArgs } from "node:util";
import { checkModel, DEFAULT_MAX_WORDS } from "./check.ts";
import { fixMarkdown } from "./fix/engine.ts";
import { buildDocModel } from "./model.ts";
import { RULES } from "./rules/index.ts";
import { CATEGORIES } from "./rules/types.ts";

const USAGE = `usage: prose-gates <file.md> [...more] [--fix] [--json] [--max-words N]

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
Exits 1 when findings remain, 2 on usage error.`;

export const main = async (argv: string[] = Bun.argv.slice(2)): Promise<number> => {
  let values: { fix?: boolean; json?: boolean; help?: boolean; "max-words"?: string };
  let positionals: string[];
  try {
    ({ values, positionals } = parseArgs({
      args: argv,
      options: {
        fix: { type: "boolean", default: false },
        json: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
        "max-words": { type: "string" },
      },
      allowPositionals: true,
      strict: true,
    }));
  } catch (err) {
    console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
    console.error(USAGE);
    return 2;
  }
  if (values.help) {
    console.log(USAGE);
    return 0;
  }
  const maxWords = values["max-words"] === undefined ? DEFAULT_MAX_WORDS : Number(values["max-words"]);
  if (positionals.length === 0 || Number.isNaN(maxWords) || maxWords < 1) {
    console.error(USAGE);
    return 2;
  }

  const perFile = await Promise.all(
    positionals.map(async (file) => {
      let src = await Bun.file(file).text();
      if (values.fix) {
        const fixed = fixMarkdown(src);
        if (fixed !== src) {
          await Bun.write(file, fixed);
          src = fixed;
        }
      }
      return checkModel(buildDocModel(src), file, maxWords);
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
