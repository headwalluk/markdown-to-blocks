import javascript from "@eslint/js";
import typescript from "typescript-eslint";
import house from "./tools/eslint-plugin-house/index.js";

export default typescript.config(
  { ignores: ["dist/", "node_modules/", "coverage/"] },
  javascript.configs.recommended,
  ...typescript.configs.recommended,
  {
    plugins: { house },
    rules: {
      "id-length": ["error", { min: 2, properties: "never" }],
      "no-empty": ["error", { allowEmptyCatch: false }],
      "house/no-swallowed-catch": "error",
      "house/no-return-in-loop": "error",
      "house/no-foreach-return": "error",
      "no-restricted-properties": ["error", {
        object: "process",
        property: "env",
        message: "The converter reads no environment. Options arrive through ConvertOptions or CLI flags.",
      }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^unused" }],
    },
  },
);
