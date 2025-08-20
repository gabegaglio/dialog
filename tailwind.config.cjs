/***** Tailwind config *****/
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#ffffff',
        foreground: '#000000',
        brand: {
          DEFAULT: '#000000',
          50: '#f8f9fa',
          100: '#e9ecef',
          200: '#dee2e6',
          300: '#ced4da',
          400: '#adb5bd',
          500: '#6c757d',
          600: '#495057',
          700: '#343a40',
          800: '#212529',
          900: '#000000'
        }
      }
    }
  },
  plugins: [],
};
