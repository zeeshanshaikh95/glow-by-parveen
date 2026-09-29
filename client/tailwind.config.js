import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Glow by Parveen brand palette — pink + white, natural/herbal warmth.
        // Exact shades to be finalized from the client's logo (PRD §14 / §26).
        brand: {
          50: '#FFF1F5',
          100: '#FFE4EC',
          200: '#FECDDC',
          300: '#FDA4BE',
          400: '#FB7AA4',
          500: '#F1518A',
          600: '#DE3B75',
          700: '#BC2A5E',
          800: '#9D2750',
          900: '#832344',
          950: '#4E0C24',
        },
        // Soft botanical/leaf green accent for "natural/herbal" cues.
        leaf: {
          50: '#F2F8F1',
          100: '#E1EEDF',
          500: '#5F8D62',
          600: '#4A7450',
          700: '#3B5E40',
        },
        cream: '#FFF9F7',
        blush: '#FFF4F0',
        ink: '#3D2B2F',
        'ink-soft': '#7A5F66',
      },
      fontFamily: {
        // Elegant display serif for headings, readable sans for body (PRD §14).
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 6px 24px -8px rgba(158, 42, 82, 0.16)',
        card: '0 2px 12px -2px rgba(158, 42, 82, 0.10)',
      },
      borderRadius: {
        blob: '1.75rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        'fade-in': 'fade-in 0.4s ease-out both',
        'slide-in-right': 'slide-in-right 0.28s ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config;
