'use client';

import React, { useState, useEffect } from 'react';
import {
  Server,
  Cpu,
  Terminal,
  ArrowLeft,
  Copy,
  Check,
  CheckCircle,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';

export default function McpPage() {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState('http://localhost:3000/api/mcp');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setServerUrl(`${window.location.origin}/api/mcp`);
    }
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const addB20Cmd = `claude mcp add b20 --transport http ${serverUrl}`;
  const addBaseMcpCmd = `claude mcp add base-mcp --transport http https://mcp.base.org`;

  return (
    <div className="min-h-screen bg-[#07080a] text-slate-100 font-sans selection:bg-blue-500/30 overflow-x-hidden flex flex-col justify-between">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#07080a]/90 backdrop-blur-md border-b border-white/5 px-6 py-4 md:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Deployer
          </Link>
          <div className="flex items-center gap-2 select-none">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-extrabold text-xs">B</span>
            </div>
            <span className="font-extrabold text-sm tracking-tight text-white">
              DEPLOY<span className="text-blue-500">B20</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-4xl mx-auto px-6 py-12 flex-1 space-y-12">
        {/* Intro */}
        <div className="space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-semibold uppercase tracking-wider">
            <Server className="w-3.5 h-3.5" />
            Base MCP Server
          </span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Connect AI to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">B20 precompiles</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-2xl leading-relaxed">
            Configure Claude Code, Claude Desktop, or any MCP-compatible AI assistant to interact with B20 tokens on Base. Deploy tokens, mint supply, and trigger payments with memos using natural language.
          </p>

          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400 text-xs font-semibold max-w-2xl flex items-center gap-2 font-sans">
            <span className="text-base">⚠️</span>
            <span>Note: The local MCP server integration is currently under active development and is not functional yet. Configured endpoints will not resolve onchain operations.</span>
          </div>
          
          {/* Server URL Box */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#0d0f14] border border-white/5 p-4 rounded-2xl max-w-2xl">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Your Local Server Endpoint</span>
              <code className="text-xs text-slate-200 font-mono break-all">{serverUrl}</code>
            </div>
            <button
              onClick={() => handleCopy(serverUrl, 'server-url')}
              className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
            >
              {copiedText === 'server-url' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy URL
                </>
              )}
            </button>
          </div>
        </div>

        {/* What can it do? */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            Capabilities & Tools
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { title: 'Deploy B20 Token', desc: 'Deploy ASSET or STABLECOIN precompiles permissionlessly.' },
              { title: 'Mint Supply', desc: 'Issue circulating tokens directly to any address.' },
              { title: 'Send Payment with Memos', desc: 'Attach a bytes32 order ID/message onchain to transfers.' },
              { title: 'Grant MINT_ROLE', desc: 'Atomically assign minting capability to backup wallets.' },
              { title: 'Read Token Stats', desc: 'Query supply, caps, and role holders without wallet signatures.' },
              { title: 'Check Activation', desc: 'Check if B20 variant is active on Sepolia, Vibenet, or Mainnet.' },
            ].map((cap, i) => (
              <div key={i} className="p-5 bg-[#0d0f14] border border-white/5 rounded-2xl hover:border-blue-500/20 transition-all">
                <h3 className="font-bold text-slate-200 text-sm mb-1.5">{cap.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{cap.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Guide Steps */}
        <section className="space-y-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-400" />
            Claude Desktop / Claude Code Setup
          </h2>
          
          <div className="space-y-6 pl-4 border-l border-white/10">
            {/* Step 1 */}
            <div className="space-y-3 relative">
              <span className="absolute -left-7 top-0 w-6 h-6 rounded-full bg-blue-600 border border-[#07080a] flex items-center justify-center text-xs font-bold text-white shadow-lg">1</span>
              <div>
                <h3 className="font-bold text-slate-200 text-sm">Add B20 MCP Server</h3>
                <p className="text-xs text-slate-400 mt-1">Configure Claude to use this server endpoint for building transactions:</p>
              </div>
              <div className="relative group max-w-2xl">
                <pre className="bg-[#0b0c10] border border-white/5 p-4 rounded-xl text-xs text-blue-400 font-mono overflow-x-auto pr-16 select-all">
                  {addB20Cmd}
                </pre>
                <button
                  onClick={() => handleCopy(addB20Cmd, 'step1')}
                  className="absolute right-3 top-3 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedText === 'step1' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="space-y-3 relative">
              <span className="absolute -left-7 top-0 w-6 h-6 rounded-full bg-blue-600 border border-[#07080a] flex items-center justify-center text-xs font-bold text-white shadow-lg">2</span>
              <div>
                <h3 className="font-bold text-slate-200 text-sm">Add Base MCP Wallet</h3>
                <p className="text-xs text-slate-400 mt-1">Install the Base wallet connector so the assistant can sign and submit transactions from your wallet:</p>
              </div>
              <div className="relative group max-w-2xl">
                <pre className="bg-[#0b0c10] border border-white/5 p-4 rounded-xl text-xs text-blue-400 font-mono overflow-x-auto pr-16 select-all">
                  {addBaseMcpCmd}
                </pre>
                <button
                  onClick={() => handleCopy(addBaseMcpCmd, 'step2')}
                  className="absolute right-3 top-3 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedText === 'step2' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Step 3 */}
            <div className="space-y-4 relative">
              <span className="absolute -left-7 top-0 w-6 h-6 rounded-full bg-blue-600 border border-[#07080a] flex items-center justify-center text-xs font-bold text-white shadow-lg">3</span>
              <div>
                <h3 className="font-bold text-slate-200 text-sm">Start Deploying & Transacting</h3>
                <p className="text-xs text-slate-400 mt-1">Prompt Claude Code/Desktop using natural language commands:</p>
              </div>
              <div className="space-y-2.5 max-w-2xl">
                {[
                  'Deploy a B20 ASSET token called GameCoin (symbol GC, 18 decimals) on Base Sepolia. My wallet is 0xYourWallet...',
                  'Mint 5000 GC tokens to 0xRecipientAddress... on Base Sepolia.',
                  'Send 150 GC to 0xMerchantAddress... with memo "order-998" on Base Sepolia.',
                  'Read token info for 0xTokenAddress... on Base Sepolia.'
                ].map((promptText, i) => (
                  <div key={i} className="flex items-start gap-2 bg-[#0d0f14] border border-white/5 p-3.5 rounded-xl">
                    <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-300 font-medium font-mono leading-relaxed select-all">"{promptText}"</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tools Reference Table */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            Tools Reference
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0d0f14]">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400 font-bold">
                  <th className="px-5 py-3">Tool Name</th>
                  <th className="px-5 py-3">Arguments</th>
                  <th className="px-5 py-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300 font-medium">
                {[
                  {
                    name: 'b20_encode_deploy',
                    args: 'name, symbol, variant, decimals, initialAdmin, salt, grantMintRole, supplyCap',
                    desc: 'Generates the calldata for deploying an ASSET or STABLECOIN B20 token via the factory precompile.',
                  },
                  {
                    name: 'b20_encode_mint',
                    args: 'token, to, amount, chainId',
                    desc: 'Encodes the mint transaction payload. Requires the minter role.',
                  },
                  {
                    name: 'b20_encode_payment',
                    args: 'token, to, amount, memo, chainId',
                    desc: 'Generates the transferWithMemo calldata for payments with attached reference strings.',
                  },
                  {
                    name: 'b20_encode_grant_mint_role',
                    args: 'token, to, chainId',
                    desc: 'Encodes a DEFAULT_ADMIN_ROLE call to grant MINT_ROLE permission to a new address.',
                  },
                  {
                    name: 'b20_read_token',
                    args: 'token, chainId, checkMintRole',
                    desc: 'Queries name, symbol, decimals, supply, supplyCap, and role holding status onchain.',
                  },
                  {
                    name: 'b20_check_activation',
                    args: 'chainId',
                    desc: 'Checks if B20 ASSET and STABLECOIN precompiles are active on Base Mainnet, Sepolia, or Vibenet.',
                  },
                ].map((tool, i) => (
                  <tr key={i} className="hover:bg-white/[0.01]">
                    <td className="px-5 py-3.5 font-mono text-blue-400 font-bold">{tool.name}</td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono break-all">{tool.args}</td>
                    <td className="px-5 py-3.5 text-slate-400 leading-relaxed">{tool.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ section */}
        <section className="space-y-4 max-w-3xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-400" />
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-4">
            {[
              {
                q: 'How does transaction signing work with the B20 MCP?',
                a: 'The B20 MCP server acts as a calldata builder only. It takes your natural language intents (e.g. name, symbol, amount) and outputs transaction parameters (to, data, value). It never touches your private keys. The actual signing is handled by your wallet client (via Base MCP), keeping you in full control.',
              },
              {
                q: 'Can I use this server on multiple Base networks?',
                a: 'Yes, all tools take a chainId argument supporting Base Sepolia (84532), Base Vibenet (84538453), and Base Mainnet (8453). It connects dynamically to public RPC nodes.',
              },
            ].map((faq, i) => (
              <div key={i} className="p-5 bg-[#0d0f14]/50 border border-white/5 rounded-2xl">
                <h4 className="font-bold text-slate-200 text-sm mb-1">{faq.q}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-8 border-t border-white/5 w-full flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-semibold text-slate-600">
        <div>© {new Date().getFullYear()} DEPLOYB20 Portal. Built for Base L2.</div>
        <div className="flex gap-4">
          <Link href="/" className="hover:text-slate-400 transition-colors">Launch Dashboard</Link>
          <a href="https://docs.base.org" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">Base Docs</a>
        </div>
      </footer>
    </div>
  );
}
