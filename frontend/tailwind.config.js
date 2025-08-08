/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#5E2CA5',
        secondary: '#4CAF50',
        highlight: '#FDD835',
        text: '#FFFFFF',
        subtle: '#E0E0E0',
        danger: '#E53935',
      },
    fontFamily: {
        sans: ['"Inter"', 'sans-serif'],
        display: ['"Montserrat"', 'sans-serif'],
        mono: ['"Rubik"', 'sans-serif'],
    }
    },
  },
  plugins: [],
}
