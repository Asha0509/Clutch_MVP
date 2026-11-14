import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // PRD Sec 8: src/engine is pure. No I/O, no frameworks, no clock, no randomness, no referral code (Sec 9).
  {
    files: ["src/engine/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "firebase",
                "firebase/*",
                "firebase-admin",
                "firebase-admin/*",
                "node:*",
                "fs",
                "path",
                "http",
                "https",
                "next",
                "next/*",
                "react",
                "react-dom",
                "@/lib/*",
                "@/app/*",
                "**/referral",
                "**/referral/*",
                "../*",
                "../**",
              ],
              message:
                "src/engine is pure (PRD Sec 8): no I/O, frameworks or referral code.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "No network in src/engine (PRD Sec 8)." },
        {
          name: "XMLHttpRequest",
          message: "No network in src/engine (PRD Sec 8).",
        },
        {
          name: "localStorage",
          message: "No storage in src/engine (PRD Sec 8).",
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.name='Date'][property.name='now']",
          message: "Pass today in (PRD Sec 8).",
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: "Pass today in (PRD Sec 8).",
        },
        {
          selector:
            "MemberExpression[object.name='Math'][property.name='random']",
          message: "No randomness in src/engine (PRD Sec 8).",
        },
        {
          selector: "MemberExpression[object.name='process']",
          message: "No environment access in src/engine (PRD Sec 8).",
        },
        {
          selector: "MemberExpression[object.name='globalThis']",
          message: "No globals in src/engine (PRD Sec 8).",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
