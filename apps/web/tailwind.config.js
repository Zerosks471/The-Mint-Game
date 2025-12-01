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
        // Gaming Dashboard Base Colors
        dark: {
          base: '#0a0a0f',
          card: '#12121a',
          elevated: '#1a1a24',
          input: '#0f0f15',
          border: '#2a2a3a',
          'border-subtle': '#1f1f2a',
        },
        // Accent Colors
        mint: {
          DEFAULT: '#10b981',
          glow: 'rgba(16, 185, 129, 0.4)',
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        cyan: {
          DEFAULT: '#06b6d4',
          glow: 'rgba(6, 182, 212, 0.4)',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        blue: {
          DEFAULT: '#3b82f6',
          glow: 'rgba(59, 130, 246, 0.4)',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
        },
        purple: {
          DEFAULT: '#a855f7',
          glow: 'rgba(168, 85, 247, 0.4)',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
        },
        pink: {
          DEFAULT: '#ec4899',
          glow: 'rgba(236, 72, 153, 0.4)',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
        },
        amber: {
          DEFAULT: '#f59e0b',
          glow: 'rgba(245, 158, 11, 0.4)',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'glow-pulse': 'glowPulse 1.5s ease-in-out infinite',
        'bounce-sm': 'bounceSm 200ms ease-out',
        'slide-in-top': 'slideInTop 300ms ease-out',
        'slide-in-right': 'slideInRight 300ms ease-out',
        'fade-in': 'fadeIn 200ms ease-out',
        'scale-in': 'scaleIn 200ms ease-out',
        'confetti': 'confetti 1s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'count-up': 'countUp 500ms ease-out',
        'roll-in': 'rollIn 150ms ease-out forwards',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(34, 197, 94, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(34, 197, 94, 0.8), 0 0 30px rgba(34, 197, 94, 0.4)' },
        },
        bounceSm: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.95)' },
        },
        slideInTop: {
          from: { transform: 'translateY(-100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        scaleIn: {
          from: { transform: 'scale(0.9)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        confetti: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(-100vh) rotate(720deg)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        countUp: {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        rollIn: {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
