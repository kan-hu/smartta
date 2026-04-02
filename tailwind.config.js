/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#f0f9f4',
          100: '#d9f0e5',
          200: '#b3e1cc',
          400: '#4daa7a',
          500: '#2d8f60',
          600: '#1e7350',
          700: '#165c40',
          800: '#0f4530',
          900: '#082e20',
        },
      },
    },
  },
  plugins: [],
}
