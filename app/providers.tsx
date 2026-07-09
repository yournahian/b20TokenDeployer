'use client';

import React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider } from '@tanstack/react-query';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { wagmiConfig, queryClient } from '@/lib/wagmi-config';
import { base, baseSepolia } from 'wagmi/chains';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '00000000000000000000000000000000';

// Initialize Web3Modal — must be called before the app renders (client-side only)
if (typeof window !== 'undefined') {
  createWeb3Modal({
    wagmiConfig,
    projectId,
    defaultChain: base,
    themeMode: 'dark',
    themeVariables: {
      '--w3m-color-mix': '#3b82f6',          // Blue accent matching B20 brand
      '--w3m-color-mix-strength': 20,
      '--w3m-accent': '#3b82f6',
      '--w3m-border-radius-master': '12px',
    },
    featuredWalletIds: [
      // MetaMask
      'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
      // Coinbase Wallet
      'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa',
      // Rainbow
      '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369',
      // Trust Wallet
      '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
    ],
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
