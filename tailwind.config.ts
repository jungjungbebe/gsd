import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        base: '#090909',
        surface: '#111111',
        card: '#141414',
        elevated: '#1a1a1a',
        purple: {
          100: '#e8e4ff',
          300: '#b8a8ff',
          500: '#7c5cfc',
          600: '#6344e8',
          900: '#1e1540',
        },
        'text-primary': '#f0f0ee',
        'text-secondary': '#888884',
        'text-muted': '#3a3a38',
        'text-purple': '#9c88ff',
      },
      fontFamily: {
        sans: ["'Pretendard Variable'", "'DM Sans'", '-apple-system', 'sans-serif'],
        mono: ["'DM Mono'", "'Courier New'", 'monospace'],
        serif: ["'Noto Serif KR'", 'Georgia', 'serif'],
      },
      borderRadius: {
        sm: '10px',
        md: '16px',
        lg: '22px',
        xl: '28px',
      },
    },
  },
  plugins: [],
}
export default config
