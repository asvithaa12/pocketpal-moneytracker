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
        card: '16px',
        btn: '10px',
        pill: '20px',
        xl2: '20px',
      },
      spacing: {
        nav: '64px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.1)',
        nav: '0 -4px 24px rgba(0,0,0,0.08)',
        fab: '0 8px 20px rgba(85,107,47,0.35)',
        'fab-hover': '0 12px 28px rgba(85,107,47,0.45)',
      },
    },
  },
  plugins: [],
};
