'use client';

import dynamic from 'next/dynamic';
import { RefreshCw, Wallet } from 'lucide-react';

// Dynamically import the main app with ssr: false to prevent SSR errors (window, indexedDB, projectId) during next build
const MainApp = dynamic(() => import('./components/main-app'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#07080a] flex items-center justify-center p-4">
      <div className="bg-[#0f1115] border border-white/5 rounded-3xl w-full max-w-sm p-8 shadow-2xl text-center space-y-6">
        <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto text-blue-500 animate-pulse">
          <Wallet className="w-6 h-6 animate-bounce" />
        </div>
        <div className="space-y-2">
          <h3 className="text-slate-100 font-black text-lg">B20 Token Deployer</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Initializing secure Web3 sandbox...
          </p>
        </div>
        <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mx-auto opacity-75" />
      </div>
    </div>
  ),
});

export default function Page() {
  return <MainApp />;
}
