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
        // Design system v2 (theo FotoDocs): sáng, navy đặc là màu hành động duy nhất
        ink: '#121726',
        mv: {
          bg: '#F4F6FB',
          surface: '#FFFFFF',
          'surface-2': '#F8FAFD',
          hair: '#E4E8F1',
          'hair-strong': '#D4DAE8',
          fg: '#121726',
          muted: '#5B6579',
          'muted-2': '#687286',
          accent: '#1E3A8A',
          'accent-hover': '#15306F',
          'accent-soft': '#EAF0FB',
          ok: '#1F7A4D',
          'ok-soft': '#E7F4EC',
          warn: '#B45309',
          'warn-soft': '#FDF1E3',
          pro: '#C2710C',
          danger: '#B42318',
          'danger-soft': '#FDECEA',
        },
        // Bảng màu Tailwind cũ được viết cho nền tối → map lại cho nền sáng (chữ sáng ↔ chữ tối)
        slate: { 50: '#121726', 100: '#121726', 200: '#1B2233', 300: '#2B3345', 400: '#5B6579', 500: '#687286', 600: '#8A93A6', 700: '#D4DAE8', 800: '#E4E8F1', 900: '#FFFFFF', 950: '#F4F6FB' },
        zinc: { 50: '#121726', 100: '#121726', 200: '#1B2233', 300: '#2B3345', 400: '#5B6579', 500: '#687286', 600: '#8A93A6', 700: '#D4DAE8', 800: '#E4E8F1', 900: '#FFFFFF', 950: '#F4F6FB' },
        indigo: { 50: '#EAF0FB', 100: '#1E3A8A', 200: '#1E3A8A', 300: '#1E3A8A', 400: '#1E3A8A', 500: '#1E3A8A', 600: '#15306F', 700: '#122A62', 800: '#0F2353', 900: '#EAF0FB', 950: '#F3F6FC' },
        rose: { 50: '#FDECEA', 100: '#B42318', 200: '#B42318', 300: '#B42318', 400: '#B42318', 500: '#C0352B', 600: '#A31F15', 700: '#8F1B12', 800: '#F5C2BC', 900: '#FDECEA', 950: '#FEF4F2' },
        amber: { 50: '#FDF1E3', 100: '#B45309', 200: '#B45309', 300: '#B45309', 400: '#B45309', 500: '#C2710C', 600: '#A35F0A', 700: '#8A4F08', 800: '#F3D2A8', 900: '#FBE3C4', 950: '#FDF1E3' },
        emerald: { 50: '#E7F4EC', 100: '#1F7A4D', 200: '#1F7A4D', 300: '#1F7A4D', 400: '#1F7A4D', 500: '#1F7A4D', 600: '#196440', 700: '#145234', 800: '#B9DEC9', 900: '#E7F4EC', 950: '#F2FAF5' },
        sky: { 50: '#EAF3FB', 100: '#1D5E8C', 200: '#1D5E8C', 300: '#1D5E8C', 400: '#1D5E8C', 500: '#2272B0', 600: '#1B5F94', 700: '#A9C9E6', 800: '#D7E8F6', 900: '#EAF3FB', 950: '#F4F9FD' },
        cyan: { 300: '#0E6E80', 400: '#0E6E80', 500: '#0891B2', 600: '#0E7490' },
        orange: { 300: '#B45309', 400: '#B45309', 500: '#C2710C', 600: '#A35F0A' },
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
