import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aaje Su? — Admin Ops & Moderation Desk',
  description: 'Admin operations desk for Aaje Su? city activity feed.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          rel="stylesheet"
        />
        <script src="https://cdn.tailwindcss.com"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
            tailwind.config = {
              darkMode: "class",
              theme: {
                extend: {
                  colors: {
                    "surface-container-low": "#f5f3ef",
                    "inverse-primary": "#ffb5a0",
                    "secondary-fixed": "#e8e1dc",
                    "tertiary-fixed": "#ffdcc3",
                    "on-primary-fixed": "#3b0900",
                    "primary": "#ad2c00",
                    "error-container": "#ffdad6",
                    "on-tertiary-container": "#fffbff",
                    "on-secondary-container": "#686460",
                    "surface-dim": "#dbdad6",
                    "surface": "#fbf9f5",
                    "surface-bright": "#fbf9f5",
                    "on-background": "#1b1c1a",
                    "secondary-fixed-dim": "#ccc5c1",
                    "error": "#ba1a1a",
                    "inverse-surface": "#30312e",
                    "on-primary-container": "#fffbff",
                    "primary-fixed": "#ffdbd1",
                    "tertiary-container": "#b15f00",
                    "outline-variant": "#e3beb5",
                    "on-tertiary-fixed": "#2f1500",
                    "on-error": "#ffffff",
                    "on-tertiary-fixed-variant": "#6e3900",
                    "surface-container-high": "#eae8e4",
                    "on-surface": "#1b1c1a",
                    "on-tertiary": "#ffffff",
                    "tertiary": "#8d4b00",
                    "on-error-container": "#93000a",
                    "surface-tint": "#b12d00",
                    "tertiary-fixed-dim": "#ffb77d",
                    "primary-container": "#d34012",
                    "surface-container": "#efeeea",
                    "on-primary": "#ffffff",
                    "surface-container-highest": "#e4e2de",
                    "outline": "#8f7068",
                    "on-secondary-fixed-variant": "#4a4643",
                    "on-secondary": "#ffffff",
                    "primary-fixed-dim": "#ffb5a0",
                    "secondary-container": "#e8e1dc",
                    "on-secondary-fixed": "#1e1b18",
                    "background": "#fbf9f5",
                    "surface-container-lowest": "#ffffff",
                    "surface-variant": "#e4e2de",
                    "inverse-on-surface": "#f2f0ed",
                    "on-surface-variant": "#5a413a",
                    "on-primary-fixed-variant": "#872000",
                    "secondary": "#625e5a"
                  },
                  fontFamily: {
                    sans: ["Plus Jakarta Sans", "sans-serif"]
                  }
                }
              }
            };
          `,
          }}
        />
        <style>{`
          ::-webkit-scrollbar { display: none; }
          body { overscroll-behavior: none; }
        `}</style>
      </head>
      <body className="bg-background text-on-surface antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
