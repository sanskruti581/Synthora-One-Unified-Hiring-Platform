import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        synthora: {
          bg: "#3B0FD8",
          violet: "#8746EB",
          accent: "#FF5DA2",
          button: "#5A22E6",
          rose: "#FF6A95",
          glass: "rgba(255,255,255,0.08)",
          border: "rgba(255,255,255,0.15)",
        },
      },
      boxShadow: {
        glass: "0px 30px 60px rgba(0,0,0,.25)",
        glow: "0 0 60px rgba(255,93,162,.32)",
      },
      fontFamily: {
        inter: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "synthora-radial":
          "radial-gradient(circle at 74% 20%, rgba(255,93,162,.32), transparent 24%), radial-gradient(circle at 18% 12%, rgba(135,70,235,.58), transparent 34%), radial-gradient(circle at 82% 76%, rgba(255,255,255,.18), transparent 22%), linear-gradient(135deg, #260884 0%, #3B0FD8 42%, #6724DD 76%, #20084F 100%)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-18px)" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)", opacity: ".55" },
          "50%": { transform: "translate3d(18px, -18px, 0)", opacity: "1" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: ".45", transform: "scale(1)" },
          "50%": { opacity: ".9", transform: "scale(1.08)" },
        },
      },
      animation: {
        float: "float 5.5s ease-in-out infinite",
        drift: "drift 7s ease-in-out infinite",
        "pulse-glow": "pulseGlow 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
