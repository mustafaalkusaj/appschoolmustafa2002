import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Two UI defects found in the 2026-08-01 audit:
 *
 *  1. `<button>` elements with no click handler at all — they render, they
 *     hover, and nothing happens. Two "عرض الكل" buttons on the dashboard sat
 *     like that.
 *  2. A page rendering the app shell its own layout already renders, which
 *     stacked a second fixed sidebar and a second header over the content and
 *     nested a <main> inside a <main>.
 */

const APP_DIR = join(process.cwd(), "app");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/**
 * Extracts each opening tag for `tagName`. Brace-aware, so an arrow function
 * inside a handler does not terminate the tag at its `=>`.
 */
function openingTags(source: string, tagName: string): string[] {
  const tags: string[] = [];
  const needle = `<${tagName}`;
  let i = 0;

  for (;;) {
    const start = source.indexOf(needle, i);
    if (start === -1) break;

    const after = source[start + needle.length];
    if (after && /[A-Za-z0-9-]/.test(after)) {
      i = start + 1;
      continue;
    }

    let depth = 0;
    let quote: string | null = null;
    let j = start + needle.length;

    for (; j < source.length; j += 1) {
      const ch = source[j];
      if (quote) {
        if (ch === quote && source[j - 1] !== "\\") quote = null;
      } else if (ch === '"' || ch === "'" || ch === "`") {
        quote = ch;
      } else if (ch === "{") depth += 1;
      else if (ch === "}") depth -= 1;
      else if (ch === ">" && depth === 0) break;
    }

    tags.push(source.slice(start, j + 1));
    i = j + 1;
  }

  return tags;
}

const INTERACTIVE =
  /\bonClick\b|\btype="submit"\b|\bform=|\bonMouseDown\b|\bonPointerDown\b|\bonKeyDown\b|\bdisabled\b/;

describe("dashboard controls are wired up", () => {
  it("has no <button> without any click handler", () => {
    const offenders: string[] = [];

    for (const file of walk(APP_DIR)) {
      const source = readFileSync(file, "utf8");
      for (const tag of openingTags(source, "button")) {
        const flat = tag.replace(/\s+/g, " ");
        if (!INTERACTIVE.test(flat)) {
          offenders.push(
            `${file.replace(`${process.cwd()}/`, "")}: ${flat.slice(0, 80)}`,
          );
        }
      }
    }

    expect(
      offenders,
      "a <button> with no handler renders and hovers but does nothing when clicked",
    ).toEqual([]);
  });
});

describe("super-admin renders exactly one app shell", () => {
  const page = join(APP_DIR, "[locale]", "super-admin", "page.tsx");
  const layout = join(APP_DIR, "[locale]", "super-admin", "layout.tsx");

  it("the layout owns the shell", () => {
    const source = readFileSync(layout, "utf8");
    expect(source).toContain("<AppSidebar");
    expect(source).toContain("<AppShellTopbar");
  });

  it("the page does not render a second one", () => {
    // Strip comments first: this file explains the bug in prose, and the
    // explanation itself mentions the tags it is warning about.
    const source = readFileSync(page, "utf8")
      .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

    expect(source).not.toContain("<AppSidebar");
    expect(source).not.toContain("<AppShellTopbar");
    expect(
      source,
      "a <main> here would nest inside the layout's <main>",
    ).not.toMatch(/<main[\s>]/);
  });
});
