import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        clinic: {
          teal: '#0B4F4A',      // primary brand — clinical trust
          'teal-light': '#12726B',
          mint: '#EAF4F1',      // soft surface / card background
          sand: '#F7F3EC',      // page background, warmer than plain white
          ink: '#1F2A28',       // body text
          amber: '#E8873A',     // urgency accent (emergency popup) — not red
        },
        whatsapp: '#25D366',    // kept as WhatsApp's own green — functional recognition, not decoration
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        urdu: ['var(--font-nastaliq)', 'serif'],
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(24px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slide-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        marquee: 'marquee 22s linear infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

export default config
