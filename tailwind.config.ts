import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf4f5",
          100: "#fbe8ec",
          200: "#f6d0d9",
          300: "#efa9ba",
          400: "#e57694",
          500: "#d64d72",
          600: "#c02e58",
          700: "#a12148",
          800: "#871e40",
          900: "#731d3b",
        },
        gold: "#c9a227",
      },
      fontFamily: {
        display: ["Georgia", "serif"],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "scale(0.98)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.6s ease-out",
        "slide-up": "slide-up 0.5s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
