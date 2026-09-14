import { describe, expect, test } from "bun:test";
import { checkMarkdown, fixMarkdown } from "../../src/index.ts";

describe("PG001 sentence-per-line reflow", () => {
  test("reflows a wrapped paragraph and passes the gate afterwards", () => {
    const fixed = fixMarkdown("First sentence wraps over\nthis line. Second sentence also\nwraps badly here.\n");
    expect(fixed).toBe("First sentence wraps over this line.\nSecond sentence also wraps badly here.\n");
    expect(checkMarkdown(fixed, "doc.md")).toHaveLength(0);
  });

  test("is idempotent", () => {
    const content = "One clean sentence.\nAnother clean sentence.\n";
    expect(fixMarkdown(content)).toBe(content);
  });

  test("splits a single line holding two sentences", () => {
    expect(fixMarkdown("Run `tool.exe now` then check. Done here.\n")).toBe(
      "Run `tool.exe now` then check.\nDone here.\n",
    );
  });

  test("keeps list-item indentation", () => {
    expect(fixMarkdown("- A list item sentence that wraps\n  onto a second line. And more.\n")).toBe(
      "- A list item sentence that wraps onto a second line.\n  And more.\n",
    );
  });

  test("leaves blockquotes alone", () => {
    const content = "> Quoted text that wraps\n> mid-sentence stays put.\n";
    expect(fixMarkdown(content)).toBe(content);
  });

  test("never splits on a terminal inside a double-backtick code span", () => {
    const content = "Run ``a. B`` then\nstop.\n";
    expect(fixMarkdown(content)).toBe("Run ``a. B`` then stop.\n");
  });

  test("leaves a paragraph with a hard break exactly as written", () => {
    const content = "Line one wraps  \nline two.\n";
    expect(fixMarkdown(content)).toBe(content);
  });
});
