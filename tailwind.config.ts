import type { Config } from "tailwindcss";

// Tokens de English Personal Trainer.
// Fondo tinta-azulada (ni negro puro ni "SaaS gris"), con dos acentos con
// significado propio: ámbar para energía/logro (XP, streak, retos) y
// verde-azulado apagado para dominio/progreso (habilidades, calma).
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B131C", // fondo base
          900: "#101B26",
          800: "#172233", // superficies / tarjetas
          700: "#22303F", // bordes / divisores
        },
        mist: {
          400: "#6B7A8C", // texto secundario
          200: "#AEB9C4",
          50: "#EDF1F5", // texto principal
        },
        amber: {
          400: "#F2B84B", // energía: XP, streak, retos
          500: "#E0A431",
        },
        teal: {
          400: "#3FA7A0", // dominio: progreso, habilidades, calma
          500: "#2F8B85",
        },
        coral: {
          400: "#E2645C", // errores / atención, uso escaso
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
