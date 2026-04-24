/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#FFF1F2",
          100: "#FFE4E6",
          200: "#FECDD3",
          300: "#FDA4AF",
          400: "#FB7185",
          500: "#F43F5E",
          600: "#E11D48",
          700: "#BE123C",
          800: "#9F1239",
          900: "#881337"
        },
        accent: {
          50: "#FDF2F8",
          100: "#FCE7F3",
          200: "#FBCFE8",
          300: "#F9A8D4",
          400: "#EC4899",
          500: "#DB2777",
          600: "#BE185D",
          700: "#9D174D"
        },
        category: {
          50: "#F3E8FF",
          100: "#E9D5FF",
          500: "#A855F7",
          600: "#9333EA"
        },
        ink: {
          900: "#111827",
          800: "#1F2937",
          700: "#374151",
          600: "#4B5563",
          500: "#6B7280"
        },
        surface: {
          DEFAULT: "#F9FAFB",
          panel: "#FFFFFF",
          soft: "#F9FAFB",
          muted: "#F3F4F6",
          line: "#E5E7EB"
        },
        clinical: {
          success: "#059669",
          warning: "#D97706",
          danger: "#DC2626",
          info: "#2563EB"
        }
      },
      boxShadow: {
        panel: "0 20px 25px -5px rgba(0, 0, 0, 0.10), 0 8px 10px -6px rgba(0, 0, 0, 0.10)",
        soft: "0 1px 2px rgba(0, 0, 0, 0.05)",
        medium: "0 4px 6px -1px rgba(0, 0, 0, 0.10), 0 2px 4px -2px rgba(0, 0, 0, 0.10)",
        float: "0 4px 14px rgba(225, 29, 72, 0.24)"
      },
      borderRadius: {
        "4xl": "2rem"
      },
      fontFamily: {
        sans: ['Be Vietnam Pro', 'Arial', 'system-ui', 'sans-serif'],
        display: ['Be Vietnam Pro', 'Arial', 'system-ui', 'sans-serif'],
        mono: ['Noto Sans Mono', 'ui-monospace', 'SFMono-Regular', 'monospace']
      }
    }
  },
  plugins: []
}
