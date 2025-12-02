import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";

export default tseslint.config(
  { ignores: ["dist", ".output"] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      importPlugin.flatConfigs.typescript,
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    settings: {
      "import/internal-regex": "^@/",
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],

      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "index",
            "sibling",
            "parent",
          ],
          pathGroups: [
            { pattern: "react", group: "external", position: "before" },
            { pattern: "react-dom", group: "external", position: "before" },
          ],
          distinctGroup: false,
          pathGroupsExcludedImportTypes: ["builtin"],
          "newlines-between": "always",
          named: { enabled: true, import: true, export: false, types: "mixed" },
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],

      "import/first": "error",
      "import/newline-after-import": "error",
      "import/no-duplicates": [
        "error",
        {
          "prefer-inline": true,
          considerQueryString: true,
        },
      ],
    },
  }
);
