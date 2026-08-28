import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MediaVault - Personal Social Media Downloader & Vault',
  description: 'High-performance self-hosted media archiving studio for Instagram, Threads, X, TikTok, YouTube, Reddit, Pinterest, and Facebook.',
  keywords: ['mediavault', 'downloader', 'social media', 'archiver', 'self-hosted', 'instagram', 'tiktok', 'x', 'threads'],
  authors: [{ name: 'MediaVault' }],
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#071221',
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
      <body className="bg-[#071221] text-white font-sans antialiased selection:bg-emerald-500/30 selection:text-white min-h-[100dvh]">
        {children}
      </body>
    </html>
  );
}