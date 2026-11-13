/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        win: {
          face: '#c0c0c0',
          light: '#ffffff',
          hi: '#dfdfdf',
          shadow: '#808080',
          dark: '#0a0a0a',
          title: '#000080',
          title2: '#1084d0',
          desktop: '#008080',
        },
      },
      fontFamily: {
        sans: ['"MS Sans Serif"', '"Segoe UI"', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
        mono: ['"Fixedsys"', '"Lucida Console"', '"Courier New"', 'monospace'],
      },
    },
  },
  plugins: [],
};
