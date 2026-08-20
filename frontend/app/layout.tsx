import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MediaVault — Personal Social Media Downloader & Vault',
  description: 'High-performance self-hosted media archiving studio for Instagram, Threads, X, TikTok, YouTube, Reddit, Pinterest, and Facebook.',
  keywords: ['mediavault', 'downloader', 'social media', 'archiver', 'self-hosted', 'instagram', 'tiktok', 'x', 'threads'],
  authors: [{ name: 'MediaVault' }],
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#08090D',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#08090D] text-[#EDEDF2] font-sans antialiased selection:bg-indigo-500/30 selection:text-indigo-200 min-h-screen">
        {children}
      </body>
    </html>
  );
}