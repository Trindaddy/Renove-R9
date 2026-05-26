/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#f8fafc', // Fundo principal da página (claro)
          800: '#f1f5f9', // Seções, tabelas e cabeçalhos secundários
          700: '#ffffff', // Fundo de cartões, modais e containers (branco puro)
          600: '#e2e8f0', // Hover de tabelas / divisores suaves
          500: '#cbd5e1', // Divisores e bordas gerais
        },
        cyan: {
          DEFAULT: '#004a8d', // Azul Senac
          dim: 'rgba(0, 74, 141, 0.08)',
          glow: 'rgba(0, 74, 141, 0.15)',
        },
        alert: {
          DEFAULT: '#f58220', // Laranja Senac
          dim: 'rgba(245, 130, 32, 0.08)',
          glow: 'rgba(245, 130, 32, 0.15)',
        },
        slate: {
          100: '#0f172a', // Texto principal (escuro no fundo claro)
          200: '#1e293b',
          300: '#334155', // Texto secundário
          400: '#475569',
          500: '#64748b', // Texto desativado / placeholder
          600: '#94a3b8',
          700: '#cbd5e1',
          800: '#e2e8f0',
          900: '#f1f5f9',
        },
        senac: {
          blue: '#004a8d',
          orange: '#f58220'
        }
      },
      fontFamily: {
        mono: ['"Fira Code"', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(100,255,218,0.15)',
        'glow-alert': '0 0 20px rgba(255,159,67,0.15)',
        'card': '0 10px 30px -10px rgba(2,12,27,0.7)',
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

