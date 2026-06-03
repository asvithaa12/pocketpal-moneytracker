/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#556B2F',
          accent: '#D4AF37',
          surface: '#F8F7F2',
        },
        slate: {
          900: '#1F2937',
          700: '#4B5563',
          400: '#94A3B8',
          100: '#F1F5F9',
        },
        border: '#E2E8F0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
        pill: '20px',
      },
      spacing: {
        'nav': '60px',
      },
    },
  },
  plugins: [],
};
