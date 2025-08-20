export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem' },
    extend: {
      fontFamily: {
        heading: ['Montserrat', 'ui-sans-serif', 'system-ui'],
        body: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      borderRadius: { xl: '0.75rem', '2xl': '1rem', '3xl': '1.25rem' },
      boxShadow: { soft: '0 8px 30px rgba(0,0,0,0.06)' },
      colors: {
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        accent: 'var(--accent)',
        textmain: 'var(--text-main)',
        textsoft: 'var(--text-soft)',
        danger: 'var(--danger)',
        muted: 'var(--muted)',
      },
    },
  },
  plugins: [],
}
