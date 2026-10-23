/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        olive: {
          dark: '#343B2B',
          primary: '#626B4F',
          light: '#A5AC8A',
          pale: '#E8EBDD',
        },
        cream: {
          warm: '#FAF9F5',
          pure: '#FFFFFF',
          grey: '#E7E4DB',
        },
        ink: {
          primary: '#292D25',
          secondary: '#77796E',
        },
        accent: {
          success: '#75885B',
          error: '#B75C4C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 8px rgba(52, 59, 43, 0.08)',
        card: '0 4px 16px rgba(52, 59, 43, 0.10)',
        lifted: '0 8px 28px rgba(52, 59, 43, 0.14)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
