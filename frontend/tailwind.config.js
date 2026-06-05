/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        theme: {
          bg: '#050212',        // Deep space dark background
          card: '#0f0a28',      // Rich purple-slate card background
          accent: '#7c3aed',    // Royal purple
          neonCyan: '#06b6d4',  // Electric cyan
          neonPurple: '#d946ef',// Neon pink/purple
          text: '#f8fafc',      // Slate 50
          textMuted: '#94a3b8', // Slate 400
        }
      },
      fontFamily: {
        sans: ['Cairo', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.3)',
        'glow-purple': '0 0 20px rgba(124, 58, 237, 0.3)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
