/** A palette color read from a CSS variable of space-separated RGB channels. */
const c = name => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // No sticky hover styles after a tap on phones.
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      // Every color comes from a CSS variable (src/index.css), so light and
      // dark themes swap the whole palette. `white` is the text color: white
      // in dark mode, near-black in light mode. `snow` is always white.
      colors: {
        ink: { DEFAULT: c('ink'), 2: c('ink-2'), 3: c('ink-3'), 4: c('ink-4') },
        line: c('line'),
        white: c('fg'),
        snow: '#ffffff',
        brand: { DEFAULT: c('brand'), soft: 'rgb(var(--brand) / 0.12)', strong: c('brand-strong') },
        good: c('good'),
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
