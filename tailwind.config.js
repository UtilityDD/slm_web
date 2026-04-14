/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Hind Siliguri', 'sans-serif'],
        bengali: ['Noto Serif Bengali', 'serif'],
      },
      colors: {
        token: {
          bg: {
            page: 'var(--bg-page)',
            surface: 'var(--bg-surface)',
            elevated: 'var(--bg-surface-elevated)',
          },
          text: {
            primary: 'var(--text-primary)',
            secondary: 'var(--text-secondary)',
            muted: 'var(--text-muted)',
          },
          border: {
            DEFAULT: 'var(--border-default)',
            strong: 'var(--border-strong)',
          },
          action: {
            primary: 'var(--action-primary-bg)',
            'primary-fg': 'var(--action-primary-fg)',
          },
          state: {
            success: {
              bg: 'var(--state-success-bg)',
              fg: 'var(--state-success-fg)',
            },
            danger: {
              bg: 'var(--state-danger-bg)',
              fg: 'var(--state-danger-fg)',
            },
          },
        },
      },
      borderRadius: {
        tokenSm: 'var(--radius-sm)',
        tokenMd: 'var(--radius-md)',
        tokenLg: 'var(--radius-lg)',
        tokenXl: 'var(--radius-xl)',
        token2xl: 'var(--radius-2xl)',
      },
      boxShadow: {
        tokenSm: 'var(--shadow-sm)',
        tokenMd: 'var(--shadow-md)',
        tokenLg: 'var(--shadow-lg)',
      },
      spacing: {
        token1: 'var(--space-1)',
        token2: 'var(--space-2)',
        token3: 'var(--space-3)',
        token4: 'var(--space-4)',
        token5: 'var(--space-5)',
        token6: 'var(--space-6)',
        token8: 'var(--space-8)',
        token10: 'var(--space-10)',
      },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        base: 'var(--motion-base)',
        slow: 'var(--motion-slow)',
      },
      transitionTimingFunction: {
        standard: 'var(--ease-standard)',
      },
      zIndex: {
        overlay: 'var(--z-overlay)',
        modal: 'var(--z-modal)',
        toast: 'var(--z-toast)',
      },
    },
  },
  plugins: [],
}
