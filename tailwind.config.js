/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        senac: {
          blue: '#004a8d',
          orange: '#f58220'
        }
      }
    }
  },
  plugins: []
};

