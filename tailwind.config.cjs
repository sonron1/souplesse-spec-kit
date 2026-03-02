/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{vue,js,ts,jsx,tsx}',
    './components/**/*.{vue,js,ts,jsx,tsx}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './nuxt.config.{js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#FFF9E6',
          100: '#FFF0B3',
          200: '#FFE066',
          300: '#F5C840',
          400: '#E6B800',
          500: '#D4A017',
          600: '#B8860B',
          700: '#9A7209',
          800: '#7A5C07',
          900: '#5C4305',
        },
        gold: '#D4A017',
        'off-white': '#F5F5F0',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
