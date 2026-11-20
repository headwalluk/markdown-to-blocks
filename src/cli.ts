#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { markdownToBlocks } from "./convert.js";
import { parseMarkdownDocument } from "./document.js";
import {
  applyOptionDefaults,
  type ConvertOptions,
  validateOptions,
} from "./types.js";

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
  --min-heading-level <n>   Clamp heading levels to [n, 6], n from 1 to 6 (default 2)
  --heading-anchors         Add an id/anchor to each heading from its text
  --code-language <mode>    'drop' (default) or 'class' (emit language-xxx)
  --unsupported <mode>      'html' (default) or 'skip' (drop block and inline HTML)
  --url-schemes <mode>      'safe' (default: http(s)/mailto/tel/relative) or 'any'
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
  /** Every argument problem found, reported together before any conversion. */
  errors: string[];
}

/** Parse an integer flag value, recording an error instead when it isn't one. */
function parseIntegerFlag(
  flag: string,
  value: string | undefined,
  errors: string[],
): number | undefined {
  let parsed: number | undefined;
  if (value != null) {
    const candidate = value.trim() === "" ? Number.NaN : Number(value);
    if (Number.isInteger(candidate)) {
      parsed = candidate;
    } else {
      errors.push(`${flag} expects an integer (got ${JSON.stringify(value)})`);
    }
  }
  return parsed;
}

/** Parse argv into CLI args, collecting every unknown flag or bad value in `errors`. */
function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    frontmatter: false,
    help: false,
    version: false,
    options: {},
    errors: [],
  };
  const positionals: string[] = [];

  let index = 0;
  while (index < argv.length) {
    const arg = argv[index] ?? "";
    index += 1;

    // Reads the value following a value-taking flag; `-1` is a valid value.
    const takeValue = (): string | undefined => {
      const value = argv[index];
      if (value == null) {
        args.errors.push(`${arg} requires a value`);
      } else {
        index += 1;
      }
      return value;
    };

    switch (arg) {
      case "-i":
      case "--input":
        args.input = takeValue();
        break;
      case "-o":
      case "--output":
        args.output = takeValue();
        break;
      case "--frontmatter":
        args.frontmatter = true;
        break;
      case "--heading-shift":
        args.options.headingShift = parseIntegerFlag(arg, takeValue(), args.errors);
        break;
      case "--min-heading-level":
        args.options.minHeadingLevel = parseIntegerFlag(arg, takeValue(), args.errors);
        break;
      case "--heading-anchors":
        args.options.headingAnchors = true;
        break;
      case "--code-language":
        // Mode values are checked by validateOptions below.
        args.options.codeLanguage = takeValue() as ConvertOptions["codeLanguage"];
        break;
      case "--unsupported":
        args.options.unsupported = takeValue() as ConvertOptions["unsupported"];
        break;
      case "--url-schemes":
        args.options.urlSchemes = takeValue() as ConvertOptions["urlSchemes"];
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
        if (arg.startsWith("-") && arg !== "-") {
          args.errors.push(`unknown option ${arg}`);
        } else {
          positionals.push(arg);
        }
        break;
    }
  }

  // A bare positional file acts as input when -i wasn't given.
  const [positional, ...extra] = positionals;
  if (positional != null && args.input == null) {
    args.input = positional;
  } else if (positional != null) {
    extra.unshift(positional);
  }
  for (const unexpected of extra) {
    args.errors.push(`unexpected argument ${JSON.stringify(unexpected)}`);
  }

  args.errors.push(...validateOptions(applyOptionDefaults(args.options)));
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
  if (args.errors.length > 0) {
    for (const error of args.errors) {
      process.stderr.write(`md2blocks: ${error}\n`);
    }
    process.stderr.write("Run md2blocks --help for usage.\n");
    return 1;
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
