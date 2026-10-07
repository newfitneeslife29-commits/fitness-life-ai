/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0b0d10', 2: '#12151a', 3: '#1a1e25', 4: '#252a33' },
        line: '#2a303a',
        brand: { DEFAULT: '#f26b1d', soft: '#f26b1d1f', strong: '#ff8a3d' },
        good: '#34d399',
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
