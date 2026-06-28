// @wordpress/block-library ships no type declarations. It's a dev-only import
// used by the WordPress validation harness, so a minimal ambient declaration
// for the one function we call keeps strict typecheck happy without pulling in
// the whole (untyped) surface.
declare module "@wordpress/block-library" {
  /** Register all core block types with @wordpress/blocks. */
  export function registerCoreBlocks(): void;
}
