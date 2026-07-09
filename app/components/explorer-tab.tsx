'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  ArrowDownUp,
  Check,
  ShieldAlert,
  Info,
  Clock,
  ExternalLink,
  PlusCircle,
  HelpCircle,
  FileSpreadsheet,
  Sliders,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { fetchOnchainToken, fetchB20Memos, getChainById, B20_ABI } from '@/lib/b20';
import { parseUnits, encodeFunctionData, stringToHex, pad } from 'viem';

interface ExplorerTabProps {
  walletAddress: string | null;
  walletConnected: boolean;
  chainId: number;
  userTokens: any[];
  setUserTokens: React.Dispatch<React.SetStateAction<any[]>>;
  setWalletModalOpen: (open: boolean) => void;
  fetchBalance: () => Promise<void>;
}

export default function ExplorerTab({
  walletAddress,
  walletConnected,
  chainId,
  userTokens,
  setUserTokens,
  setWalletModalOpen,
  fetchBalance,
}: ExplorerTabProps) {
  // Query token
  const [queryAddress, setQueryAddress] = useState('');
  const [queriedToken, setQueriedToken] = useState<any | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Memos list
  const [memos, setMemos] = useState<any[]>([]);
  const [memosLoading, setMemosLoading] = useState(false);

  // Payment widget state
  const [payAmount, setPayAmount] = useState('');
  const [payRecipient, setPayRecipient] = useState('');
  const [payMemo, setPayMemo] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Gas calculator inputs
  const [gweiInput, setGweiInput] = useState('0.015');
  const [ethPriceInput, setEthPriceInput] = useState('3000');

  // Load B20 active network details
  const activeChain = getChainById(chainId);

  const handleQuery = async (addressToQuery?: string) => {
    const addr = addressToQuery || queryAddress;
    if (!addr.trim() || !addr.startsWith('0x') || addr.length !== 42) {
      setQueryError('Please enter a valid 42-character Ethereum contract address.');
      return;
    }

    setQueryLoading(true);
    setQueryError(null);
    setQueriedToken(null);
    setMemos([]);

    try {
      // 1. Fetch token details from the chain
      const tokenDetails = await fetchOnchainToken(
        addr as `0x${string}`,
        chainId,
        walletAddress ? (walletAddress as `0x${string}`) : undefined
      );

      setQueriedToken(tokenDetails);

      // 2. Fetch memo history
      setMemosLoading(true);
      const memoLogs = await fetchB20Memos(addr as `0x${string}`, chainId);
      setMemos(memoLogs);
    } catch (e: any) {
      console.error(e);
      setQueryError(e.message || 'Token lookup failed. Verify that you are connected to the correct network.');
    } finally {
      setQueryLoading(false);
      setMemosLoading(false);
    }
  };

  const handleAddToWatchlist = () => {
    if (!queriedToken) return;
    
    // Check if already in watchlist
    const exists = userTokens.some((t) => t.address.toLowerCase() === queriedToken.address.toLowerCase());
    if (exists) {
      alert('Token is already in your dashboard portfolio.');
      return;
    }

    const mapped = {
      name: queriedToken.name,
      symbol: queriedToken.symbol,
      totalSupply: queriedToken.totalSupply,
      decimals: queriedToken.decimals.toString(),
      address: queriedToken.address,
      mintable: queriedToken.isMinter,
      burnable: true,
      pausable: true,
      blacklistable: false,
      taxEnabled: false,
      buyTax: '0',
      sellTax: '0',
      taxAddress: '',
      antiWhale: false,
      maxTxPercent: '0',
      maxWalletPercent: '0',
      isPaused: queriedToken.paused,
      isRenounced: !queriedToken.isAdmin,
      custom: true
    };

    const nextWatchlist = [mapped, ...userTokens];
    setUserTokens(nextWatchlist);
    localStorage.setItem('deployed_b20_tokens', JSON.stringify(nextWatchlist));
    alert(`${queriedToken.symbol} has been added to your Portfolio watchlist.`);
  };

  // B20 Payment execution
  const executePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    setPaymentSuccess(null);

    if (!walletConnected || !walletAddress) {
      setWalletModalOpen(true);
      return;
    }

    if (!queriedToken) {
      setPaymentError('Query a B20 token contract address first.');
      return;
    }

    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      setPaymentError('Please enter a valid payment amount.');
      return;
    }

    if (!payRecipient.startsWith('0x') || payRecipient.length !== 42) {
      setPaymentError('Please enter a valid 42-character recipient wallet address.');
      return;
    }

    setPaymentLoading(true);

    try {
      // 1. Encode payment transaction natively
      const rawAmount = parseUnits(payAmount, queriedToken.decimals);
      const memoBytes32 = payMemo
        ? pad(stringToHex(payMemo, { size: 32 }), { dir: 'right' })
        : '0x0000000000000000000000000000000000000000000000000000000000000000';

      const payData = encodeFunctionData({
        abi: B20_ABI,
        functionName: 'transferWithMemo',
        args: [payRecipient as `0x${string}`, rawAmount, memoBytes32]
      });

      // 2. Submit transaction to connected wallet
      const txHash = await (window as any).ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: queriedToken.address,
          data: payData,
          value: '0x0',
        }]
      });

      // 3. Wait for confirmation receipt
      let receipt: any = null;
      while (!receipt) {
        await new Promise(r => setTimeout(r, 2000));
        receipt = await (window as any).ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash]
        }).catch(() => null);
      }

      if (receipt.status === '0x0') {
        throw new Error('Payment transaction reverted onchain.');
      }

      setPaymentSuccess(txHash);
      setPayAmount('');
      setPayMemo('');
      
      // Update balance & logs
      await fetchBalance();
      const memoLogs = await fetchB20Memos(queriedToken.address, chainId);
      setMemos(memoLogs);
    } catch (err: any) {
      console.error('Payment failed:', err);
      setPaymentError(err.message || 'Transaction was rejected or reverted.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Gas savings math
  const gwei = parseFloat(gweiInput) || 0.015;
  const ethPrice = parseFloat(ethPriceInput) || 3000;
  
  // Standard ERC-20 deploy uses ~1,500,000 gas
  const stdDeployGas = 1500000;
  const stdCostEth = (stdDeployGas * gwei) / 1e9;
  const stdCostUsd = stdCostEth * ethPrice;

  // B20 Precompile deploy uses ~20,000 gas
  const b20DeployGas = 20000;
  const b20CostEth = (b20DeployGas * gwei) / 1e9;
  const b20CostUsd = b20CostEth * ethPrice;

  const gasSavingsPct = ((stdDeployGas - b20DeployGas) / stdDeployGas * 100).toFixed(1);
  const totalSavedUsd = stdCostUsd - b20CostUsd;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center md:text-left max-w-2xl space-y-2 mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight flex items-center justify-center md:justify-start gap-2">
          <Search className="w-5 h-5 text-blue-400" />
          B20 Token Explorer & Payment Terminal
        </h2>
        <p className="text-slate-400 text-xs md:text-sm">
          Paste any B20 token precompile address to view stats, inspect onchain payment memos, trigger payments, or evaluate gas efficiencies.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Explorer Lookup & Payment Terminal */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Query Address Card */}
          <div className="bg-[#0f1115] p-5 rounded-3xl border border-white/5 shadow-2xl space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Inspect Contract Address</label>
              <div className="flex gap-2.5">
                <input
                  type="text"
                  placeholder="Paste B20 address (0xB200...)"
                  value={queryAddress}
                  onChange={(e) => { setQueryAddress(e.target.value); setQueryError(null); }}
                  className="flex-1 bg-[#07080a] border border-white/5 rounded-xl px-4 py-2.5 text-xs md:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => handleQuery()}
                  disabled={queryLoading || !queryAddress}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:bg-white/5 disabled:text-slate-600 flex items-center justify-center gap-1.5 shrink-0"
                >
                  {queryLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Query'}
                </button>
              </div>
              {queryError && <p className="text-xs text-rose-400 mt-1">{queryError}</p>}
            </div>

            {/* Quick shortcuts to preloaded user tokens */}
            {userTokens.length > 0 && (
              <div className="pt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">Watchlist Shortcuts:</span>
                {userTokens.map((t) => (
                  <button
                    key={t.address}
                    onClick={() => { setQueryAddress(t.address); handleQuery(t.address); }}
                    className="text-[10px] bg-[#07080a] hover:bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg text-blue-400 cursor-pointer font-mono font-bold"
                  >
                    {t.symbol}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Query Results View */}
          {queriedToken && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
              {/* Token Info Card */}
              <div className="bg-[#0f1115] p-5 rounded-3xl border border-white/5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                      {queriedToken.name}
                      <span className="text-xs bg-[#07080a] px-2 py-0.5 rounded text-blue-400 border border-white/5 font-mono font-bold uppercase tracking-wider">
                        {queriedToken.symbol}
                      </span>
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500 mt-1 block select-all break-all pr-4">
                      {queriedToken.address}
                    </span>
                  </div>
                  
                  <button
                    onClick={handleAddToWatchlist}
                    className="p-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg border border-blue-500/10 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 border-t border-white/5 pt-4 text-xs font-semibold">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Decimals</span>
                    <span className="text-slate-200 font-mono">{queriedToken.decimals}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Supply</span>
                    <span className="text-slate-200 font-mono">
                      {(parseFloat(queriedToken.totalSupply) / 10 ** queriedToken.decimals).toLocaleString()} {queriedToken.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Supply Cap limit</span>
                    <span className="text-slate-200 font-mono">
                      {queriedToken.supplyCap.length > 30 ? (
                        <span className="text-slate-500 italic">Unbounded</span>
                      ) : (
                        `${(parseFloat(queriedToken.supplyCap) / 10 ** queriedToken.decimals).toLocaleString()} ${queriedToken.symbol}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Transfer State</span>
                    <span className={queriedToken.paused ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {queriedToken.paused ? 'PAUSED' : 'ACTIVE'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Terminal Widget */}
              <div className="bg-[#0f1115] p-5 rounded-3xl border border-white/5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <ArrowDownUp className="w-4 h-4 text-blue-400" />
                  B20 Payment Terminal
                </h3>

                <form onSubmit={executePayment} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Amount</label>
                      <input
                        type="number"
                        placeholder="10.0"
                        required
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="w-full bg-[#07080a] border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Memo (Order ID)</label>
                      <input
                        type="text"
                        placeholder="order-42"
                        value={payMemo}
                        onChange={(e) => setPayMemo(e.target.value)}
                        className="w-full bg-[#07080a] border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Merchant Recipient Address</label>
                    <input
                      type="text"
                      placeholder="0xMerchant..."
                      required
                      value={payRecipient}
                      onChange={(e) => setPayRecipient(e.target.value)}
                      className="w-full bg-[#07080a] border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {paymentError && <p className="text-[10px] text-rose-400 font-semibold">{paymentError}</p>}
                  
                  {paymentSuccess && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] text-emerald-400 leading-normal flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" />
                      <div>
                        <span className="font-bold block mb-0.5">Payment Confirmed!</span>
                        Tx Hash: <span className="font-mono">{paymentSuccess.substring(0, 12)}...{paymentSuccess.substring(58)}</span>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={paymentLoading || !payRecipient || !payAmount}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-slate-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {paymentLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Submit Payment'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Memo Log Event Tracker */}
          {queriedToken && (
            <div className="bg-[#0f1115] p-5 rounded-3xl border border-white/5 shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                  Onchain Memo Event Log (Payments History)
                </h3>
                <button
                  onClick={() => handleQuery()}
                  disabled={memosLoading}
                  className="text-[10px] font-bold text-blue-400 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh logs
                </button>
              </div>

              <div className="overflow-x-auto border border-white/5 rounded-2xl bg-[#07080a]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02] text-slate-500 font-bold">
                      <th className="px-4 py-2.5">Block</th>
                      <th className="px-4 py-2.5">Payer (Caller)</th>
                      <th className="px-4 py-2.5">Attached Memo</th>
                      <th className="px-4 py-2.5 text-right">Receipt Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300 font-medium font-mono">
                    {memosLoading ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500">
                          <RefreshCw className="w-4 h-4 animate-spin mx-auto text-blue-500" />
                        </td>
                      </tr>
                    ) : memos.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500 font-sans">
                          No Memo events emitted for this token. Send a payment above to emit a log!
                        </td>
                      </tr>
                    ) : (
                      memos.map((memo, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.01]">
                          <td className="px-4 py-3 text-slate-500">{memo.blockNumber}</td>
                          <td className="px-4 py-3 text-slate-200 select-all">{memo.caller.substring(0, 6)}...{memo.caller.substring(38)}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/15 rounded text-[10px] font-sans font-bold">
                              {memo.memoText}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <a
                              href={`${activeChain.blockExplorers.default.url}/tx/${memo.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-slate-400 hover:text-blue-400 transition-colors"
                            >
                              {memo.txHash.substring(0, 6)}...{memo.txHash.substring(60)}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Gas Optimizer Calculator */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#0f1115] border border-white/5 rounded-3xl p-6 space-y-6 shadow-2xl relative">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">
                Interactive Gas Simulator
              </span>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-blue-400" />
                B20 Gas Savings Calculator
              </h3>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              {/* Inputs */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 flex justify-between">
                    <span>Base gas fee (Gwei)</span>
                    <span className="font-mono text-blue-400">{gwei} Gwei</span>
                  </label>
                  <input
                    type="range"
                    min="0.005"
                    max="0.100"
                    step="0.005"
                    value={gweiInput}
                    onChange={(e) => setGweiInput(e.target.value)}
                    className="w-full accent-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 flex justify-between">
                    <span>ETH Price (USD)</span>
                    <span className="font-mono text-blue-400">${ethPrice}</span>
                  </label>
                  <input
                    type="range"
                    min="1500"
                    max="5000"
                    step="100"
                    value={ethPriceInput}
                    onChange={(e) => setEthPriceInput(e.target.value)}
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>

              {/* Cost Comparison table */}
              <div className="bg-[#07080a] p-4 rounded-2xl border border-white/5 space-y-3.5 text-xs font-semibold">
                <div className="text-slate-500 uppercase tracking-widest text-[9px] font-mono font-bold">Estimated Cost Comparison</div>
                
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <div>
                    <span className="text-slate-300 block">Standard ERC-20 Deploy</span>
                    <span className="text-[10px] text-slate-500 font-mono">1.5M Gas limit</span>
                  </div>
                  <div className="text-right">
                    <span className="text-rose-400 font-mono block">${stdCostUsd.toFixed(2)}</span>
                    <span className="text-[9px] text-slate-500 font-mono">{stdCostEth.toFixed(5)} ETH</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-slate-300 block">B20 Precompile Deploy</span>
                    <span className="text-[10px] text-slate-500 font-mono">20,000 Gas limit</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-mono block">${b20CostUsd.toFixed(4)}</span>
                    <span className="text-[9px] text-slate-500 font-mono">{b20CostEth.toFixed(7)} ETH</span>
                  </div>
                </div>
              </div>

              {/* Total Saved Output */}
              <div className="bg-gradient-to-br from-blue-950/20 to-slate-900/40 p-4 rounded-2xl border border-blue-500/10 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Estimated Savings</span>
                <span className="text-2xl font-black text-white font-mono tracking-tight block">
                  ${totalSavedUsd.toFixed(2)} <span className="text-xs font-bold text-blue-400">({gasSavingsPct}%)</span>
                </span>
                <p className="text-[9px] text-slate-400 leading-normal">
                  Precompiled functions run directly inside the blockchain nodes, bypassing interpreter logic overhead.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
