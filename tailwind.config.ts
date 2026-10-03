import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: {
          light: '#FBFBFA',
          dark: '#0B0F19',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#1E293B',
          subtle: '#F8F9FA',
          subtleDark: '#0F172A',
          elevatedDark: '#334155',
        },
        border: {
          subtle: '#E2E8F0',
          strong: '#CBD5E1',
          darkSubtle: '#1E293B',
          darkStrong: '#334155',
        },
        brand: {
          primary: '#4F46E5',
          hover: '#4338CA',
          light: '#EEF2FF',
          darkPrimary: '#6366F1',
          darkHover: '#818CF8',
        },
        ink: {
          primary: '#1E293B',
          secondary: '#475569',
          muted: '#64748B',
          darkPrimary: '#F8FAFC',
          darkSecondary: '#E2E8F0',
          darkMuted: '#94A3B8',
        },
        status: {
          synced: '#10B981',
          syncing: '#4F46E5',
          offline: '#D97706',
          error: '#E11D48',
        },
        // OneNote pastel section tabs
        section: {
          peach: {
            bg: '#FFE4D6',
            text: '#EA580C',
            border: '#FDBA74',
            darkBg: '#431407',
            darkText: '#FB923C',
            darkBorder: '#7C2D12',
          },
          sage: {
            bg: '#DCFCE7',
            text: '#16A34A',
            border: '#86EFAC',
            darkBg: '#052E16',
            darkText: '#4ADE80',
            darkBorder: '#14532D',
          },
          lavender: {
            bg: '#EDE9FE',
            text: '#7C3AED',
            border: '#C4B5FD',
            darkBg: '#2E1065',
            darkText: '#A78BFA',
            darkBorder: '#581C87',
          },
          sky: {
            bg: '#E0F2FE',
            text: '#0284C7',
            border: '#7DD3FC',
            darkBg: '#082F49',
            darkText: '#38BDF8',
            darkBorder: '#075985',
          },
          butter: {
            bg: '#FEF9C3',
            text: '#CA8A04',
            border: '#FDE047',
            darkBg: '#422006',
            darkText: '#FACC15',
            darkBorder: '#713F12',
          },
          rose: {
            bg: '#FFE4E6',
            text: '#E11D48',
            border: '#FDA4AF',
            darkBg: '#4C0519',
            darkText: '#FB7185',
            darkBorder: '#881337',
          },
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
