/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { geist: ['Geist', 'Inter', 'system-ui', 'sans-serif'], serif: ['Lora', 'Georgia', 'Times New Roman', 'serif'], sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'] }
    }
  },
  plugins: []
};
