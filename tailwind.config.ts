import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        synthora: {
          bg: "#FFFFFF",
          wash: "#EFF6FF",
          surface: "#F8FAFC",
          text: "#0F172A",
          muted: "#64748B",
          blue: "#2563EB",
          "blue-hover": "#1D4ED8",
          cyan: "#00A3FF",
          sky: "#06B6D4",
          amber: "#F59E0B",
          glass: "rgba(255,255,255,0.92)",
          border: "#E2E8F0",
        },
      },
      boxShadow: {
        glass: "0px 18px 50px rgba(15,23,42,.08)",
        glow: "0 24px 70px rgba(0,163,255,.18)",
      },
      fontFamily: {
        inter: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "synthora-radial":
          "radial-gradient(circle at 8% 10%, rgba(0,163,255,.16), transparent 30%), radial-gradient(circle at 92% 12%, rgba(6,182,212,.14), transparent 28%), radial-gradient(circle at 82% 72%, rgba(37,99,235,.10), transparent 26%), linear-gradient(180deg, #EFF6FF 0%, #FFFFFF 46%, #F8FAFC 100%)",
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
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        softBob: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        float: "float 5.5s ease-in-out infinite",
        drift: "drift 7s ease-in-out infinite",
        "pulse-glow": "pulseGlow 4s ease-in-out infinite",
        marquee: "marquee 28s linear infinite",
        "soft-bob": "softBob 4.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
