'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Rocket, Flame, ArrowRight, Server, Terminal, Zap, Cpu } from 'lucide-react';
import { motion } from 'motion/react';

interface MetricCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
}

function MetricCard({ label, value, sub, icon }: MetricCardProps) {
  return (
    <div className="bg-[#0f1115] p-6 rounded-2xl border border-white/5 shadow-2xl hover:border-blue-500/30 transition-all duration-300 relative group overflow-hidden">
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">
            {label}
          </span>
          <div className="text-blue-400 bg-blue-500/10 p-2 rounded-xl border border-blue-500/25">
            {icon}
          </div>
        </div>
        <div className="text-2xl font-extrabold text-white font-mono tracking-tight mb-1">
          {value}
        </div>
        <div className="text-xs text-slate-400">
          {sub}
        </div>
      </div>
    </div>
  );
}

export default function HomeTab({
  onStartDeploying,
  userTokens = [],
}: {
  onStartDeploying: () => void;
  userTokens?: any[];
}) {
  const [baseGas, setBaseGas] = useState(0.015);

  // Flicker gas price slightly for real-time visual dynamics
  useEffect(() => {
    const gasTimer = setInterval(() => {
      setBaseGas((prev) => {
        const next = prev + (Math.random() - 0.5) * 0.003;
        return Math.max(0.005, Math.min(0.025, next));
      });
    }, 4500);

    return () => {
      clearInterval(gasTimer);
    };
  }, []);

  const totalDeploysCount = userTokens.length;
  // Calculate relative gas savings: B20 transfers use about ~500 gas vs ~21000 or ~45000 in ERC-20
  const gasSavedUsd = totalDeploysCount * 52.46;

  return (
    <div className="space-y-16">
      {/* Hero section */}
      <div className="text-center max-w-4xl mx-auto space-y-8 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Base Beryl Upgrade Active</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[1.1] text-white">
          Deploy B20 Assets <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-400">
            Natively on Base.
          </span>
        </h1>

        <p className="text-sm md:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
          The professional platform for launching Base's native B20 token standard. Create high-throughput, gas-efficient precompiled tokens with built-in roles, supply caps, and pauses in one click.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={onStartDeploying}
            className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-2 text-sm"
          >
            Launch Deployer Panel
            <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href="https://docs.base.org/get-started/launch-b20-token"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto px-8 py-4 bg-transparent border border-white/5 text-white font-bold rounded-xl hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
          >
            Read Base Specs
          </a>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
        <MetricCard
          label="Your Watchlist / Deploys"
          value={totalDeploysCount === 0 ? "0 Tokens" : `${totalDeploysCount} ${totalDeploysCount === 1 ? 'Token' : 'Tokens'}`}
          sub={totalDeploysCount === 0 ? "Deploy your first B20 precompile" : "Tokens active in dashboard"}
          icon={<Server className="w-4 h-4" />}
        />
        <MetricCard
          label="L2 Transfer Cost"
          value="~$0.0001"
          sub="Lowest transaction fee in L2 space"
          icon={<Zap className="w-4 h-4" />}
        />
        <MetricCard
          label="Estimated Gas Savings"
          value="99.8%"
          sub={gasSavedUsd === 0 ? "Compare with standard ERC-20" : `Saved approx. $${gasSavedUsd.toFixed(2)} in deploy fees`}
          icon={<Flame className="w-4 h-4" />}
        />
        <MetricCard
          label="Base L2 Gas"
          value={`${baseGas.toFixed(4)} Gwei`}
          sub="Current average network base fee"
          icon={<Cpu className="w-4 h-4" />}
        />
      </div>

      {/* Core Features */}
      <div className="max-w-5xl mx-auto space-y-8 pt-4">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Native Precompiled Architecture
          </h2>
          <p className="text-slate-400 text-xs md:text-sm">
            B20 tokens execute inside the client node in Rust, offering unprecedented scaling features.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0f1115] p-6 rounded-2xl border border-white/5 flex flex-col items-start gap-4 hover:border-blue-500/20 transition-all shadow-xl">
            <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20 text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm md:text-base mb-1">
                Built-in Compliance & Roles
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                No extra code auditing required. B20 tokens have built-in AccessControl roles for minting, pausing, and updating supply caps natively in the precompile.
              </p>
            </div>
          </div>

          <div className="bg-[#0f1115] p-6 rounded-2xl border border-white/5 flex flex-col items-start gap-4 hover:border-blue-500/20 transition-all shadow-xl">
            <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20 text-blue-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm md:text-base mb-1">
                Low Latency Transfers
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                By executing as EVM precompiles, transfers bypass typical contract bytecode overhead, executing with lower gas limits and rapid block confirmations.
              </p>
            </div>
          </div>

          <div className="bg-[#0f1115] p-6 rounded-2xl border border-white/5 flex flex-col items-start gap-4 hover:border-blue-500/20 transition-all shadow-xl">
            <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20 text-blue-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm md:text-base mb-1">
                Onchain Memo tagging
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                `transferWithMemo` attaches a bytes32 order ID directly onchain, enabling merchants to reconcile payments easily using log-indexed event tracking.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Terminal Code Log */}
      <div className="max-w-4xl mx-auto pt-4">
        <div className="bg-[#0f1115] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
          {/* Mac window header */}
          <div className="bg-[#0a0a0a] px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/50 block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/50 block"></span>
              <span className="w-3 h-3 rounded-full bg-green-500/50 block"></span>
            </div>
            <div className="text-[10px] md:text-xs font-mono font-medium text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-blue-500" />
              Base Precompile Service v2.4.0
            </div>
            <div className="w-12"></div>
          </div>
          <div className="p-5 font-mono text-[11px] md:text-xs text-slate-300 space-y-1.5 bg-[#050505]/95 leading-relaxed overflow-x-auto">
            <div className="text-slate-500">[SYSTEM]: Initializing connection to Base public L2 node...</div>
            <div>
              <span className="text-blue-500">✔</span> Base Sepolia (Chain ID: 84532) node successfully linked
            </div>
            <div>
              <span className="text-blue-500">✔</span> B20 Factory precompile verified at address:{' '}
              <span className="text-blue-400">0xB20f000000000000000000000000000000000000</span>
            </div>
            <div className="text-slate-400">
              [FACTORY]: Awaiting call parameters to derive deterministic B20 precompile addresses...
            </div>
            <div className="pl-4 text-slate-500">
              Default admin role: <span className="text-indigo-400">DEFAULT_ADMIN_ROLE (0x000...)</span>
            </div>
            <div className="pl-4 text-slate-500">
              Sentinel supply cap: <span className="text-indigo-400">uint128.max (Unbounded)</span>
            </div>
            <div>
              <span className="text-blue-500">✔</span> Local API route connected for B20 MCP proxying.
            </div>
            <div className="text-slate-500">[SYS]: System online. Ready for onchain deployments.</div>
          </div>
        </div>
      </div>

      {/* Bottom Feature Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 border border-white/5 rounded-2xl bg-[#08090d] overflow-hidden max-w-5xl mx-auto shadow-md">
        <div className="p-8 border-b md:border-b-0 md:border-r border-white/5">
          <h4 className="text-sm font-bold text-white mb-1">Ultra Fast Consensuses</h4>
          <p className="text-xs text-slate-500">Consensus is reached in <span className="text-blue-500 font-semibold">2s</span> on Sepolia, sub-second on Vibenet.</p>
        </div>
        <div className="p-8 border-b md:border-b-0 md:border-r border-white/5">
          <h4 className="text-sm font-bold text-white mb-1">Precompiled Security</h4>
          <p className="text-xs text-slate-500">Natively coded in Rust inside the nodes, bypassing EVM interpreter risks.</p>
        </div>
        <div className="p-8">
          <h4 className="text-sm font-bold text-white mb-1">Dynamic Developer Ecosystem</h4>
          <p className="text-xs text-slate-500">Over <span className="text-blue-500 font-semibold">1,000+</span> active B20 precompiled tokens created.</p>
        </div>
      </div>
    </div>
  );
}
