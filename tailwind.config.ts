import type { Config } from "tailwindcss";

/**
 * Todas as cores apontam para CSS custom properties definidas em src/app/globals.css.
 * Trocar a marca = editar os tokens naquele arquivo, sem tocar em componente algum.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--brand)",
          strong: "var(--brand-strong)",
          soft: "var(--brand-soft)",
        },
        surface: {
          0: "var(--surface-0)",
          1: "var(--surface-1)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
        },
        fg: {
          hi: "var(--text-hi)",
          lo: "var(--text-lo)",
          mut: "var(--text-mut)",
        },
        positive: "var(--positive)",
        warning: "var(--warning)",
        negative: "var(--negative)",
      },
      borderColor: {
        DEFAULT: "var(--border)",
        strong: "var(--border-strong)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
      },
      fontSize: {
        xs: "var(--text-xs)",
        sm: "var(--text-sm)",
        base: "var(--text-base)",
        lg: "var(--text-lg)",
        xl: "var(--text-xl)",
        "2xl": "var(--text-2xl)",
        "3xl": "var(--text-3xl)",
        "4xl": "var(--text-4xl)",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "var(--radius-sm)",
      },
      transitionTimingFunction: {
        brand: "cubic-bezier(0.2, 0, 0, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
