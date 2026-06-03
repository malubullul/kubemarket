export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        market: {
          green: '#03ac0e',
          orange: '#ff6d00',
          ink: '#17202a',
          line: '#e5e7eb'
        }
      },
      boxShadow: {
        soft: '0 8px 24px rgba(23, 32, 42, 0.08)'
      }
    }
  },
  plugins: []
};
