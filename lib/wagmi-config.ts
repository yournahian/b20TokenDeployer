import { createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors';
import { QueryClient } from '@tanstack/react-query';

// WalletConnect Project ID — get a free one at cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '00000000000000000000000000000000';

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected({ shimDisconnect: true }),
    walletConnect({
      projectId,
      metadata: {
        name: 'B20 Token Deployer',
        description: 'Deploy and mint B20 tokens on Base — the native ERC-20 superset precompile.',
        url: 'https://b20deployer.vercel.app',
        icons: ['https://b20deployer.vercel.app/Favicon.png'],
      },
      showQrModal: false, // Web3Modal handles the QR UI
    }),
    coinbaseWallet({
      appName: 'B20 Token Deployer',
      appLogoUrl: 'https://b20deployer.vercel.app/Favicon.png',
    }),
  ],
  transports: {
    [base.id]: http('https://mainnet.base.org'),
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
});

export const queryClient = new QueryClient();
