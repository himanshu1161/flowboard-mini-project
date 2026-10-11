import type { Config } from 'tailwindcss'

/**
 * Flowboard design tokens. All styling is Tailwind utilities; this file is the
 * single place the visual system is defined.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F7F8FA',
        surface: '#FFFFFF',
        sunken: '#F1F3F6',
        line: { DEFAULT: '#E4E7EC', strong: '#D0D5DD' },
        ink: { DEFAULT: '#101828', soft: '#344054', muted: '#667085', faint: '#98A2B3' },
        brand: {
          50: '#EEF2FF', 100: '#E0E7FF', 200: '#C7D2FE', 500: '#6366F1', 600: '#4F46E5', 700: '#4338CA',
        },
        danger: { 50: '#FEF3F2', 100: '#FEE4E2', 500: '#F04438', 600: '#D92D20', 700: '#B42318' },
        success: { 50: '#ECFDF3', 500: '#12B76A', 700: '#027A48' },
        warning: { 50: '#FFFAEB', 500: '#F79009', 700: '#B54708' },
        priority: {
          urgent: '#D92D20', high: '#F79009', normal: '#2E90FA', low: '#98A2B3',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '10px',
        control: '8px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.04)',
        'card-hover': '0 4px 12px -2px rgba(16,24,40,0.10), 0 2px 4px -2px rgba(16,24,40,0.06)',
        drag: '0 16px 32px -8px rgba(16,24,40,0.25), 0 4px 8px -4px rgba(16,24,40,0.10)',
        popover: '0 12px 24px -6px rgba(16,24,40,0.14), 0 4px 8px -4px rgba(16,24,40,0.06)',
        drawer: '-16px 0 40px -12px rgba(16,24,40,0.20)',
      },
      keyframes: {
        'toast-in': { from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' }, to: { opacity: '1', transform: 'none' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '25%': { transform: 'translateX(-3px)' }, '75%': { transform: 'translateX(3px)' } },
      },
      animation: {
        'toast-in': 'toast-in 180ms ease-out',
        shake: 'shake 250ms ease-in-out',
      },
    },
  },
} satisfies Config
