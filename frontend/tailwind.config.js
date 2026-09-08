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
      colors: {
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
