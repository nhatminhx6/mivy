import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        mivy: {
          emerald: '#10b981',
          gold: '#f59e0b',
          dark: '#0a0d14',
          card: 'rgba(18, 24, 38, 0.72)',
          border: 'rgba(255, 255, 255, 0.1)',
        },
      },
      fontFamily: {
        sans: ['var(--font-vietnam)', 'sans-serif'],
        display: ['var(--font-jakarta)', 'sans-serif'],
        handwritten: ['var(--font-caveat)', 'cursive'],
      },
    },
  },
  plugins: [],
};
export default config;
