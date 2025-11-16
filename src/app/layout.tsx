import Providers from '@/components/Providers';
import './globals.css';

export const metadata = {
  title: 'Budget Manager',
  description: 'Manage your budget like a pro with spreadsheet-style interface',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'light';
                document.documentElement.classList.add(theme);
                document.documentElement.classList.add('no-transition');
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Remove no-transition class after initial render
              setTimeout(() => {
                document.documentElement.classList.remove('no-transition');
              }, 0);
            `,
          }}
        />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
