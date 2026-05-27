/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#111111', // Fundo principal mais neutro
          800: '#1A1A1A', // Fundo de seções / cards
          700: '#222222', // Hover
          600: '#333333', // Bordas
        },
        'senac-orange': '#f47920',
        'senac-blue': '#004a8d',
        primary: {
          DEFAULT: '#f47920', // Laranja do Senac
          dim: 'rgba(244, 121, 32, 0.1)',
          glow: 'rgba(244, 121, 32, 0.3)',
        },
        secondary: {
          DEFAULT: '#004a8d', // Azul do Senac
          dim: 'rgba(0, 74, 141, 0.1)',
        },
        accent: {
          DEFAULT: '#004a8d', // Azul como accent
          dim: 'rgba(0, 74, 141, 0.1)',
          glow: 'rgba(0, 74, 141, 0.3)',
        },
        peach: {
          DEFAULT: '#F2B988', // Pêssego claro (mantido como highlight)
        },
        slate: {
          100: '#F8FAFC', // Texto primário
          200: '#F1F5F9',
          300: '#CBD5E1', // Texto secundário
          400: '#94A3B8', // Labels
          500: '#64748B', // Desativado
        }
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(244, 121, 32, 0.25)',
        'glow-accent': '0 0 20px rgba(0, 74, 141, 0.25)',
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

