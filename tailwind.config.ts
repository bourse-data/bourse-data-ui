import type {Config} from 'tailwindcss';

export default {
    darkMode: 'class',
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                bg: 'hsl(var(--bg) / <alpha-value>)',
                surface: 'hsl(var(--surface) / <alpha-value>)',
                'surface-2': 'hsl(var(--surface-2) / <alpha-value>)',
                border: 'hsl(var(--border) / <alpha-value>)',
                text: 'hsl(var(--text) / <alpha-value>)',
                muted: 'hsl(var(--muted) / <alpha-value>)',
                primary: 'hsl(var(--primary) / <alpha-value>)',
                positive: 'hsl(var(--positive) / <alpha-value>)',
                negative: 'hsl(var(--negative) / <alpha-value>)',
                warning: 'hsl(var(--warning) / <alpha-value>)',
            },
            fontFamily: {
                sans: ['Vazirmatn', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
            },
            boxShadow: {
                card: '0 6px 24px -10px rgba(15, 23, 42, 0.18)',
            },
        },
    },
    plugins: [],
} satisfies Config;
