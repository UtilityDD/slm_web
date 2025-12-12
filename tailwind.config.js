/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Hind Siliguri', 'sans-serif'],
        bengali: ['Hind Siliguri', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
