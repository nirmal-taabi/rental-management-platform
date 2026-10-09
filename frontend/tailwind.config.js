/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['General Sans', 'system-ui', 'sans-serif'],
      },
      textColor: {
        gray: { 300: '#4b5563', 400: '#4b5563', 500: '#4b5563' },
        slate: { 300: '#475569', 400: '#475569', 500: '#475569' },
        stone: { 300: '#57534e', 400: '#57534e', 500: '#57534e' },
        zinc: { 300: '#52525b', 400: '#52525b', 500: '#52525b' },
        neutral: { 300: '#525252', 400: '#525252', 500: '#525252' },
      },
      colors: {
        brand: {
          50: '#f9f3ff',
          100: '#f0e3ff',
          200: '#e1c7ff',
          300: '#cda3ff',
          400: '#b87fff',
          500: '#a862ff',
          600: '#a862ff',
          700: '#813dc9',
          800: '#682da6',
          900: '#50227f',
        },
      },
    },
  },
  plugins: [],
};
