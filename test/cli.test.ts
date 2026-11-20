import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

// Runs the built CLI; `pretest` rebuilds dist/ so this never tests stale code.
const CLI_PATH = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const WORK_DIR = mkdtempSync(join(tmpdir(), "md2blocks-cli-"));

afterAll(() => {
  rmSync(WORK_DIR, { recursive: true, force: true });
});

/** Writes a Markdown file large enough to overflow a 64 KB pipe buffer. */
function writeLargeMarkdown(): string {
  const inputPath = join(WORK_DIR, "large.md");
  const paragraphs = Array.from(
    { length: 800 },
    (_value, index) => `Paragraph ${index} ${"word ".repeat(60)}`,
  );
  writeFileSync(inputPath, paragraphs.join("\n\n"));
  return inputPath;
}

describe("md2blocks CLI", () => {
  it("writes the whole output to a pipe, not just the first 64 KB", () => {
    const inputPath = writeLargeMarkdown();
    const outputPath = join(WORK_DIR, "large.html");

    // spawnSync captures stdout through a pipe.
    const piped = spawnSync(process.execPath, [CLI_PATH, "-i", inputPath], {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
    const toFile = spawnSync(process.execPath, [
      CLI_PATH,
      "-i",
      inputPath,
      "-o",
      outputPath,
    ]);

    expect(piped.status).toBe(0);
    expect(toFile.status).toBe(0);
    expect(piped.stdout.length).toBeGreaterThan(200_000);
    expect(piped.stdout).toBe(readFileSync(outputPath, "utf8"));
  });

  it("exits 141, like SIGPIPE, when the reader closes the pipe early", async () => {
    const inputPath = writeLargeMarkdown();
    const child = spawn(process.execPath, [CLI_PATH, "-i", inputPath]);

    // Close our end after the first chunk, as `| head -c 100` would.
    child.stdout.once("data", () => {
      child.stdout.destroy();
    });
    const stderrChunks: Buffer[] = [];
    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });
    const exitCode = await new Promise<number | null>((resolve) => {
      child.on("close", resolve);
    });

    expect(exitCode).toBe(141);
    expect(Buffer.concat(stderrChunks).toString("utf8")).toBe("");
  });

  it("exits 1 with a message when the input file is missing", () => {
    const result = spawnSync(
      process.execPath,
      [CLI_PATH, "-i", join(WORK_DIR, "missing.md")],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/^md2blocks: ENOENT/);
  });

  it("reports every argument error at once and exits 1 without converting", () => {
    const inputPath = join(WORK_DIR, "args.md");
    const outputPath = join(WORK_DIR, "args.html");
    writeFileSync(inputPath, "# Title\n");
    const result = spawnSync(
      process.execPath,
      [
        CLI_PATH,
        "--bogus",
        "--heading-shift",
        "abc",
        "--min-heading-level",
        "9",
        "--code-language",
        "colour",
        "-i",
        inputPath,
        "extra.md",
        "-o",
        outputPath,
        "--unsupported",
      ],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(
      [
        "md2blocks: unknown option --bogus",
        'md2blocks: --heading-shift expects an integer (got "abc")',
        "md2blocks: --unsupported requires a value",
        'md2blocks: unexpected argument "extra.md"',
        "md2blocks: minHeadingLevel must be an integer from 1 to 6 (got 9)",
        "md2blocks: codeLanguage must be 'drop' or 'class' (got \"colour\")",
        "Run md2blocks --help for usage.",
        "",
      ].join("\n"),
    );
    expect(() => readFileSync(outputPath, "utf8")).toThrow(/ENOENT/);
  });

  it("accepts a negative --heading-shift value", () => {
    const inputPath = join(WORK_DIR, "shift.md");
    writeFileSync(inputPath, "## Title\n");
    const result = spawnSync(
      process.execPath,
      [CLI_PATH, inputPath, "--heading-shift", "-1", "--min-heading-level", "1"],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('<h1 class="wp-block-heading">Title</h1>');
  });
});
