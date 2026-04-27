/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#020c1b',
          800: '#0a192f',
          700: '#112240',
          600: '#172a45',
          500: '#1d3557',
        },
        cyan: {
          DEFAULT: '#64ffda',
          dim: 'rgba(100,255,218,0.1)',
          glow: 'rgba(100,255,218,0.3)',
        },
        alert: {
          DEFAULT: '#ff9f43',
          dim: 'rgba(255,159,67,0.1)',
          glow: 'rgba(255,159,67,0.3)',
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

