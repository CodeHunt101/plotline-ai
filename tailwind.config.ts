import type { Config } from 'tailwindcss'
import daisyui from 'daisyui'

export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      extend: {
        maxWidth: {
          'sm': '24.75rem',
        }
      },
      fontSize: {
        sm: '0.8rem',
        base: '1rem',
        xl: '1.25rem',
        '2xl': '1.563rem',
        '3xl': '1.953rem',
        '4xl': '2.441rem',
        '5xl': '2.813rem',
      },
      margin: {
        '12': '2.875rem',
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        mytheme: {
          primary: '#51E08A',

          secondary: '#FFFFFF',

          // "accent": "#00ffff",

          // "neutral": "#ff00ff",

          'base-100': '#000C36',

          "info": "#3B4877",

          // "success": "#00ff00",

          // "warning": "#00ff00",

          // "error": "#ff0000",
        },
      },
    ],
  },
} satisfies Config
