import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#07080F",
        foreground: "#F8FAFC",
        card: {
          DEFAULT: "#0D1117",
          foreground: "#F8FAFC",
        },
        popover: {
          DEFAULT: "#161B24",
          foreground: "#F8FAFC",
        },
        primary: {
          DEFAULT: "#00E5FF",
          foreground: "#07080F",
        },
        secondary: {
          DEFAULT: "#161B24",
          foreground: "#F8FAFC",
        },
        muted: {
          DEFAULT: "#161B24",
          foreground: "#94A3B8",
        },
        accent: {
          DEFAULT: "#1F2937",
          foreground: "#00E5FF",
        },
        destructive: {
          DEFAULT: "#FF4560",
          foreground: "#FFFFFF",
        },
        warning: {
          DEFAULT: "#F5A623",
          foreground: "#07080F",
        },
        success: {
          DEFAULT: "#00E096",
          foreground: "#07080F",
        },
        info: {
          DEFAULT: "#775DD0",
          foreground: "#FFFFFF",
        },
        border: "rgba(255,255,255,0.07)",
        input: "rgba(255,255,255,0.07)",
        ring: "#00E5FF",
      },
      borderRadius: {
        lg: "8px",
        md: "6px",
        sm: "4px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
