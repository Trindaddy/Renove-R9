/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: 'var(--color-bg-900)',
          800: 'var(--color-bg-800)',
          700: 'var(--color-bg-700)',
          600: 'var(--color-bg-600)',
        },
        primary: {
          DEFAULT: '#0511F2', // Azul vibrante
          dim: 'rgba(5, 17, 242, 0.1)',
          glow: 'rgba(5, 17, 242, 0.3)',
        },
        secondary: {
          DEFAULT: '#03588C', // Azul médio
          dim: 'rgba(3, 88, 140, 0.1)',
        },
        accent: {
          DEFAULT: '#F27F1B', // Laranja vibrante
          dim: 'rgba(242, 127, 27, 0.1)',
          glow: 'rgba(242, 127, 27, 0.3)',
        },
        peach: {
          DEFAULT: '#F2B988', // Pêssego claro
        },
        slate: {
          100: 'var(--color-text-100)',
          200: 'var(--color-text-200)',
          300: 'var(--color-text-300)',
          400: 'var(--color-text-400)',
          500: 'var(--color-text-500)',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(5, 17, 242, 0.25)',
        'glow-accent': '0 0 20px rgba(242, 127, 27, 0.25)',
        'glass': '0 4px 30px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 4s linear infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        }
      }
    }
  },
  plugins: []
};

