import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        panel: '#0f1621',
        panelAlt: '#131c29',
        line: '#1f2a3a',
        bidGlow: '#1f5c45',
        askGlow: '#6b2330',
        accent: '#e8b23b'
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "'Roboto Mono'", 'ui-monospace', 'SFMono-Regular', 'monospace']
      }
    }
  },
  plugins: []
};
export default config;
