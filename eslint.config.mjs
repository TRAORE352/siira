import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  /*
   * Les fichiers de `scripts/` sont des outils en ligne de commande lancés
   * directement par Node (recette Playwright, relevés visuels, captures).
   * Ils sont écrits en CommonJS : `require` y est normal. L'application, elle,
   * reste en TypeScript strict avec des imports ES. L'exception est limitée à
   * ce dossier, l'application n'y a pas droit.
   */
  {
    files: ["scripts/**/*.js"],
    languageOptions: { sourceType: "commonjs" },
    rules: { "@typescript-eslint/no-require-imports": "off" },
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
