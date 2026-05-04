import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#102033",
        mist: "#f5f7fb",
      },
      boxShadow: {
        card: "0 14px 30px rgba(16, 32, 51, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
