import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        synthora: {
          bg: "#F8FAFC",
          navy: "#0F172A",
          slate: "#475569",
          blue: "#2563EB",
          sky: "#38BDF8",
          accent: "#FF5DA2",
          rose: "#FB7185",
          glass: "rgba(255,255,255,0.86)",
          border: "rgba(148,163,184,0.22)",
        },
      },
      boxShadow: {
        glass: "0px 24px 60px rgba(15,23,42,.10)",
        glow: "0 24px 70px rgba(37,99,235,.16)",
      },
      fontFamily: {
        inter: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "synthora-radial":
          "radial-gradient(circle at 8% 10%, rgba(56,189,248,.16), transparent 30%), radial-gradient(circle at 90% 8%, rgba(255,93,162,.12), transparent 28%), radial-gradient(circle at 82% 72%, rgba(37,99,235,.08), transparent 26%), linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
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
