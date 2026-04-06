/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: '#101b2e',
        border: '#22324f',
      },
    },
  },
  plugins: [],
};
