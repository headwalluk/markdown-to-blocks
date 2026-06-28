import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const pkg = JSON.parse(readFileSync("./package.json", "utf8")) as {
  version: string;
};

export default defineConfig({
  entry: {
    index: "src/index.ts",
    cli: "src/cli.ts",
  },
  format: ["esm"],
  target: "node18",
  platform: "node",
  dts: true,
  clean: true,
  sourcemap: true,
  // Bundle all runtime deps into dist/ so the published package is zero-dependency.
  // (remark/unified/gfm/frontmatter/yaml are devDependencies, inlined here.)
  noExternal: [/.*/],
  // Inline the package version so the CLI's `--version` works without reading fs.
  define: {
    VERSION: JSON.stringify(pkg.version),
  },
  // Bundled CJS deps (yaml) use dynamic require(); provide a real `require` in
  // the ESM output so esbuild's interop shim resolves it instead of throwing.
  banner: {
    js: "import { createRequire as __md2b_cr } from 'module';\nconst require = __md2b_cr(import.meta.url);",
  },
  // The shebang for the CLI lives at the top of src/cli.ts; esbuild preserves it.
});
