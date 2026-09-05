/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          950: '#061810',
          900: '#0A2318',
          800: '#0D2B1F',
          700: '#1A3D2B',
          600: '#2D5A3F',
          500: '#4B7A5B',
        },
        leaf: {
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
        },
      },
      fontFamily: {
        grotesk: ['"Space Grotesk"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
