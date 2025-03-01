/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'solana': '#9945FF',
        'raydium': '#7C76DA',
      },
    },
  },
  plugins: [],
};
