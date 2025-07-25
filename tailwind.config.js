/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB', // Blue-600
        success: '#10B981', // Emerald-500
        warning: '#F59E0B', // Amber-500
        error: '#EF4444', // Red-500
        'text-primary': '#111827', // Gray-900
        'text-secondary': '#6B7280', // Gray-500
        'text-muted': '#9CA3AF', // Gray-400
        'bg-primary': '#FFFFFF', // White
        'bg-secondary': '#F9FAFB', // Gray-50
        'bg-ai': '#EFF6FF', // Blue-50
        'border-light': '#E5E7EB', // Gray-200
        'border-medium': '#D1D5DB', // Gray-300
      },
      animation: {
        'pulse-soft': 'pulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
}