import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // The React 19 Compiler ships experimental ESLint rules that flag
    // patterns we use deliberately:
    //  - state mirrored to refs so addEventListener handlers (bound
    //    once during the canvas wrapper's lifetime) can read the
    //    latest store/transform value without re-binding every frame
    //  - useEffect that calls setState to coordinate UI state (e.g.
    //    auto-expand the inspector when a work is selected)
    // Runtime behaviour is correct under legacy and concurrent modes
    // in our cases; silencing the rules globally is cleaner than
    // peppering the codebase with per-line disables.
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
    },
  },
]);

export default eslintConfig;
