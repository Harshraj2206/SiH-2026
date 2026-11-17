/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1000px', // Cleanly captures 1024px displays with browser scrollbars (e.g. 1006px innerWidth)
        xl: '1280px',
        '2xl': '1536px',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro Display"', '"Helvetica Neue"', 'Inter', '"Segoe UI"', 'Roboto', 'Arial', 'sans-serif'],
        mono: ['"SF Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', '"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      borderRadius: {
        card: '18px',
        tile: '12px',
        field: '10px',
      },
      colors: {
        // Apple-style theme tokens (values in index.css, switch with light/dark)
        page: 'rgb(var(--rgb-page) / <alpha-value>)',
        surface: 'rgb(var(--rgb-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--rgb-surface-2) / <alpha-value>)',
        line: 'rgb(var(--rgb-line) / <alpha-value>)',
        label: 'rgb(var(--rgb-label) / <alpha-value>)',
        'label-2': 'rgb(var(--rgb-label-2) / <alpha-value>)',
        'label-3': 'rgb(var(--rgb-label-3) / <alpha-value>)',
        accent: 'rgb(var(--rgb-accent) / <alpha-value>)',
        'accent-text': 'rgb(var(--rgb-accent-text) / <alpha-value>)',
        risk: {
          low: 'rgb(var(--rgb-low) / <alpha-value>)',
          moderate: 'rgb(var(--rgb-moderate) / <alpha-value>)',
          high: 'rgb(var(--rgb-high) / <alpha-value>)',
          critical: 'rgb(var(--rgb-critical) / <alpha-value>)',
        },
        hazard: {
          low: '#10b981',      // Emerald 500
          moderate: '#f59e0b', // Amber 500
          high: '#f97316',     // Orange 500
          critical: '#ef4444', // Red 500
        },
        slate: {
          850: '#151f32',
          950: '#070d18',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      }
    },
  },
  plugins: [],
}
