/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          cyan:  '#06b6d4',
          pink:  '#ec4899',
          green: '#22c55e',
          yellow:'#facc15',
        },
      },
      boxShadow: {
        'neon-cyan': '0 0 12px #06b6d4, 0 0 30px #06b6d466',
        'neon-pink': '0 0 12px #ec4899, 0 0 30px #ec489966',
      },
    },
  },
  plugins: [],
};
