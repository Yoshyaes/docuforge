import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0B',
        surface: '#111113',
        'surface-hover': '#18181B',
        border: '#27272A',
        'border-subtle': '#1E1E21',
        'text-primary': '#FAFAFA',
        'text-muted': '#71717A',
        'text-dim': '#52525B',
        accent: '#F97316',
        'accent-glow': 'rgba(249,115,22,0.15)',
        'accent-soft': 'rgba(249,115,22,0.08)',
        green: '#22C55E',
        blue: '#3B82F6',
        purple: '#A855F7',
        red: '#EF4444',
      },
      fontFamily: {
        // Reference the CSS variables that next/font sets on <html>
        // (see apps/dashboard/src/app/layout.tsx). Without these, the
        // dashboard renders in the browser's system fallback even
        // though DM Sans + JetBrains Mono are loaded.
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
