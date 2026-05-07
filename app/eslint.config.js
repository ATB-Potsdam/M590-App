import js from "@eslint/js";
import tsLint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default [
    {
        ignores: [
            "dist",
            "node_modules",
            ".yarn", // ← Yarn SDK-Dateien
            "android", // ← Capacitor Android Build
            "ios", // ← Capacitor iOS Build
            "**/*.wasm.d.ts", // ← WASM-Typdeklarationen
        ],
    },
    {
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: "module",
            },
            globals: {
                ...globals.browser,
                __APP_VERSION__: "readonly",
            },
        },
        plugins: {
            "@typescript-eslint": tsLint,
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        rules: {
            ...js.configs.recommended.rules,
            ...tsLint.configs["recommended"].rules,
            ...reactHooks.configs.recommended.rules,
            "react-refresh/only-export-components": [
                "warn",
                { allowConstantExport: true },
            ],
        },
    },
];
