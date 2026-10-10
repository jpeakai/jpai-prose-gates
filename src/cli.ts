// The command line: check files, optionally fix them first. The process
// glue lives in bin.ts so tests can call main() directly.

import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { checkModel } from "./check.ts";
import { FlagError, ProseGatesError, UsageError } from "./errors.ts";
import { fixMarkdownReport } from "./fix/engine.ts";
import { buildDocModel } from "./model.ts";
import type { PluginFailure } from "./plugins/index.ts";
import { setUp } from "./project.ts";
import { RULES } from "./rules/index.ts";
import type { LoadedSource, Registry } from "./rules/registry.ts";
import { CATEGORIES } from "./rules/types.ts";

const USAGE = `usage: prose-gates <file.md> [...more] [--fix] [--json] [--max-words N] [--config FILE]
                   [--no-plugins | --lenient-plugins]
       prose-gates --list-rules
       prose-gates --validate-plugins [--json] [--config FILE]

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
Plugins load on their own from .prose-gates/rules and from dependencies named prose-gates-plugin-*.
--no-plugins runs the built-in rules only, for a baseline or a repo you do not trust.
--lenient-plugins skips a plugin that fails to load and says so, instead of stopping the run.
--validate-plugins loads and checks every plugin, reports every failure, and runs no check or fix.
--list-rules prints every active rule by category, including plugin rules, and where each plugin came from.
A rule reports as an error, a warning or not at all; the config sets "error", "warn" or "off" for each rule.
Exits 1 when an error remains or a plugin fails to load, 0 with only warnings, 2 on usage error.`;

interface Parsed {
  values: {
    fix?: boolean;
    json?: boolean;
    help?: boolean;
    "max-words"?: string;
    config?: string;
    "no-plugins"?: boolean;
    "lenient-plugins"?: boolean;
    "validate-plugins"?: boolean;
    "list-rules"?: boolean;
  };
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
      "no-plugins": { type: "boolean", default: false },
      "lenient-plugins": { type: "boolean", default: false },
      "validate-plugins": { type: "boolean", default: false },
      "list-rules": { type: "boolean", default: false },
    },
    allowPositionals: true,
    strict: true,
  });

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;

const namesOf = (sources: LoadedSource[]): string =>
  sources.map((s) => `${s.namespace} (${plural(s.rules.length, "rule")})`).join(", ");

// The one line every run prints about third-party code, because loading it is
// automatic. It says what ran, or what was skipped, and prints nothing when the
// project has no plugins.
export const loadedLine = (sources: LoadedSource[], skipped: string[]): string | null => {
  if (skipped.length > 0) return `prose-gates: plugins off; skipped ${skipped.join(", ")}`;
  if (sources.length === 0) return null;
  return `prose-gates: loaded ${namesOf(sources)}`;
};

// One line for each plugin a lenient run left out, with the named reason, and
// one for each config setting dropped because its plugin did not load.
export const skippedLines = (failures: PluginFailure[], ignored: string[]): string[] => [
  ...failures.map((f) => `prose-gates: skipped plugin ${f.source} [${f.error.code}]: ${reasonOf(f)}`),
  ...ignored.map((id) => `prose-gates: ignored config setting for ${id}, whose plugin did not load`),
];

// The reason without the "plugin <source>:" the error message begins with.
const reasonOf = (f: PluginFailure): string => f.error.message.replace(`plugin ${f.source}: `, "");

// Every active rule under its category, then where each plugin came from.
// Built-in categories come first, in their fixed order, then plugin ones.
export const listRules = (registry: Registry): string => {
  const lines: string[] = [];
  for (const [category, description] of registry.categories) {
    const rules = registry.rules.filter((r) => r.category === category);
    if (rules.length === 0) continue;
    lines.push(`${category}: ${description}`);
    for (const r of rules) {
      const level = registry.levels.get(r.id);
      const tag = level === undefined || level === "error" ? "" : ` (${level})`;
      lines.push(`  ${r.id}${r.fix ? "*" : " "} ${r.summary}${tag}`);
    }
  }
  const off = registry.catalogue.filter((r) => registry.levels.get(r.id) === "off");
  if (off.length > 0) {
    lines.push("", 'off (set "warn" or "error" in the config to turn one on):');
    for (const r of off) lines.push(`  ${r.id}${r.fix ? "*" : " "} ${r.summary}`);
  }
  if (registry.sources.length > 0) {
    lines.push("", "plugins:");
    for (const s of registry.sources) lines.push(`  ${s.namespace} (${s.kind}) ${s.spec}`);
  }
  return lines.join("\n");
};

// The result of --validate-plugins: what loaded, every failure, and the exit
// code. Nothing here runs a check or a fix.
const validate = (
  registry: Registry,
  failures: PluginFailure[],
  json: boolean,
): { code: number; stdout: string | null; stderr: string[] } => {
  const sources = registry.sources.map((s) => ({ ...s }));
  const failed = failures.map((f) => ({ source: f.source, kind: f.kind, code: f.error.code, message: reasonOf(f) }));
  const code = failures.length > 0 ? 1 : 0;
  if (json)
    return {
      code,
      stdout: JSON.stringify({ valid: code === 0, plugins: sources, failures: failed }, null, 2),
      stderr: [],
    };
  if (failures.length > 0) {
    const total = failures.length + sources.length;
    return {
      code,
      stdout: null,
      stderr: [
        `prose-gates: plugin validation failed, ${failures.length} of ${plural(total, "source")}`,
        ...failed.map((f) => `  [${f.code}] ${f.source}: ${f.message}`),
      ],
    };
  }
  const line =
    sources.length === 0 ? "prose-gates: no plugins found" : `prose-gates: plugins valid: ${namesOf(registry.sources)}`;
  return { code, stdout: line, stderr: [] };
};

const run = async (argv: string[], cwd: string): Promise<number> => {
  let parsed: Parsed;
  try {
    parsed = parse(argv);
  } catch (err) {
    throw new FlagError("argv", err instanceof Error ? err.message : String(err));
  }
  const { values, positionals } = parsed;
  if (values.help) {
    console.log(USAGE);
    return 0;
  }
  // Absent means the rule's own option, then the default. Present is a flag
  // that wins for this run.
  const maxWords = values["max-words"] === undefined ? undefined : Number(values["max-words"]);
  const listing = values["list-rules"];
  const validating = values["validate-plugins"];
  if (maxWords !== undefined && (Number.isNaN(maxWords) || maxWords < 1)) {
    throw new FlagError("--max-words", `--max-words must be a number of at least 1, not "${values["max-words"]}"`);
  }
  if (values["no-plugins"] && values["lenient-plugins"]) {
    throw new FlagError("--lenient-plugins", "--no-plugins and --lenient-plugins contradict each other");
  }
  if (validating && (values["no-plugins"] || values.fix || listing)) {
    throw new FlagError("--validate-plugins", "--validate-plugins takes no --no-plugins, --fix or --list-rules");
  }
  if (validating && positionals.length > 0) {
    throw new FlagError("files", "--validate-plugins runs no check, so it takes no files");
  }
  if (positionals.length === 0 && !listing && !validating) throw new FlagError("files", "no files given");

  const { registry, skipped, failures } = await setUp({
    cwd,
    configPath: values.config,
    noPlugins: values["no-plugins"],
    lenient: values["lenient-plugins"],
    collect: validating,
  });

  if (validating) {
    const result = validate(registry, failures, Boolean(values.json));
    for (const line of result.stderr) console.error(line);
    if (result.stdout) console.log(result.stdout);
    return result.code;
  }

  const note = loadedLine(registry.sources, skipped);
  if (note) console.error(note);
  for (const line of skippedLines(failures, registry.ignoredSettings)) console.error(line);
  if (listing) {
    console.log(listRules(registry));
    return 0;
  }
  const perFile = await Promise.all(
    positionals.map(async (file) => {
      let src = await readFile(file, "utf8");
      if (values.fix) {
        const fixed = (await fixMarkdownReport(src, registry)).output;
        if (fixed !== src) {
          await writeFile(file, fixed);
          src = fixed;
        }
      }
      return await checkModel(buildDocModel(src), file, maxWords, registry);
    }),
  );
  const all = perFile.flat();
  const warnings = all.filter((f) => f.severity === "warn").length;
  const errors = all.length - warnings;

  if (values.json) {
    const skippedPlugins = failures.map((f) => ({
      source: f.source,
      kind: f.kind,
      code: f.error.code,
      message: reasonOf(f),
    }));
    console.log(
      JSON.stringify(
        { findings: all, errors, warnings, files: positionals.length, plugins: registry.sources, skippedPlugins },
        null,
        2,
      ),
    );
  } else {
    for (const f of all)
      console.log(`${f.file}:${f.line} ${f.rule}${f.severity === "warn" ? " (warn)" : ""} ${f.message}`);
    const split = warnings > 0 ? ` (${plural(errors, "error")}, ${plural(warnings, "warning")})` : "";
    console.log(`${all.length} finding(s) in ${positionals.length} file(s)${split}`);
  }
  // A warning is reported and never fails the run, so only an error sets the exit code.
  return errors > 0 ? 1 : 0;
};

// The line printed for a failure: its stable code, then the reason.
export const describeError = (err: unknown): string =>
  err instanceof ProseGatesError
    ? `error[${err.code}]: ${err.message}`
    : `error: ${err instanceof Error ? err.message : String(err)}`;

// A usage error prints its reason and the usage, and exits 2. Anything else is
// a runtime failure and propagates to bin.ts, which exits 1.
export const main = async (argv: string[] = process.argv.slice(2), cwd: string = process.cwd()): Promise<number> => {
  try {
    return await run(argv, cwd);
  } catch (err) {
    if (!(err instanceof UsageError)) throw err;
    console.error(describeError(err));
    console.error(USAGE);
    return 2;
  }
};
