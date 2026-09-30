/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      textColor: {
        gray: { 300: '#4b5563', 400: '#4b5563', 500: '#4b5563' },
        slate: { 300: '#475569', 400: '#475569', 500: '#475569' },
        stone: { 300: '#57534e', 400: '#57534e', 500: '#57534e' },
        zinc: { 300: '#52525b', 400: '#52525b', 500: '#52525b' },
        neutral: { 300: '#525252', 400: '#525252', 500: '#525252' },
      },
      colors: {
        brand: {
          50: '#f5f3ff',
          500: '#7c3aed',
          600: '#6d28d9',
          700: '#5b21b6',
        },
      },
    },
  },
  plugins: [],
};
