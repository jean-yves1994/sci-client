import type { Config } from 'tailwindcss';

/**
 * Every colour resolves to a CSS variable defined in globals.css.
 *
 * This is what makes dark mode a single class swap on <html> rather than a
 * parallel set of `dark:` utilities on every element — and, critically, it lets
 * the SVG charts reference the same tokens (`stroke="var(--chart-1)"`), so they
 * re-theme without any JavaScript or re-render.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        'surface-3': 'rgb(var(--surface-3) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        'line-strong': 'rgb(var(--line-strong) / <alpha-value>)',

        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted) / <alpha-value>)',
          faint: 'rgb(var(--ink-faint) / <alpha-value>)',
          inverse: 'rgb(var(--ink-inverse) / <alpha-value>)',
        },

        brand: {
          50: 'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
        },

        // Semantic status. Each has a surface tint and a legible foreground,
        // both of which change between themes.
        success: {
          bg: 'rgb(var(--success-bg) / <alpha-value>)',
          fg: 'rgb(var(--success-fg) / <alpha-value>)',
          solid: 'rgb(var(--success-solid) / <alpha-value>)',
        },
        warning: {
          bg: 'rgb(var(--warning-bg) / <alpha-value>)',
          fg: 'rgb(var(--warning-fg) / <alpha-value>)',
          solid: 'rgb(var(--warning-solid) / <alpha-value>)',
        },
        danger: {
          bg: 'rgb(var(--danger-bg) / <alpha-value>)',
          fg: 'rgb(var(--danger-fg) / <alpha-value>)',
          solid: 'rgb(var(--danger-solid) / <alpha-value>)',
        },
        info: {
          bg: 'rgb(var(--info-bg) / <alpha-value>)',
          fg: 'rgb(var(--info-fg) / <alpha-value>)',
          solid: 'rgb(var(--info-solid) / <alpha-value>)',
        },
        neutral: {
          bg: 'rgb(var(--neutral-bg) / <alpha-value>)',
          fg: 'rgb(var(--neutral-fg) / <alpha-value>)',
          solid: 'rgb(var(--neutral-solid) / <alpha-value>)',
        },
        accent: {
          bg: 'rgb(var(--accent-bg) / <alpha-value>)',
          fg: 'rgb(var(--accent-fg) / <alpha-value>)',
          solid: 'rgb(var(--accent-solid) / <alpha-value>)',
        },
      },

      borderRadius: { lg: '12px', xl: '16px', '2xl': '20px', '3xl': '26px' },

      boxShadow: {
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
        pop: 'var(--shadow-pop)',
      },

      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        // Restrained display size: the brief asks for sophistication over flash.
        display: ['1.75rem', { lineHeight: '2.125rem', letterSpacing: '-0.02em' }],
      },

      transitionTimingFunction: { swift: 'cubic-bezier(0.32, 0.72, 0, 1)' },

      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 180ms cubic-bezier(0.32,0.72,0,1)',
        'scale-in': 'scale-in 140ms cubic-bezier(0.32,0.72,0,1)',
      },
    },
  },
  plugins: [],
};

export default config;
