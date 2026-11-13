import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#090A0F",
          subtle: "#0E1117",
          dark: "#050608",
        },
        card: {
          DEFAULT: "#161B22",
          elevated: "#1F242C",
          muted: "#12161D",
        },
        border: {
          DEFAULT: "#2D333B",
          subtle: "#30363D",
          bright: "#444C56",
        },
        accent: {
          cyan: {
            DEFAULT: "#00F2FE",
            glow: "rgba(0, 242, 254, 0.35)",
            dim: "#008b93",
          },
          emerald: {
            DEFAULT: "#00FF87",
            glow: "rgba(0, 255, 135, 0.35)",
            dim: "#009951",
          },
          crimson: {
            DEFAULT: "#FF3366",
            glow: "rgba(255, 51, 102, 0.35)",
            dim: "#a81339",
          },
          gold: {
            DEFAULT: "#FFD700",
            glow: "rgba(255, 215, 0, 0.35)",
            dim: "#b39700",
          },
          violet: {
            DEFAULT: "#8B5CF6",
            glow: "rgba(139, 92, 246, 0.35)",
          },
        },
        cyan: {
          DEFAULT: "#00F2FE",
          electric: "#00F2FE",
          glow: "rgba(0, 242, 254, 0.35)",
        },
        emerald: {
          DEFAULT: "#00FF87",
          acid: "#00FF87",
          glow: "rgba(0, 255, 135, 0.35)",
        },
        crimson: {
          DEFAULT: "#FF3366",
          hot: "#FF3366",
          glow: "rgba(255, 51, 102, 0.35)",
        },
        gold: {
          DEFAULT: "#FFD700",
          champ: "#FFD700",
          glow: "rgba(255, 215, 0, 0.35)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "var(--font-chakra)", "Chakra Petch", "sans-serif"],
        goofy: ["var(--font-goofy)", "var(--font-chakra)", "Chakra Petch", "sans-serif"],
        bouncy: ["var(--font-bouncy)", "var(--font-outfit)", "Outfit", "sans-serif"],
        sans: ["var(--font-sans)", "var(--font-outfit)", "Outfit", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "Space Mono", "monospace"],
      },
      boxShadow: {
        "goofy-cyan": "4px 4px 0px #00F2FE",
        "goofy-emerald": "4px 4px 0px #00FF87",
        "goofy-crimson": "4px 4px 0px #FF3366",
        "goofy-gold": "4px 4px 0px #FFD700",
        "goofy-violet": "4px 4px 0px #8B5CF6",
        "goofy-black": "4px 4px 0px #000000",
        "hud-cyan": "0 0 15px -3px rgba(0, 242, 254, 0.3), 0 0 6px -2px rgba(0, 242, 254, 0.2)",
        "hud-emerald": "0 0 15px -3px rgba(0, 255, 135, 0.3), 0 0 6px -2px rgba(0, 255, 135, 0.2)",
        "hud-crimson": "0 0 15px -3px rgba(255, 51, 102, 0.3), 0 0 6px -2px rgba(255, 51, 102, 0.2)",
        "hud-gold": "0 0 15px -3px rgba(255, 215, 0, 0.3), 0 0 6px -2px rgba(255, 215, 0, 0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
