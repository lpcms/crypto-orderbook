import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

// next/font вместо @import в CSS: шрифт самохостится и подгружается без
// отдельного блокирующего запроса к Google Fonts — важно для Performance в Lighthouse.
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Order Book — Binance, Coinbase, Bitfinex, Kraken, Bybit, OKX',
  description:
    'Стакан заявок в реальном времени сразу с шести бирж: Binance, Coinbase, Bitfinex, Kraken, Bybit, OKX. Спот и фьючерсы, группировка по цене.'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0f17'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${mono.className} antialiased`}>{children}</body>
    </html>
  );
}
