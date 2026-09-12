import type { ReactNode } from 'react';

export const metadata = {
  title: 'Aaje Su? — API',
  description: 'Backend API for the Aaje Su? city activity feed.',
};

/**
 * Minimal root layout. This project is an API surface, not a UI — the consumer
 * app lives separately. This exists only so Next.js can boot.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
