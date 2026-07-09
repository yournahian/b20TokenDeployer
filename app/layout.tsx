import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'B20 Token Deployer — Deploy & Mint B20 Tokens on Base',
  description: 'Deploy and mint B20 tokens on Base in one click — Base\'s native ERC-20 superset precompile with built-in roles, supply caps, and pausing.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
