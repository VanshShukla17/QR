import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/coverage/**",
      "**/test-results/**",
      "**/playwright-report/**",
      "apps/web/**", // apps/web has its own Next.js ESLint config
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ["apps/api/src/**/*.ts", "packages/shared/src/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  }
);
