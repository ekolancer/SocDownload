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
  themeColor: '#4F46E5',
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
    <html lang="en" className="light" suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-900 font-sans antialiased selection:bg-indigo-500/20 selection:text-indigo-900 min-h-[100dvh]">
        {children}
      </body>
    </html>
  );
}