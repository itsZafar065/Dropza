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
        // Modern Emerald & Obsidian Spruce System
        emerald: {
          DEFAULT: "#10B981",
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
          950: "#022C22",
        },
        obsidian: {
          950: "#070B08",
          900: "#0B120E", // Dark Canvas Primary
          850: "#111C15", // Dark Elevated Surface / Card
          800: "#16261D", // Dark Card Hover
          750: "#1D3325", // Dark Border / Divider
          700: "#274533",
          600: "#376047",
        },
        mint: {
          50: "#F6FAF7", // Light Canvas Primary
          100: "#EFF6F0",
          200: "#DCE8DE", // Light Border
          300: "#C2D7C5",
          700: "#536E5A", // Light Text Muted
          900: "#0E1B13", // Light Text Primary
        },
        // Seamless backward-compatible mapped tokens
        charcoal: {
          950: "#070B08",
          900: "#0B120E",
          850: "#111C15",
          800: "#1D3325",
          700: "#274533",
        },
        forest: {
          950: "#070B08",
          900: "#0B120E",
          800: "#111C15",
          700: "#16261D",
          600: "#1D3325",
          500: "#10B981",
        },
        leaf: {
          DEFAULT: "#10B981",
          dark: "#059669",
          light: "#34D399",
          glow: "rgba(16, 185, 129, 0.4)",
          subtle: "rgba(16, 185, 129, 0.12)",
        },
        cream: {
          DEFAULT: "#F0FDF4",
          light: "#FFFFFF",
          muted: "#8EA895",
        },
        navy: {
          950: "#0B120E", // Dark Canvas
          900: "#111C15", // Dark Card
          850: "#16261D", // Dark Hover
          800: "#1D3325", // Dark Border
          750: "#223D2C",
          700: "#274533",
          600: "#376047",
          500: "#536E5A",
        },
        violet: {
          DEFAULT: "#10B981",
          glow: "#34D399",
          dark: "#059669",
          light: "#A7F3D0",
          subtle: "rgba(16, 185, 129, 0.12)",
        },
        surface: {
          dark: "#111C15",
          darker: "#0B120E",
          border: "#1D3325",
          light: "#FFFFFF",
          lightBorder: "#DCE8DE",
          lightMuted: "#EFF6F0",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(16, 185, 129, 0.35)",
        "glow-lg": "0 0 50px -10px rgba(16, 185, 129, 0.45)",
      },
      animation: {
        "pulse-subtle": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.2s ease-in-out",
        "slide-up": "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
