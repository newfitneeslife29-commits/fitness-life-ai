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
      keyframes: {
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
        rise: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'none' } },
        pop: { '0%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.18)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        fade: 'fade 180ms ease-out',
        rise: 'rise 220ms cubic-bezier(.2,.8,.2,1)',
        pop: 'pop 260ms ease-out',
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
