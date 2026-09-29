export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /**
         * Brand palette derived from the client's official logo.
         * The logo's own pink (#FFCFED) is brand-200, so tints, surfaces and
         * floral accents match the logo exactly; brand-600 is the primary
         * action colour (AA contrast with white text).
         */
        brand: {
          50: '#FFF6FB',
          100: '#FFECF7',
          200: '#FFCFED', // ← sampled from the logo background
          300: '#FDB4E0',
          400: '#F98BCB',
          500: '#F063B2',
          600: '#CC3374', // primary CTA (4.9:1 on white)
          700: '#A82A60',
          800: '#8A2350',
          900: '#6E1C41',
          950: '#450E28',
        },
        // Neutral ink scale — near-black text for readability on white.
        ink: '#141414',
        'ink-soft': '#5C5C66',
        // Primary background is white; blush is a whisper-soft pink tint used
        // to alternate sections without introducing a second background colour.
        cream: '#FFFFFF',
        blush: '#FFF6FB',
        // Botanical accent retained for herbal cues, kept muted and secondary.
        leaf: {
          50: '#F4F8F3',
          100: '#E6EFE4',
          500: '#6C8F6E',
          600: '#557555',
          700: '#415C42',
        },
      },
      fontFamily: {
        // Elegant display serif for headings, readable sans for body/UI.
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 6px 24px -8px rgba(204, 51, 116, 0.18)',
        card: '0 2px 12px -2px rgba(20, 20, 20, 0.08)',
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
};
