import type { Metadata } from 'next';
import * as React from 'react';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider, themeInitScript } from '@/lib/theme';
import './globals.css';

export const metadata: Metadata = {
  title: 'SCI — Collateral Inspection',
  description: 'Collateral inspection workflow for financial institutions',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the init script sets the `dark` class before
    // React hydrates, so the server and client html attributes differ by design.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
