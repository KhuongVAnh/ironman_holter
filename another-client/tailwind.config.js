/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff1f4",
          100: "#ffe4ea",
          200: "#fecdd8",
          300: "#fda4b8",
          400: "#fb718f",
          500: "#f43f6f",
          600: "#e11d48",
          700: "#be123c",
          800: "#9f1239",
          900: "#881337"
        },
        ink: {
          900: "#1d1024",
          800: "#31203b",
          700: "#544462",
          600: "#786a84",
          500: "#9a8fa4"
        },
        surface: {
          DEFAULT: "#fdf8f8",
          panel: "#ffffff",
          soft: "#fff5f7",
          line: "#f5d7df"
        },
        clinical: {
          success: "#18a66c",
          warning: "#f59e0b",
          danger: "#ef4444",
          info: "#135bec"
        }
      },
      boxShadow: {
        panel: "0 24px 60px rgba(136, 19, 55, 0.14)",
        soft: "0 14px 34px rgba(136, 19, 55, 0.08)",
        float: "0 18px 40px rgba(225, 29, 72, 0.20)"
      },
      borderRadius: {
        "4xl": "2rem"
      },
      fontFamily: {
        sans: ['Lexend', 'Segoe UI', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
