import './globals.css';

export const metadata = {
  title: 'OHMI Coffee Co. — Roasted in Middelburg',
  description: 'Single-origin coffee, roasted with purpose. Every kilogram feeds children in the Bitou region.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* IMPORTANT: do not remove this Google Fonts import (see Vollard lesson) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,500;9..144,700;9..144,900&family=Space+Grotesk:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
