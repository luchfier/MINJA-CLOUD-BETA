/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-main, #0A0D14)',
        surface: 'var(--bg-surface, #121824)',
        'surface-elevated': 'var(--bg-elevated, #1A2234)',
        border: 'var(--border-color, rgba(255, 255, 255, 0.08))',
        primary: {
          DEFAULT: 'var(--color-primary, #D97706)',
          hover: 'var(--color-primary-hover, #B45309)',
          light: 'var(--color-primary-light, #FBBF24)',
          glow: 'var(--color-primary-glow, rgba(217, 119, 6, 0.35))',
        },
        accent: {
          DEFAULT: 'var(--color-accent, #38BDF8)',
          hover: 'var(--color-accent-hover, #0284C7)',
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        editorial: ['Playfair Display', 'Georgia', 'serif'],
        'body-md': ['Plus Jakarta Sans', 'sans-serif'],
        'label-code': ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-primary': '0 0 24px -4px var(--color-primary-glow, rgba(217, 119, 6, 0.35))',
        'glow-accent': '0 0 24px -4px rgba(56, 189, 248, 0.35)',
        'touch-active': '0 0 0 4px var(--color-primary-glow, rgba(217, 119, 6, 0.4))',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backdropBlur: {
        'xs': '2px',
        'touch': '16px',
      },
      minHeight: {
        'touch-target': '56px',
      },
      minWidth: {
        'touch-target': '56px',
      },
    },
  },
  plugins: [],
}
