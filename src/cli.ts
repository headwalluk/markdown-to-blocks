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

try {
  process.exit(run(process.argv.slice(2)));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`md2blocks: ${message}\n`);
  process.exit(1);
}
