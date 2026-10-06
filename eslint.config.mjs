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
    // 지우기 전에 잠시 옮겨 두는 폴더 (CLAUDE.md 파일 다루기 규칙) — 검사하지 않는다
    "trash-can/**",
  ]),
]);

export default eslintConfig;
