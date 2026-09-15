import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Deep teal = trust/water, amber = pending/attention, not the generic SaaS blue
        ink: "#0F2A2E",
        teal: {
          50: "#EFF7F6",
          100: "#D8ECEA",
          300: "#7FBFB9",
          500: "#2C8C84",
          600: "#227069",
          700: "#1B5854",
        },
        amber: {
          100: "#FCEACB",
          500: "#D98E2A",
          600: "#B5721A",
        },
        clay: "#C8553D",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "14px",
      },
    },
  },
  plugins: [],
};
export default config;
