const path = require("path");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    path.join(__dirname, "src/**/*.{js,ts,jsx,tsx,mdx}"),
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./apps/web/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "var(--bg-ink)",
          2: "var(--bg-ink-2)",
        },
        peach: {
          DEFAULT: "var(--bg-peach)",
          2: "var(--bg-peach-2)",
        },
        brand: {
          DEFAULT: "var(--brand)",
          soft: "var(--brand-soft)",
          deep: "var(--brand-deep)",
        },
        primary: {
          DEFAULT: "var(--brand)",
          dark: "var(--brand-soft)",
        },
        secondary: {
          DEFAULT: "var(--text-on-dark)",
          dark: "var(--text-on-dark)",
        },
        background: {
          DEFAULT: "var(--bg-ink)",
          dark: "var(--bg-ink)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          dark: "var(--surface)",
        },
        text: {
          DEFAULT: "var(--text-on-dark)",
          dark: "var(--text-on-dark)",
        },
        muted: {
          DEFAULT: "var(--text-on-dark-muted)",
          dark: "var(--text-on-dark-muted)",
        },
        border: {
          DEFAULT: "var(--line-dark)",
          dark: "var(--line-dark)",
        },
        verdict: {
          ok: "var(--ok)",
          warn: "var(--warn)",
          danger: "var(--danger)",
        },
        ok: "var(--ok)",
        warn: "var(--warn)",
        danger: "var(--danger)",
        tier: {
          verified: {
            DEFAULT: "var(--ok)",
            bg: "rgba(47, 191, 113, 0.15)",
          },
          unverified: {
            DEFAULT: "var(--warn)",
            bg: "rgba(242, 181, 49, 0.15)",
          },
          warning: {
            DEFAULT: "var(--danger)",
            bg: "rgba(229, 56, 79, 0.15)",
          },
          info: {
            DEFAULT: "var(--brand)",
            bg: "rgba(255, 75, 31, 0.15)",
          },
        },
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        sm: "8px",
        md: "14px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "28px",
        card: "24px",
        btn: "16px",
        tile: "14px",
        tab: "16px",
        full: "9999px",
      },
      boxShadow: {
        card: "0 8px 24px rgba(0, 0, 0, 0.06)",
        "card-hover": "0 12px 32px rgba(0, 0, 0, 0.08)",
        "red-glass": "0 8px 20px rgba(224, 38, 47, 0.25)",
        "red-glow": "0 4px 16px rgba(224, 38, 47, 0.35)",
        dock: "0 8px 32px rgba(0, 0, 0, 0.08)",
      },
      fontFamily: {
        sans: [
          "var(--font-satoshi)",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};
