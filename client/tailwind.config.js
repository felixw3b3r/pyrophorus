/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: {
          rail: '#0b0d14',
          darkest: '#0e111a',
          dark: '#141724',
          panel: '#1b1f30',
          hover: '#262a3e',
          text: '#e2e8f0',
          muted: '#94a3b8',
          accent: '#6366f1',
          accentHover: '#4f46e5',
          purpleGradient: '#8b5cf6',
          green: '#10b981',
          danger: '#ef4444',
        },
        discord: {
          darkest: '#0e111a',
          dark: '#141724',
          muted: '#94a3b8',
          accent: '#6366f1',
          accentHover: '#4f46e5',
        }
      }
    },
  },
  plugins: [],
}
