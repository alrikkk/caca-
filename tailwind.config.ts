import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./matching/**/*.{js,ts,jsx,tsx,mdx}",
    "./ai/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#F9F9F6",
          subtle: "#EFEFEA",
          muted: "#E4E3DC",
        },
        ink: {
          DEFAULT: "#0D0D0D",
          muted: "#5A5A55",
          faint: "#8C8C84",
          inverted: "#F9F9F6",
        },
        caca: {
          lime: "#D6F827",
          coral: "#FF4D2E",
          blue: "#2654F7",
          purple: "#7A3CE3",
          yellow: "#FFCA16",
          green: "#00C875",
          cyan: "#1BD7D7",
        },
      },
      boxShadow: {
        hard: "2px 2px 0px #0D0D0D",
        "hard-md": "4px 4px 0px #0D0D0D",
        "hard-lg": "6px 6px 0px #0D0D0D",
        "hard-xl": "8px 8px 0px #0D0D0D",
        "hard-active": "0px 0px 0px #0D0D0D",
        "hard-lime": "4px 4px 0px #D6F827",
        "hard-coral": "4px 4px 0px #FF4D2E",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-space-grotesk)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        none: "0px",
        sm: "2px",
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
      },
    },
  },
  plugins: [],
};
export default config;
