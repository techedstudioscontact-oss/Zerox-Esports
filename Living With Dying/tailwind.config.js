/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // ── Zerox eSports Brand (matching Aniryx red/black) ──────────
                background: '#09090b', // Zinc-950 (deepest black)
                surface: '#18181b', // Zinc-900 (card backgrounds)
                surfaceHighlight: '#27272a', // Zinc-800 (hover states)

                primary: '#EB1B24', // Zerox Red  (main brand)
                secondary: '#ffffff', // White
                accent: '#FF4D4D', // Lighter red (highlights / glow)

                // Functional
                success: '#00c853',
                error: '#ff1744',
                warning: '#ffab00',
                info: '#2979ff',

                textMain: '#ffffff',
                textMuted: '#a1a1aa', // Zinc-400

                // Legacy aliases
                'royal-black': '#09090b',
                'metallic-gold': '#EB1B24',
                'blaze-orange': '#EB1B24',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Rajdhani', 'sans-serif'],
                cinematic: ['Rajdhani', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            backgroundImage: {
                'gradient-red': 'linear-gradient(135deg, #EB1B24 0%, #990000 100%)',
                'gradient-primary': 'linear-gradient(135deg, #EB1B24 0%, #B91C1C 100%)',
                'gradient-dark': 'linear-gradient(to bottom, transparent, #09090b)',
                'grid-pattern': "linear-gradient(to right, #ffffff05 1px, transparent 1px), linear-gradient(to bottom, #ffffff05 1px, transparent 1px)",
                'red-radial': 'radial-gradient(circle at top right, #990000 0%, #09090b 60%)',
            },
            boxShadow: {
                'primary-glow': '0 0 20px rgba(235, 27, 36, 0.4)',
                'neon': '0 0 10px rgba(235, 27, 36, 0.5), 0 0 20px rgba(235, 27, 36, 0.3)',
                'gold-glow': '0 0 20px rgba(212, 175, 55, 0.3)',
            },
            animation: {
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
                'slide-up': 'slideUp 0.5s ease-out forwards',
                'slide-down': 'slideDown 0.3s ease-out forwards',
                'fade-in': 'fadeIn 0.5s ease-out forwards',
                'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
                'fade-in-down': 'fadeInDown 0.3s ease-out forwards',
                'slide-in-right': 'slideInRight 0.3s ease-out forwards',
                'slide-in-left': 'slideInLeft 0.3s ease-out forwards',
                'breathing': 'breathing 4s ease-in-out infinite',
                'glitch': 'glitch 1s linear infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeInUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                fadeInDown: {
                    '0%': { transform: 'translateY(-10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideInRight: {
                    '0%': { transform: 'translateX(100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                slideInLeft: {
                    '0%': { transform: 'translateX(-100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                breathing: {
                    '0%, 100%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.02)' },
                },
                glitch: {
                    '2%, 64%': { transform: 'translate(2px,0) skew(0deg)' },
                    '4%, 60%': { transform: 'translate(-2px,0) skew(0deg)' },
                    '62%': { transform: 'translate(0,0) skew(5deg)' },
                },
            },
        },
    },
    plugins: [],
};
