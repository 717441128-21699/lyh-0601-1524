/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: { center: true },
    extend: {
      fontFamily: {
        sans: ['"PingFang SC"', '"Noto Sans SC"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
        display: ['"Noto Sans SC"', "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#1E88E5",
          600: "#1976D2",
          700: "#1565C0",
          900: "#0d47a1",
        },
      },
      animation: {
        flow: "flowPath 3s linear infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 4s ease-in-out infinite",
        scan: "scan 2s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite",
        blink: "blink 1s step-end infinite",
      },
      keyframes: {
        flowPath: { "0%": { strokeDashoffset: "100" }, "100%": { strokeDashoffset: "0" } },
        float: { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-3px)" } },
        scan: { "0%, 100%": { transform: "translateY(-100%)" }, "50%": { transform: "translateY(100%)" } },
        glow: {
          "0%, 100%": { boxShadow: "0 0 10px rgba(14, 165, 233, 0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(14, 165, 233, 0.7)" },
        },
        blink: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.3" } },
      },
    },
  },
  plugins: [],
};
