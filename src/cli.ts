#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { markdownToBlocks } from "./convert.js";
import { parseMarkdownDocument } from "./document.js";
import type { ConvertOptions } from "./types.js";

const HELP = `md2blocks — convert Markdown to WordPress/Gutenberg block markup

Usage:
  md2blocks -i <file.md> [-o <out.html>]
  md2blocks <file.md>
  cat doc.md | md2blocks -

Options:
  -i, --input <file>        Input Markdown file (use "-" or omit for stdin)
  -o, --output <file>       Output file (default: stdout)
  --frontmatter             Emit JSON { frontmatter, blocks } instead of markup
  --heading-shift <n>       Shift all heading levels by n (default 0)
  --min-heading-level <n>   Clamp heading levels to [n, 6] (default 2)
  --heading-anchors         Add an id/anchor to each heading from its text
  --code-language <mode>    'drop' (default) or 'class' (emit language-xxx)
  --unsupported <mode>      'html' (default) or 'skip'
  --no-gfm                  Disable GFM (tables, strikethrough, autolinks)
  -h, --help                Show this help
  -v, --version             Show version
`;

interface CliArgs {
  input?: string;
  output?: string;
  frontmatter: boolean;
  help: boolean;
  version: boolean;
  options: ConvertOptions;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    frontmatter: false,
    help: false,
    version: false,
    options: {},
  };
  let positional: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "-i":
      case "--input":
        args.input = argv[++i];
        break;
      case "-o":
      case "--output":
        args.output = argv[++i];
        break;
      case "--frontmatter":
        args.frontmatter = true;
        break;
      case "--heading-shift":
        args.options.headingShift = Number(argv[++i]);
        break;
      case "--min-heading-level":
        args.options.minHeadingLevel = Number(argv[++i]);
        break;
      case "--heading-anchors":
        args.options.headingAnchors = true;
        break;
      case "--code-language":
        args.options.codeLanguage = argv[++i] as ConvertOptions["codeLanguage"];
        break;
      case "--unsupported":
        args.options.unsupported = argv[++i] as ConvertOptions["unsupported"];
        break;
      case "--no-gfm":
        args.options.gfm = false;
        break;
      case "-h":
      case "--help":
        args.help = true;
        break;
      case "-v":
      case "--version":
        args.version = true;
        break;
      default:
        if (arg != null && !arg.startsWith("-") && positional == null) {
          positional = arg;
        }
        break;
    }
  }

  // A bare positional file acts as input when -i wasn't given.
  if (args.input == null && positional != null) {
    args.input = positional;
  }
  return args;
}

function readInput(input: string | undefined): string {
  // "-" or no input → read stdin; otherwise read the named file.
  const source = input == null || input === "-" ? 0 : input;
  return readFileSync(source, "utf8");
}

function run(argv: string[]): number {
  const args = parseArgs(argv);

  if (args.help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (args.version) {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }

  // Reading stdin with nothing piped in would hang forever on a TTY — fail fast
  // with a usage hint instead.
  const wantsStdin = args.input == null || args.input === "-";
  if (wantsStdin && process.stdin.isTTY) {
    process.stderr.write(
      "md2blocks: no input provided. Pass -i <file>, give a filename, or pipe Markdown via stdin.\n\n",
    );
    process.stderr.write(HELP);
    return 1;
  }

  const markdown = readInput(args.input);
  const result = args.frontmatter
    ? `${JSON.stringify(parseMarkdownDocument(markdown, args.options), null, 2)}\n`
    : `${markdownToBlocks(markdown, args.options)}\n`;

  if (args.output != null) {
    writeFileSync(args.output, result);
  } else {
    process.stdout.write(result);
  }
  return 0;
}

// Replaced at build time by tsup `define`; falls back for ts-node/dev runs.
declare const VERSION: string;

// Exit code a shell reports for a process killed by SIGPIPE (128 + 13).
const EXIT_BROKEN_PIPE = 141;

/** Writes a CLI error message to stderr. */
function reportError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`md2blocks: ${message}\n`);
}

// Node ignores SIGPIPE, so a reader closing early (`| head`) surfaces as EPIPE.
process.stdout.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EPIPE") {
    process.exit(EXIT_BROKEN_PIPE);
  } else {
    reportError(error);
    process.exit(1);
  }
});

// Set exitCode rather than calling process.exit(): exiting immediately drops
// any stdout still queued for a full pipe.
try {
  process.exitCode = run(process.argv.slice(2));
} catch (error) {
  reportError(error);
  process.exitCode = 1;
}
