'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Menu,
  X,
  Plus,
  BookOpen,
  Compass,
  Globe,
  Briefcase,
  ChevronRight,
  Copy,
  Check,
  Info,
  Shield,
  RefreshCw,
  Sliders,
  ExternalLink,
  Activity,
  Trash,
  AlertTriangle,
  Eye,
  Rocket,
  PlusCircle,
  TrendingUp,
  Home as HomeIcon,
  Clock,
  ArrowRightLeft,
  Search,
  ArrowDownUp,
  FileSpreadsheet,
  Cpu,
  Flame,
  Zap,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAccount, useDisconnect, useChainId, useSwitchChain, useWalletClient } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';

// Import our custom sub-components
import HomeTab from '@/app/components/home-tab';
import DocsTab from '@/app/components/docs-tab';
import { fetchOnchainToken, fetchB20Memos, getChainById, getPublicClient, B20_FACTORY_ADDRESS, B20_FACTORY_ABI, B20_ADMIN_ABI, B20_ABI, MINT_ROLE, DEVELOPER_FEE_RECEIVER, B20_DEPLOYER_CONTRACT_ADDRESSES, B20_DEPLOYER_ABI } from '@/lib/b20';
import { encodeAbiParameters, encodeFunctionData, parseUnits, stringToHex, pad } from 'viem';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface DeployedToken {
  name: string;
  symbol: string;
  totalSupply: string;
  decimals: string;
  address: string;
  mintable: boolean;
  burnable: boolean;
  pausable: boolean;
  blacklistable: boolean;
  taxEnabled: boolean;
  buyTax: string;
  sellTax: string;
  taxAddress: string;
  antiWhale: boolean;
  maxTxPercent: string;
  maxWalletPercent: string;
  isPaused?: boolean;
  isRenounced?: boolean;
  custom?: boolean;
  chainId?: number;
}

const SUPPORTED_NETWORKS = [
  { id: 84532, name: 'Base Sepolia', symbol: 'ETH', isTestnet: true, explorer: 'https://sepolia.basescan.org' },
  { id: 84538453, name: 'Base Vibenet', symbol: 'ETH', isTestnet: true, explorer: 'https://explorer.vibes.base.org' },
  { id: 8453, name: 'Base Mainnet', symbol: 'ETH', isTestnet: false, explorer: 'https://basescan.org' }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<'home' | 'workspace' | 'portfolio' | 'docs'>('home');
  const [workspaceTab, setWorkspaceTab] = useState<'deploy' | 'mint' | 'payment'>('deploy');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // --- Wagmi / WalletConnect hooks ---
  const { address: wagmiAddress, isConnected: wagmiConnected, chain: wagmiChain, connector } = useAccount();
  const wagmiChainId = useChainId();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const { open: openWeb3Modal } = useWeb3Modal();

  // Map wagmi state to the names the rest of the file already uses
  const walletConnected = wagmiConnected;
  const walletAddress = wagmiAddress ?? null;
  const chainId = wagmiChainId;

  // Kept for legacy compat (some click handlers still reference these)
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  // Wallet balance (still fetched manually — wagmi balance hook needs extra setup)
  const [walletBalance, setWalletBalance] = useState('0.0000');

  // Deployer contract address derived from active chain
  const B20_DEPLOYER_CONTRACT_ADDRESS = B20_DEPLOYER_CONTRACT_ADDRESSES[chainId] || '';

  // Deployer Form Configuration
  const [variant, setVariant] = useState<'ASSET' | 'STABLECOIN'>('ASSET');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [decimals, setDecimals] = useState('18');
  const [currency, setCurrency] = useState('USD');
  const [grantSelfMintRole, setGrantSelfMintRole] = useState(true);
  const [hasSupplyCap, setHasSupplyCap] = useState(false);
  const [supplyCap, setSupplyCap] = useState('100000000');

  // Deployment Status State
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0); // 0 = idle, 1 = encoding, 2 = sending, 3 = confirming, 4 = complete
  const [deployedTokenResult, setDeployedTokenResult] = useState<DeployedToken | null>(null);
  const [deployTxHash, setDeployTxHash] = useState('');

  // Watchlist Portfolio
  const [userTokens, setUserTokens] = useState<DeployedToken[]>([]);
  const [globalTokens, setGlobalTokens] = useState<DeployedToken[]>([]);
  const [importAddr, setImportAddr] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState('');

  // ----------------------------------------------------
  // Mint Tab States
  const [mintQueryAddr, setMintQueryAddr] = useState('');
  const [mintTokenDetails, setMintTokenDetails] = useState<any | null>(null);
  const [mintQueryLoading, setMintQueryLoading] = useState(false);
  const [mintQueryError, setMintQueryError] = useState<string | null>(null);
  const [mintAmount, setMintAmount] = useState('');
  const [mintRecipient, setMintRecipient] = useState('');
  const [mintTxLoading, setMintTxLoading] = useState(false);
  const [mintTxSuccess, setMintTxSuccess] = useState<string | null>(null);
  const [mintTxError, setMintTxError] = useState<string | null>(null);

  // Batch Minting / Airdrop States
  const [isBatchMint, setIsBatchMint] = useState(false);
  const [batchRecipientList, setBatchRecipientList] = useState('');
  const [batchMintLoading, setBatchMintLoading] = useState(false);
  const [batchMintSuccess, setBatchMintSuccess] = useState<string | null>(null);
  const [batchMintError, setBatchMintError] = useState<string | null>(null);
  const [batchMintProgress, setBatchMintProgress] = useState('');
  const [batchRecipientsCount, setBatchRecipientsCount] = useState(0);
  const [batchTotalTokens, setBatchTotalTokens] = useState('0');

  // ----------------------------------------------------
  // Payment Tab States
  const [payQueryAddr, setPayQueryAddr] = useState('');
  const [payTokenDetails, setPayTokenDetails] = useState<any | null>(null);
  const [payQueryLoading, setPayQueryLoading] = useState(false);
  const [payQueryError, setPayQueryError] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payRecipient, setPayRecipient] = useState('');
  const [payMemo, setPayMemo] = useState('');
  const [payTxLoading, setPayTxLoading] = useState(false);
  const [payTxSuccess, setPayTxSuccess] = useState<string | null>(null);
  const [payTxError, setPayTxError] = useState<string | null>(null);
  const [payMemosList, setPayMemosList] = useState<any[]>([]);
  const [payMemosLoading, setPayMemosLoading] = useState(false);

  // ----------------------------------------------------
  // B20Deployer Admin Tab States
  const [adminOwner, setAdminOwner] = useState('');
  const [adminDeployFee, setAdminDeployFee] = useState('0');
  const [adminPendingOwner, setAdminPendingOwner] = useState('');
  const [adminContractBalance, setAdminContractBalance] = useState('0');
  const [adminDetailsLoading, setAdminDetailsLoading] = useState(false);

  // Inputs
  const [inputNewFee, setInputNewFee] = useState('');
  const [inputWithdrawTo, setInputWithdrawTo] = useState('');
  const [inputWithdrawAmount, setInputWithdrawAmount] = useState('');
  const [inputNewOwner, setInputNewOwner] = useState('');

  // Operations Loading/Success/Error
  const [adminOpLoading, setAdminOpLoading] = useState(false);
  const [adminOpSuccess, setAdminOpSuccess] = useState<string | null>(null);
  const [adminOpError, setAdminOpError] = useState<string | null>(null);

  // Tab state persistence (saves and restores tabs on refresh/navigation)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedActive = localStorage.getItem('b20_active_tab');
      if (savedActive) setActiveTab(savedActive as any);
      const savedWorkspace = localStorage.getItem('b20_workspace_tab');
      if (savedWorkspace) setWorkspaceTab(savedWorkspace as any);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('b20_active_tab', activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('b20_workspace_tab', workspaceTab);
    }
  }, [workspaceTab]);

  // Load global tokens from database on mount (falls back to localStorage)
  useEffect(() => {
    const loadGlobal = async () => {
      if (typeof window === 'undefined') return;
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('b20_tokens')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) throw error;
          if (data) {
            const mapped: DeployedToken[] = data.map((t: any) => ({
              name: t.name,
              symbol: t.symbol,
              totalSupply: t.total_supply,
              decimals: t.decimals,
              address: t.address,
              mintable: t.mintable,
              burnable: t.burnable,
              pausable: t.pausable,
              isPaused: t.is_paused,
              isRenounced: t.is_renounced,
              blacklistable: false,
              taxEnabled: false,
              buyTax: '0',
              sellTax: '0',
              taxAddress: '',
              antiWhale: false,
              maxTxPercent: '0',
              maxWalletPercent: '0',
              custom: true,
              chainId: t.chain_id || 8453 // Default to Base Mainnet
            }));
            setGlobalTokens(mapped);
          }
        } catch (e) {
          console.error('Error loading global tokens from Supabase:', e);
        }
      } else {
        const savedGlobal = localStorage.getItem('global_b20_tokens');
        if (savedGlobal) {
          try {
            setGlobalTokens(JSON.parse(savedGlobal));
          } catch (e) {
            console.error(e);
          }
        }
      }
    };
    loadGlobal();
  }, []);

  // Load wallet-specific watchlist when wallet address changes (falls back to localStorage)
  useEffect(() => {
    const loadWatchlist = async () => {
      if (typeof window === 'undefined') return;
      if (!walletAddress || !walletConnected) {
        setUserTokens([]);
        return;
      }

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('b20_watchlist')
            .select(`
              token_address,
              b20_tokens (
                address, name, symbol, total_supply, decimals, mintable, burnable, pausable, is_paused, is_renounced, chain_id
              )
            `)
            .eq('wallet_address', walletAddress.toLowerCase());
          if (error) throw error;
          if (data) {
            const mapped: DeployedToken[] = data
              .filter((row: any) => row.b20_tokens !== null)
              .map((row: any) => {
                const t = row.b20_tokens;
                return {
                  name: t.name,
                  symbol: t.symbol,
                  totalSupply: t.total_supply,
                  decimals: t.decimals,
                  address: t.address,
                  mintable: t.mintable,
                  burnable: t.burnable,
                  pausable: t.pausable,
                  isPaused: t.is_paused,
                  isRenounced: t.is_renounced,
                  blacklistable: false,
                  taxEnabled: false,
                  buyTax: '0',
                  sellTax: '0',
                  taxAddress: '',
                  antiWhale: false,
                  maxTxPercent: '0',
                  maxWalletPercent: '0',
                  custom: true,
                  chainId: t.chain_id || 8453 // Default to Base Mainnet
                };
              });
            setUserTokens(mapped);
          }
        } catch (e) {
          console.error('Error loading watchlist from Supabase:', e);
        }
      } else {
        const savedUser = localStorage.getItem(`deployed_b20_tokens_${walletAddress.toLowerCase()}`);
        if (savedUser) {
          try {
            setUserTokens(JSON.parse(savedUser));
          } catch (e) {
            console.error(e);
            setUserTokens([]);
          }
        } else {
          setUserTokens([]);
        }
      }
    };
    loadWatchlist();
  }, [walletAddress, walletConnected, chainId]);

  // Real-time batch mint parser & preview calculator
  useEffect(() => {
    if (!batchRecipientList) {
      setBatchRecipientsCount(0);
      setBatchTotalTokens('0');
      return;
    }
    const lines = batchRecipientList.split('\n');
    let count = 0;
    let total = 0n;
    const decimalsVal = mintTokenDetails ? mintTokenDetails.decimals : 18;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(/[\s,;:|]+/);
      if (parts.length >= 2) {
        const address = parts[0].trim();
        if (address.startsWith('0x') && address.length === 42) {
          try {
            const rawAmount = parseUnits(parts[1].trim(), decimalsVal);
            if (rawAmount > 0n) {
              count++;
              total += rawAmount;
            }
          } catch (e) { }
        }
      }
    }
    setBatchRecipientsCount(count);
    setBatchTotalTokens((Number(total) / 10 ** decimalsVal).toString());
  }, [batchRecipientList, mintTokenDetails]);

  // Fetch balance when wallet or chain changes
  useEffect(() => {
    if (walletAddress) {
      fetchBalance(walletAddress, chainId);
    } else {
      setWalletBalance('0.0000');
    }
  }, [walletAddress, chainId]);

  const getWalletProvider = async () => {
    if (connector) {
      const provider = await connector.getProvider();
      if (provider) return provider;
    }
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      return (window as any).ethereum;
    }
    throw new Error('No wallet provider found. Please connect your wallet first.');
  };

  const fetchBalance = async (address: string, activeChainId: number) => {
    try {
      const client = getPublicClient(activeChainId);
      const balance = await client.getBalance({ address: address as `0x${string}` });
      const balStr = (Number(balance) / 1e18).toFixed(4);
      setWalletBalance(balStr);
    } catch (e) {
      console.error('Error fetching balance:', e);
    }
  };

  const fetchRevertReason = async (txHash: string): Promise<string> => {
    try {
      const client = getPublicClient(chainId);
      const tx = await client.getTransaction({ hash: txHash as `0x${string}` });
      if (!tx) return '';

      try {
        await client.call({
          account: tx.from,
          to: tx.to ?? undefined,
          data: tx.input,
          value: tx.value,
          gas: tx.gas,
          gasPrice: tx.gasPrice,
          blockNumber: tx.blockNumber ? tx.blockNumber - 1n : undefined
        });
      } catch (callErr: any) {
        const errorData = (callErr.data || callErr.message || '').toString();
        if (errorData.includes('0xe2517d3f')) {
          return 'AccessControlUnauthorizedAccount: The executing wallet does not have the MINT_ROLE. If you are using a MetaMask Smart Wallet, please check that the active Smart Account selected in your MetaMask extension is the one that has the MINT_ROLE (e.g. 0x546c8c...).';
        }
        return errorData || 'Transaction reverted.';
      }
    } catch (err) {
      console.warn('Failed to fetch revert reason:', err);
    }
    return '';
  };

  const connectWallet = async () => {
    // Opens Web3Modal — handles desktop (MetaMask extension) + mobile (WalletConnect QR)
    openWeb3Modal();
  };

  const handleDisconnectWallet = () => {
    wagmiDisconnect();
    setWalletBalance('0.0000');
    localStorage.removeItem('wallet_connected_previously');
  };

  const switchNetwork = async (targetChainId: number) => {
    try {
      // Use wagmi's switchChain — works for both MetaMask and WalletConnect
      switchChain({ chainId: targetChainId });
    } catch (switchError: any) {
      console.error('Failed to switch network:', switchError);
    }
  };

  // Deploy B20 Token Action
  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!walletConnected || !walletAddress) {
      openWeb3Modal();
      return;
    }

    const activeAddress = walletAddress;

    if (!name.trim()) return alert('Please enter a Token Name');
    if (!symbol.trim()) return alert('Please enter a Token Symbol');

    const isSupported = SUPPORTED_NETWORKS.some(n => n.id === chainId);
    if (!isSupported) {
      alert('Unsupported network. Please switch to Base Sepolia or Base Vibenet first.');
      return;
    }

    setIsDeploying(true);
    setDeployStep(1);

    try {
      const provider = await getWalletProvider();
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const salt = '0x' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      const capVal = hasSupplyCap ? supplyCap : '340282366920938463463374607431768211455';

      const adminAddr = activeAddress as `0x${string}`;
      const decimalsVal = variant === 'ASSET' ? parseInt(decimals) : 6;

      // Encode params as abi.encode(B20AssetCreateParams{...}) — Solidity wraps a dynamic struct
      // in a single outer tuple offset (0x0000...0020 prefix), producing 320 bytes total.
      // This matches B20FactoryLib.encodeAssetCreateParams / encodeStablecoinCreateParams exactly.
      // Using a flat 5-field encoding (288 bytes) fails with "buffer overrun" or "type check failed".
      const params = variant === 'ASSET'
        ? encodeAbiParameters(
          [{
            type: 'tuple', components: [
              { name: 'version', type: 'uint8' },
              { name: 'name', type: 'string' },
              { name: 'symbol', type: 'string' },
              { name: 'initialAdmin', type: 'address' },
              { name: 'decimals', type: 'uint8' }
            ]
          }],
          [{ version: 1, name, symbol: symbol.toUpperCase(), initialAdmin: adminAddr, decimals: decimalsVal }]
        ) as `0x${string}`
        : encodeAbiParameters(
          [{
            type: 'tuple', components: [
              { name: 'version', type: 'uint8' },
              { name: 'name', type: 'string' },
              { name: 'symbol', type: 'string' },
              { name: 'initialAdmin', type: 'address' },
              { name: 'currency', type: 'string' }
            ]
          }],
          [{ version: 1, name, symbol: symbol.toUpperCase(), initialAdmin: adminAddr, currency: currency.toUpperCase() }]
        ) as `0x${string}`;

      // Build initialization calls
      const initCalls: `0x${string}`[] = [];
      if (grantSelfMintRole) {
        initCalls.push(encodeFunctionData({
          abi: B20_ADMIN_ABI,
          functionName: 'grantRole',
          args: [MINT_ROLE, adminAddr]
        }));
      }
      if (hasSupplyCap) {
        const parsedCap = parseUnits(supplyCap, decimalsVal);
        initCalls.push(encodeFunctionData({
          abi: B20_ADMIN_ABI,
          functionName: 'updateSupplyCap',
          args: [parsedCap]
        }));
      }

      let txHash = '';

      // Check if wrapper contract address is configured for Option B (Single transaction deployment)
      if (B20_DEPLOYER_CONTRACT_ADDRESS && B20_DEPLOYER_CONTRACT_ADDRESS.startsWith('0x')) {
        // Encode deployB20Token call on the wrapper contract
        const wrapperData = encodeFunctionData({
          abi: B20_DEPLOYER_ABI,
          functionName: 'deployB20Token',
          args: [
            variant === 'ASSET' ? 0 : 1,
            salt as `0x${string}`,
            params,
            initCalls
          ]
        });

        // 2 & 3. Combined Wrapper transaction
        setDeployStep(3); // skip step 2 as single transaction
        const feeVal = '0x' + BigInt(40000000000000).toString(16); // 0.00004 ETH in wei

        txHash = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: walletAddress,
            to: B20_DEPLOYER_CONTRACT_ADDRESS,
            data: wrapperData,
            value: feeVal,
            gas: '0x3D0900', // 4,000,000 — covers createB20 + initCalls
          }]
        });

        setDeployTxHash(txHash);
      } else {
        // Option A Fallback: Direct B20 precompile Factory calls with separate fee payment

        // Encode the createB20 factory call
        const deployData = encodeFunctionData({
          abi: B20_FACTORY_ABI,
          functionName: 'createB20',
          args: [variant === 'ASSET' ? 0 : 1, salt as `0x${string}`, params, initCalls]
        });

        // 2. Request Developer Fee signature (0.00004 ETH)
        setDeployStep(2);
        const feeVal = '0x' + BigInt(40000000000000).toString(16); // 0.00004 ETH in wei

        const feeTxHash = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: walletAddress,
            to: DEVELOPER_FEE_RECEIVER,
            value: feeVal,
          }]
        });

        // Wait for fee transaction block confirmation
        let feeReceipt: any = null;
        while (!feeReceipt) {
          await new Promise(r => setTimeout(r, 2000));
          feeReceipt = await provider.request({
            method: 'eth_getTransactionReceipt',
            params: [feeTxHash]
          }).catch(() => null);
        }

        if (feeReceipt.status === '0x0') {
          throw new Error('Developer fee transaction failed or reverted.');
        }

        // 3. Request B20 Token Deployment signature
        setDeployStep(3);

        txHash = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: walletAddress,
            to: B20_FACTORY_ADDRESS,
            data: deployData,
            value: '0x0',
          }]
        });

        setDeployTxHash(txHash);
      }

      // 4. Confirming block and address extraction
      setDeployStep(4);
      let receipt: any = null;
      while (!receipt) {
        await new Promise(r => setTimeout(r, 2000));
        receipt = await provider.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash]
        }).catch(() => null);
      }

      if (receipt.status === '0x0') {
        throw new Error('Deployment transaction reverted onchain.');
      }

      let tokenAddress = '';

      // The B20Factory emits: B20Created(address indexed token, uint8 indexed variant, ...)
      const B20_CREATED_TOPIC = '0xfd9bf2730513a1709722ff379a0844dfd8f997d600693c2bcc659e188bbdba0d';
      
      // B20Deployer emits: TokenDeployed(address indexed deployer, address indexed token, uint256 feePaid)
      const TOKEN_DEPLOYED_TOPIC = '0xf1d58912d8d6d39cd9fee0f074ee57836907d09dddb0ce7706b7c7a0ddc15d50';
      
      const FACTORY_ADDR = B20_FACTORY_ADDRESS.toLowerCase();
      const DEPLOYER_ADDR = B20_DEPLOYER_CONTRACT_ADDRESS ? B20_DEPLOYER_CONTRACT_ADDRESS.toLowerCase() : '';

      if (receipt.logs) {
        for (const log of receipt.logs) {
          // 1. Check for TokenDeployed event from our custom deployer contract (Option B wrapper path)
          if (
            log.topics && log.topics[0] && log.topics[0].toLowerCase() === TOKEN_DEPLOYED_TOPIC &&
            log.topics[2]
          ) {
            tokenAddress = '0x' + log.topics[2].slice(-40);
            break;
          }
          // 2. Check for B20Created event from the precompile factory (Option A direct path)
          if (
            log.address && log.address.toLowerCase() === FACTORY_ADDR &&
            log.topics && log.topics[0] && log.topics[0].toLowerCase() === B20_CREATED_TOPIC &&
            log.topics[1]
          ) {
            tokenAddress = '0x' + log.topics[1].slice(-40);
            break;
          }
        }
      }

      // Fallback: look for any log where the emitter address starts with 0xb200 (direct precompile log)
      if (!tokenAddress && receipt.logs) {
        const matchingLog = receipt.logs.find(
          (l: any) => l.address && l.address.toLowerCase().startsWith('0xb200')
        );
        if (matchingLog) tokenAddress = matchingLog.address;
      }

      if (!tokenAddress) {
        throw new Error('Transaction succeeded, but no B20 token precompile address (0xB200...) was found in receipt logs.');
      }

      // Wait 2.5s for block state propagation to prevent RPC node replication lag errors
      await new Promise(r => setTimeout(r, 2500));

      let tokenInfo;
      let retries = 5;
      while (retries > 0) {
        try {
          tokenInfo = await fetchOnchainToken(tokenAddress as `0x${string}`, chainId, walletAddress as `0x${string}`);
          break;
        } catch (err: any) {
          retries--;
          if (retries === 0) break; // fall through to form-data fallback below
          await new Promise(r => setTimeout(r, 3000));
        }
      }

      // If onchain read still failed after retries, build from known form data (RPC replica lag fallback)
      const fallbackDecimals = variant === 'ASSET' ? parseInt(decimals) : 6;
      const fallbackToken = !tokenInfo ? {
        name,
        symbol: symbol.toUpperCase(),
        totalSupply: '0',
        decimals: fallbackDecimals,
        isMinter: grantSelfMintRole,
        isAdmin: true,
        paused: false,
        address: tokenAddress,
      } : null;


      const src = tokenInfo ?? fallbackToken!;
      const newToken: DeployedToken = {
        name: src.name,
        symbol: src.symbol,
        totalSupply: src.totalSupply,
        decimals: src.decimals.toString(),
        address: tokenAddress,
        mintable: src.isMinter,
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
        isPaused: src.paused,
        isRenounced: !src.isAdmin,
        custom: true,
        chainId: chainId
      };

      setDeployedTokenResult(newToken);
      if (fallbackToken) {
        // Soft note — not an error. Supply shows 0 until re-inspected from workspace.
        console.info(`[B20] RPC lag: token details saved from form data. Re-inspect ${tokenAddress} later for live supply.`);
      }

      const nextTokens = [newToken, ...userTokens];
      setUserTokens(nextTokens);
      if (activeAddress) {
        localStorage.setItem(`deployed_b20_tokens_${activeAddress.toLowerCase()}`, JSON.stringify(nextTokens));

        if (isSupabaseConfigured) {
          (async () => {
            try {
              await supabase.from('b20_tokens').upsert({
                address: newToken.address.toLowerCase(),
                name: newToken.name,
                symbol: newToken.symbol,
                total_supply: newToken.totalSupply,
                decimals: newToken.decimals,
                mintable: newToken.mintable,
                burnable: newToken.burnable,
                pausable: newToken.pausable,
                is_paused: newToken.isPaused || false,
                is_renounced: newToken.isRenounced || false,
                chain_id: chainId
              });

              await supabase.from('b20_watchlist').upsert({
                wallet_address: activeAddress.toLowerCase(),
                token_address: newToken.address.toLowerCase()
              });
            } catch (dbErr) {
              console.error('Failed to sync deployed token to Supabase:', dbErr);
            }
          })();
        }
      }

      // Save to global tokens list
      let nextGlobal = [...globalTokens];
      if (!nextGlobal.some(t => t.address.toLowerCase() === newToken.address.toLowerCase())) {
        nextGlobal = [newToken, ...nextGlobal];
        setGlobalTokens(nextGlobal);
        localStorage.setItem('global_b20_tokens', JSON.stringify(nextGlobal));
      }

      await fetchBalance(activeAddress as string, chainId);

    } catch (err: any) {
      console.error('Deployment error:', err);
      alert(err.message || 'Failed to deploy contract');
      setIsDeploying(false);
      setDeployStep(0);
    }
  };

  const handleResetDeployerModal = () => {
    setIsDeploying(false);
    setDeployStep(0);
    setDeployedTokenResult(null);
    setDeployTxHash('');
    setActiveTab('portfolio');
  };

  // ----------------------------------------------------
  // Mint Tab Functions
  const handleMintSearch = async (e?: React.FormEvent, overrideAddr?: string, isBackgroundRefresh?: boolean) => {
    if (e) e.preventDefault();
    const searchAddr = overrideAddr || mintQueryAddr;
    if (!searchAddr.trim() || !searchAddr.startsWith('0x') || searchAddr.length !== 42) {
      setMintQueryError('Please enter a valid 42-character contract address.');
      return;
    }

    setMintQueryLoading(true);
    setMintQueryError(null);
    // Only clear token details and success/error when this is a fresh user-initiated search
    if (!isBackgroundRefresh) {
      setMintTokenDetails(null);
      setMintTxSuccess(null);
      setMintTxError(null);
    }

    try {
      const details = await fetchOnchainToken(
        searchAddr as `0x${string}`,
        chainId,
        walletAddress ? (walletAddress as `0x${string}`) : undefined
      );
      setMintTokenDetails(details);
      if (walletAddress && !isBackgroundRefresh) {
        setMintRecipient(walletAddress);
      }
    } catch (err: any) {
      if (isBackgroundRefresh) {
        // Silently ignore — the mint succeeded; this is just a cosmetic supply refresh
        console.warn('[B20] Post-mint re-inspection failed (RPC lag), ignoring:', err.message);
      } else {
        console.error(err);
        setMintQueryError(err.message || 'Inspection failed. Ensure your wallet is on the correct network.');
      }
    } finally {
      setMintQueryLoading(false);
    }
  };

  const executeMint = async (e: React.FormEvent) => {
    e.preventDefault();
    setMintTxError(null);
    setMintTxSuccess(null);

    if (!walletConnected || !walletAddress) {
      openWeb3Modal();
      return;
    }

    const activeAddress = walletAddress;

    if (!mintTokenDetails) return;

    const amt = parseFloat(mintAmount);
    if (isNaN(amt) || amt <= 0) {
      setMintTxError('Please enter a valid amount to mint.');
      return;
    }

    if (!mintRecipient.startsWith('0x') || mintRecipient.length !== 42) {
      setMintTxError('Please enter a valid 42-character recipient address.');
      return;
    }

    setMintTxLoading(true);

    try {
      const provider = await getWalletProvider();
      const rawAmount = parseUnits(mintAmount, mintTokenDetails.decimals);
      const mintData = encodeFunctionData({
        abi: B20_ADMIN_ABI,
        functionName: 'mint',
        args: [mintRecipient as `0x${string}`, rawAmount]
      });

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: activeAddress,
          to: mintTokenDetails.address,
          data: mintData,
          value: '0x0',
          gas: '0x30D40', // 200,000 — B20 precompile needs explicit gas (eth_call sim fails)
        }]
      });

      let receipt: any = null;
      while (!receipt) {
        await new Promise(r => setTimeout(r, 2000));
        receipt = await provider.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash]
        }).catch(() => null);
      }

      if (receipt.status === '0x0') {
        const revertReason = await fetchRevertReason(txHash);
        throw new Error(revertReason || 'Mint transaction reverted onchain.');
      }

      setMintTxSuccess(txHash);
      setMintAmount('');

      await fetchBalance(activeAddress, chainId);
      await handleMintSearch(undefined, mintTokenDetails.address, true);
    } catch (err: any) {
      console.error(err);
      setMintTxError(err.message || 'Transaction rejected or reverted.');
    } finally {
      setMintTxLoading(false);
    }
  };

  const executeBatchMint = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchMintError(null);
    setBatchMintSuccess(null);
    setBatchMintProgress('');

    if (!walletConnected || !walletAddress) {
      openWeb3Modal();
      return;
    }

    const activeAddress = walletAddress;

    if (!mintTokenDetails) return;

    // Parse list
    const lines = batchRecipientList.split('\n');
    const recipients: { to: `0x${string}`; amount: string }[] = [];
    const parseErrors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(/[\s,;:|]+/);
      if (parts.length < 2) {
        parseErrors.push(`Line ${i + 1}: Invalid format. Expected 'address amount'.`);
        continue;
      }

      const address = parts[0].trim();
      const amountStr = parts[1].trim();

      if (!address.startsWith('0x') || address.length !== 42) {
        parseErrors.push(`Line ${i + 1}: Invalid recipient address.`);
        continue;
      }

      const amount = parseFloat(amountStr);
      if (isNaN(amount) || amount <= 0) {
        parseErrors.push(`Line ${i + 1}: Invalid mint amount.`);
        continue;
      }

      recipients.push({ to: address as `0x${string}`, amount: amountStr });
    }

    if (parseErrors.length > 0) {
      setBatchMintError(parseErrors.join('\n'));
      return;
    }

    if (recipients.length === 0) {
      setBatchMintError('Please add at least one recipient.');
      return;
    }

    setBatchMintLoading(true);

    try {
      const provider = await getWalletProvider();
      const decimalsVal = mintTokenDetails.decimals;

      // Build the calls array
      const calls = recipients.map(r => {
        const rawAmount = parseUnits(r.amount, decimalsVal);
        const data = encodeFunctionData({
          abi: B20_ADMIN_ABI,
          functionName: 'mint',
          args: [r.to, rawAmount]
        });
        return {
          to: mintTokenDetails.address as `0x${string}`,
          data,
          value: '0x0'
        };
      });

      let txHash = '';

      // Try wallet_sendCalls first (for smart accounts supporting batches)
      try {
        setBatchMintProgress('Attempting atomic batch call (wallet_sendCalls)...');
        const hexChainId = '0x' + chainId.toString(16);

        const response = await provider.request({
          method: 'wallet_sendCalls',
          params: [{
            version: '1.0',
            chainId: hexChainId,
            from: activeAddress,
            calls: calls.map(c => ({
              to: c.to,
              data: c.data,
              value: c.value
            }))
          }]
        });

        if (response && (typeof response === 'string' || response.calls || response.hash)) {
          txHash = typeof response === 'string' ? response : (response.hash || response.calls?.[0]?.transactionHash || 'batch_success');
          setBatchMintProgress('Batch sent! Waiting for block confirmation...');
        }
      } catch (batchErr: any) {
        console.warn('wallet_sendCalls not supported, falling back to sequential eth_sendTransactions...', batchErr);

        // Sequential fallback
        setBatchMintProgress(`Sequential fallback: sending ${calls.length} transactions...`);
        for (let i = 0; i < calls.length; i++) {
          setBatchMintProgress(`Signing mint ${i + 1} of ${calls.length} to ${recipients[i].to.substring(0, 8)}...`);
          const singleHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [{
              from: activeAddress,
              to: calls[i].to,
              data: calls[i].data,
              value: '0x0',
              gas: '0x30D40', // 200,000 — B20 precompile needs explicit gas
            }]
          });
          txHash = singleHash; // track last txHash
        }
      }

      // Wait for the final receipt if we have a transaction hash
      if (txHash && txHash !== 'batch_success') {
        setBatchMintProgress('Awaiting final confirmation receipt...');
        let receipt: any = null;
        while (!receipt) {
          await new Promise(r => setTimeout(r, 2000));
          receipt = await provider.request({
            method: 'eth_getTransactionReceipt',
            params: [txHash]
          }).catch(() => null);
        }
        if (receipt.status === '0x0') {
          const revertReason = await fetchRevertReason(txHash);
          throw new Error(revertReason || 'Batch transaction reverted onchain.');
        }
      }

      setBatchMintSuccess(txHash || 'batch_success');
      setBatchRecipientList('');
      await fetchBalance(activeAddress as string, chainId);
      await handleMintSearch(undefined, mintTokenDetails.address, true);
    } catch (err: any) {
      console.error(err);
      setBatchMintError(err.message || 'Batch transaction rejected or reverted.');
    } finally {
      setBatchMintLoading(false);
      setBatchMintProgress('');
    }
  };

  // ----------------------------------------------------
  // Payment Tab Functions
  const handlePaySearch = async (e?: React.FormEvent, overrideAddr?: string, isBackgroundRefresh?: boolean) => {
    if (e) e.preventDefault();
    const searchAddr = overrideAddr || payQueryAddr;
    if (!searchAddr.trim() || !searchAddr.startsWith('0x') || searchAddr.length !== 42) {
      setPayQueryError('Please enter a valid 42-character contract address.');
      return;
    }

    setPayQueryLoading(true);
    setPayQueryError(null);
    if (!isBackgroundRefresh) {
      setPayTokenDetails(null);
      setPayTxSuccess(null);
      setPayTxError(null);
      setPayMemosList([]);
    }

    try {
      const details = await fetchOnchainToken(
        searchAddr as `0x${string}`,
        chainId,
        walletAddress ? (walletAddress as `0x${string}`) : undefined
      );
      setPayTokenDetails(details);

      setPayMemosLoading(true);
      const memos = await fetchB20Memos(searchAddr as `0x${string}`, chainId);
      setPayMemosList(memos);
    } catch (err: any) {
      if (isBackgroundRefresh) {
        console.warn('[B20] Post-pay re-inspection failed (RPC lag), ignoring:', err.message);
      } else {
        console.error(err);
        setPayQueryError(err.message || 'Inspection failed. Ensure your wallet is on the correct network.');
      }
    } finally {
      setPayQueryLoading(false);
      setPayMemosLoading(false);
    }
  };

  const executePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayTxError(null);
    setPayTxSuccess(null);

    if (!walletConnected || !walletAddress) {
      openWeb3Modal();
      return;
    }

    const activeAddress = walletAddress;

    if (!payTokenDetails) return;

    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      setPayTxError('Please enter a valid payment amount.');
      return;
    }

    if (!payRecipient.startsWith('0x') || payRecipient.length !== 42) {
      setPayTxError('Please enter a valid 42-character merchant address.');
      return;
    }

    setPayTxLoading(true);

    try {
      const provider = await getWalletProvider();
      const rawAmount = parseUnits(payAmount, payTokenDetails.decimals);
      const memoBytes32 = payMemo
        ? pad(stringToHex(payMemo, { size: 32 }), { dir: 'right' })
        : '0x0000000000000000000000000000000000000000000000000000000000000000';

      const payData = encodeFunctionData({
        abi: B20_ABI,
        functionName: 'transferWithMemo',
        args: [payRecipient as `0x${string}`, rawAmount, memoBytes32]
      });

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: activeAddress,
          to: payTokenDetails.address,
          data: payData,
          value: '0x0',
          gas: '0x30D40', // 200,000 — B20 precompile needs explicit gas
        }]
      });

      let receipt: any = null;
      while (!receipt) {
        await new Promise(r => setTimeout(r, 2000));
        receipt = await provider.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash]
        }).catch(() => null);
      }

      if (receipt.status === '0x0') {
        const revertReason = await fetchRevertReason(txHash);
        throw new Error(revertReason || 'Payment transaction reverted onchain.');
      }

      setPayTxSuccess(txHash);
      setPayAmount('');
      setPayMemo('');

      await fetchBalance(activeAddress, chainId);
      await handlePaySearch(undefined, payTokenDetails?.address, true);
    } catch (err: any) {
      console.error(err);
      setPayTxError(err.message || 'Transaction rejected or reverted.');
    } finally {
      setPayTxLoading(false);
    }
  };

  const fetchDeployerAdminDetails = async () => {
    if (chainId !== 8453 || !B20_DEPLOYER_CONTRACT_ADDRESS || !walletConnected) return;
    setAdminDetailsLoading(true);
    try {
      const client = getPublicClient(chainId);

      // 1. Fetch Owner
      const owner = await client.readContract({
        address: B20_DEPLOYER_CONTRACT_ADDRESS as `0x${string}`,
        abi: B20_DEPLOYER_ABI,
        functionName: 'owner'
      }).catch(() => '');
      setAdminOwner(owner as string);

      // 2. Fetch Deploy Fee
      const fee = await client.readContract({
        address: B20_DEPLOYER_CONTRACT_ADDRESS as `0x${string}`,
        abi: B20_DEPLOYER_ABI,
        functionName: 'deployFee'
      }).catch(() => 0n);
      setAdminDeployFee((Number(fee) / 1e18).toString());

      // 3. Fetch Pending Owner
      const pendingOwner = await client.readContract({
        address: B20_DEPLOYER_CONTRACT_ADDRESS as `0x${string}`,
        abi: B20_DEPLOYER_ABI,
        functionName: 'pendingOwner'
      }).catch(() => '');
      setAdminPendingOwner(pendingOwner === '0x0000000000000000000000000000000000000000' ? '' : pendingOwner as string);

      // 4. Fetch Contract ETH Balance
      const bal = await client.getBalance({ address: B20_DEPLOYER_CONTRACT_ADDRESS as `0x${string}` }).catch(() => 0n);
      setAdminContractBalance((Number(bal) / 1e18).toString());

    } catch (e: any) {
      console.error('Error fetching admin details:', e);
    } finally {
      setAdminDetailsLoading(false);
    }
  };

  // Run on wallet or chain updates to load deployer details
  useEffect(() => {
    if (B20_DEPLOYER_CONTRACT_ADDRESS) {
      fetchDeployerAdminDetails();
    }
  }, [walletAddress, walletConnected, chainId]);

  const handleAdminSetFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminOpError(null);
    setAdminOpSuccess(null);
    if (!inputNewFee) return;

    setAdminOpLoading(true);
    try {
      const provider = await getWalletProvider();
      const parsedFee = parseUnits(inputNewFee, 18);
      const data = encodeFunctionData({
        abi: B20_DEPLOYER_ABI,
        functionName: 'setFee',
        args: [parsedFee]
      });

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: B20_DEPLOYER_CONTRACT_ADDRESS,
          data,
          value: '0x0',
          gas: '0x186A0', // 100,000
        }]
      });

      await confirmAdminTransaction(txHash, 'Deploy fee updated successfully!');
      setInputNewFee('');
    } catch (err: any) {
      setAdminOpError(err.message || 'Operation failed.');
    } finally {
      setAdminOpLoading(false);
    }
  };

  const handleAdminWithdraw = async (e: React.FormEvent, isAll: boolean) => {
    e.preventDefault();
    setAdminOpError(null);
    setAdminOpSuccess(null);

    setAdminOpLoading(true);
    try {
      const toAddr = inputWithdrawTo.trim() || walletAddress;
      if (!toAddr || !toAddr.startsWith('0x') || toAddr.length !== 42) {
        throw new Error('Invalid recipient wallet address.');
      }

      let data: `0x${string}`;
      if (isAll) {
        data = encodeFunctionData({
          abi: B20_DEPLOYER_ABI,
          functionName: 'withdrawAll',
          args: [toAddr as `0x${string}`]
        });
      } else {
        if (!inputWithdrawAmount) throw new Error('Specify withdrawal amount.');
        const parsedAmt = parseUnits(inputWithdrawAmount, 18);
        data = encodeFunctionData({
          abi: B20_DEPLOYER_ABI,
          functionName: 'withdraw',
          args: [toAddr as `0x${string}`, parsedAmt]
        });
      }

      const provider = await getWalletProvider();
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: B20_DEPLOYER_CONTRACT_ADDRESS,
          data,
          value: '0x0',
          gas: '0x186A0', // 100,000
        }]
      });

      await confirmAdminTransaction(txHash, isAll ? 'All funds withdrawn successfully!' : 'Funds withdrawn successfully!');
      setInputWithdrawTo('');
      setInputWithdrawAmount('');
    } catch (err: any) {
      setAdminOpError(err.message || 'Operation failed.');
    } finally {
      setAdminOpLoading(false);
    }
  };

  const handleAdminTransferOwnership = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminOpError(null);
    setAdminOpSuccess(null);
    if (!inputNewOwner || !inputNewOwner.startsWith('0x') || inputNewOwner.length !== 42) {
      setAdminOpError('Please enter a valid new owner address.');
      return;
    }

    setAdminOpLoading(true);
    try {
      const provider = await getWalletProvider();
      const data = encodeFunctionData({
        abi: B20_DEPLOYER_ABI,
        functionName: 'transferOwnership',
        args: [inputNewOwner as `0x${string}`]
      });

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: B20_DEPLOYER_CONTRACT_ADDRESS,
          data,
          value: '0x0',
          gas: '0x186A0', // 100,000
        }]
      });

      await confirmAdminTransaction(txHash, `Nominated ${inputNewOwner} as pending owner!`);
      setInputNewOwner('');
    } catch (err: any) {
      setAdminOpError(err.message || 'Operation failed.');
    } finally {
      setAdminOpLoading(false);
    }
  };

  const handleAdminAcceptOwnership = async () => {
    setAdminOpError(null);
    setAdminOpSuccess(null);

    setAdminOpLoading(true);
    try {
      const provider = await getWalletProvider();
      const data = encodeFunctionData({
        abi: B20_DEPLOYER_ABI,
        functionName: 'acceptOwnership'
      });

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: B20_DEPLOYER_CONTRACT_ADDRESS,
          data,
          value: '0x0',
          gas: '0x186A0', // 100,000
        }]
      });

      await confirmAdminTransaction(txHash, 'Ownership claimed successfully!');
    } catch (err: any) {
      setAdminOpError(err.message || 'Operation failed.');
    } finally {
      setAdminOpLoading(false);
    }
  };

  const confirmAdminTransaction = async (txHash: string, successMsg: string) => {
    const provider = await getWalletProvider();
    let receipt: any = null;
    while (!receipt) {
      await new Promise(r => setTimeout(r, 2000));
      receipt = await provider.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash]
      }).catch(() => null);
    }

    if (receipt.status === '0x0') {
      throw new Error('Transaction reverted onchain.');
    }

    setAdminOpSuccess(successMsg);
    await fetchDeployerAdminDetails();
  };

  const handleDeleteWatchlistToken = (address: string) => {
    if (confirm('Remove this token from your watchlist?')) {
      const filtered = userTokens.filter(t => t.address.toLowerCase() !== address.toLowerCase());
      setUserTokens(filtered);
      if (walletAddress) {
        localStorage.setItem(`deployed_b20_tokens_${walletAddress.toLowerCase()}`, JSON.stringify(filtered));

        if (isSupabaseConfigured) {
          (async () => {
            try {
              await supabase
                .from('b20_watchlist')
                .delete()
                .eq('wallet_address', walletAddress.toLowerCase())
                .eq('token_address', address.toLowerCase());
            } catch (dbErr) {
              console.error('Failed to remove watchlist token from Supabase:', dbErr);
            }
          })();
        }
      }
    }
  };

  const handleToggleWatchToken = (token: DeployedToken) => {
    if (!walletAddress || !walletConnected) {
      alert('Please connect your wallet first to watch tokens.');
      return;
    }
    const isWatched = userTokens.some(t => t.address.toLowerCase() === token.address.toLowerCase());
    let nextTokens;
    if (isWatched) {
      nextTokens = userTokens.filter(t => t.address.toLowerCase() !== token.address.toLowerCase());
    } else {
      nextTokens = [...userTokens, token];
    }
    setUserTokens(nextTokens);
    localStorage.setItem(`deployed_b20_tokens_${walletAddress.toLowerCase()}`, JSON.stringify(nextTokens));

    if (isSupabaseConfigured) {
      (async () => {
        try {
          if (isWatched) {
            await supabase
              .from('b20_watchlist')
              .delete()
              .eq('wallet_address', walletAddress.toLowerCase())
              .eq('token_address', token.address.toLowerCase());
          } else {
            await supabase.from('b20_watchlist').upsert({
              wallet_address: walletAddress.toLowerCase(),
              token_address: token.address.toLowerCase()
            });
          }
        } catch (dbErr) {
          console.error('Failed to toggle watchlist token in Supabase:', dbErr);
        }
      })();
    }
  };

  const handleDeleteGlobalToken = (address: string) => {
    if (confirm('Remove this token from global registry? This will not affect individual watchlists.')) {
      const filtered = globalTokens.filter(t => t.address.toLowerCase() !== address.toLowerCase());
      setGlobalTokens(filtered);
      localStorage.setItem('global_b20_tokens', JSON.stringify(filtered));

      if (isSupabaseConfigured) {
        (async () => {
          try {
            await supabase
              .from('b20_tokens')
              .delete()
              .eq('address', address.toLowerCase());
          } catch (dbErr) {
            console.error('Failed to delete global token from Supabase:', dbErr);
          }
        })();
      }
    }
  };

  const handleImportToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    if (!importAddr.startsWith('0x') || importAddr.length !== 42) {
      setImportError('Invalid address format. Must be a 42-character hex address.');
      return;
    }

    setImportLoading(true);
    try {
      const details = await fetchOnchainToken(importAddr as `0x${string}`, chainId, walletAddress ? (walletAddress as `0x${string}`) : undefined);

      const newImport: DeployedToken = {
        name: details.name,
        symbol: details.symbol,
        totalSupply: details.totalSupply.toString(),
        decimals: details.decimals.toString(),
        address: importAddr,
        mintable: details.isMinter || false,
        burnable: true,
        pausable: details.paused || false,
        blacklistable: false,
        taxEnabled: false,
        buyTax: '0',
        sellTax: '0',
        taxAddress: '',
        antiWhale: false,
        maxTxPercent: '0',
        maxWalletPercent: '0',
        isPaused: details.paused || false,
        isRenounced: !details.isAdmin,
        custom: true,
        chainId: chainId
      };

      let nextGlobal = [...globalTokens];
      if (!nextGlobal.some(t => t.address.toLowerCase() === newImport.address.toLowerCase())) {
        nextGlobal = [newImport, ...nextGlobal];
        setGlobalTokens(nextGlobal);
        localStorage.setItem('global_b20_tokens', JSON.stringify(nextGlobal));

        if (isSupabaseConfigured) {
          (async () => {
            try {
              await supabase.from('b20_tokens').upsert({
                address: newImport.address.toLowerCase(),
                name: newImport.name,
                symbol: newImport.symbol,
                total_supply: newImport.totalSupply,
                decimals: newImport.decimals,
                mintable: newImport.mintable,
                burnable: newImport.burnable,
                pausable: newImport.pausable,
                is_paused: newImport.isPaused || false,
                is_renounced: newImport.isRenounced || false,
                chain_id: chainId
              });
            } catch (dbErr) {
              console.error('Failed to sync imported token to Supabase:', dbErr);
            }
          })();
        }
      }
      setImportAddr('');
    } catch (err: any) {
      console.error(err);
      setImportError(err.message || 'Failed to inspect token. Verify it is a valid B20 precompile contract on this network.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const activeNetworkName = SUPPORTED_NETWORKS.find(n => n.id === chainId)?.name || 'Unsupported Network';

  return (
    <div className="min-h-screen bg-[#07080a] text-slate-100 font-sans selection:bg-blue-500/30 overflow-x-hidden pb-12 flex flex-col justify-between">
      <div>
        {/* Main Navbar */}
        <header className="sticky top-0 z-40 bg-[#07080a]/85 backdrop-blur-md border-b border-white/5 px-6 py-3.5 md:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            {/* Logo */}
            <div
              onClick={() => setActiveTab('home')}
              className="flex flex-col items-center justify-center cursor-pointer hover:opacity-90 select-none group gap-1"
            >
              <img
                src="/b20.png"
                alt="B20 Logo"
                className="h-7 w-auto rounded object-contain shadow-lg group-hover:scale-105 transition-transform duration-200 shrink-0"
              />
              <span className="text-[8px] font-sans font-bold text-slate-500 uppercase tracking-widest leading-none select-none">
                Token Deployer
              </span>
            </div>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-0.5 bg-white/5 rounded-xl p-1 border border-white/5 text-xs font-semibold select-none">
              <button
                onClick={() => setActiveTab('home')}
                className={cn(
                  'px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                  activeTab === 'home' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10 font-bold' : 'text-slate-400 hover:text-white'
                )}
              >
                <HomeIcon className="w-3.5 h-3.5" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('workspace')}
                className={cn(
                  'px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                  activeTab === 'workspace' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10 font-bold' : 'text-slate-400 hover:text-white'
                )}
              >
                <Sliders className="w-3.5 h-3.5 animate-pulse" />
                B20 Workspace
              </button>
              <button
                onClick={() => setActiveTab('portfolio')}
                className={cn(
                  'px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                  activeTab === 'portfolio' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10 font-bold' : 'text-slate-400 hover:text-white'
                )}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Watchlist
              </button>
              <button
                onClick={() => setActiveTab('docs')}
                className={cn(
                  'px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                  activeTab === 'docs' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10 font-bold' : 'text-slate-400 hover:text-white'
                )}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Wiki Docs
              </button>
              <Link
                href="/mcp"
                className="px-3.5 py-2 rounded-lg text-slate-400 hover:text-white transition-all flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5" />
                B20 MCP API
              </Link>
            </nav>

            {/* Wallet Connector */}
            <div className="flex items-center gap-2">
              {walletConnected && (
                <div className="relative group">
                  <button className="hidden lg:flex items-center bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl px-3 py-1.5 text-left cursor-pointer transition-colors">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-2">Network:</span>
                    <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      {activeNetworkName}
                      <span className="text-[10px] text-slate-400 ml-0.5">▼</span>
                    </span>
                  </button>
                  <div className="absolute right-0 mt-1 w-48 bg-[#0f1115] border border-white/10 rounded-2xl p-1.5 shadow-2xl invisible group-hover:visible hover:visible transition-all z-50">
                    {SUPPORTED_NETWORKS.map((net) => (
                      <button
                        key={net.id}
                        onClick={() => switchNetwork(net.id)}
                        className={cn(
                          "w-full text-left px-3.5 py-2 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-between",
                          chainId === net.id
                            ? "bg-blue-600/10 text-blue-400 font-bold"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                      >
                        {net.name}
                        {chainId === net.id && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => (walletConnected ? handleDisconnectWallet() : connectWallet())}
                className={cn(
                  'text-xs font-bold py-2 px-3.5 rounded-xl transition-all border cursor-pointer flex items-center gap-2 shrink-0 select-none',
                  walletConnected
                    ? 'bg-[#0f1115] border-white/10 text-slate-200 hover:bg-slate-800/60'
                    : 'bg-blue-600 hover:bg-blue-500 text-white border-transparent shadow-md shadow-blue-500/10'
                )}
              >
                <Wallet className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                {walletConnected ? (
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] text-slate-300">
                      {walletAddress?.substring(0, 6)}...{walletAddress?.substring(38)}
                    </span>
                    <span className="w-px h-3 bg-white/10 shrink-0" />
                    <span className="text-[10px] font-sans font-bold px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/15 rounded">
                      {walletBalance} ETH
                    </span>
                  </span>
                ) : (
                  <span>Connect Wallet</span>
                )}
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-400 hover:text-slate-100 bg-[#0f1115] rounded-xl border border-white/5 md:hidden cursor-pointer shrink-0"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Panel */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 top-[60px] bg-[#07080a] z-30 px-6 py-6 border-l border-white/5 md:hidden flex flex-col justify-between"
            >
              <div className="space-y-4">
                {[
                  { id: 'home', label: 'Overview', icon: <HomeIcon className="w-4 h-4" /> },
                  { id: 'workspace', label: 'B20 Workspace', icon: <Sliders className="w-4 h-4 animate-pulse" /> },
                  { id: 'portfolio', label: 'Watchlist', icon: <Briefcase className="w-4 h-4" /> },
                  { id: 'docs', label: 'Wiki Docs', icon: <BookOpen className="w-4 h-4" /> },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setMobileMenuOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 p-3.5 rounded-xl text-sm font-bold border',
                      activeTab === item.id
                        ? 'bg-blue-600/10 border-blue-500/20 text-blue-400'
                        : 'bg-[#0f1115]/50 border-white/5 text-slate-300'
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
                <Link
                  href="/mcp"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl text-sm font-bold border bg-[#0f1115]/50 border-white/5 text-slate-300"
                >
                  <Activity className="w-4 h-4" />
                  B20 MCP API
                </Link>
              </div>

              <div className="bg-[#0f1115] p-4 rounded-2xl border border-white/5 space-y-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                  Active Network
                </span>
                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-blue-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {activeNetworkName}
                  </span>
                  {walletConnected ? (
                    <button
                      onClick={() => { setMobileMenuOpen(false); handleDisconnectWallet(); }}
                      className="text-rose-400 font-bold hover:text-rose-300 cursor-pointer"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => { setMobileMenuOpen(false); connectWallet(); }}
                      className="text-blue-400 font-bold hover:text-blue-300 cursor-pointer"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-6 py-8 md:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {/* Home Tab */}
              {activeTab === 'home' && (
                <HomeTab
                  onStartDeploying={() => { setActiveTab('workspace'); setWorkspaceTab('deploy'); }}
                  userTokens={userTokens}
                />
              )}

              {/* B20 Workspace Tab - Deploy B20, Mint Tokens, Payment under one section */}
              {activeTab === 'workspace' && (
                <div className="space-y-8 animate-fadeIn">
                  {/* Tab Selector */}
                  <div className="flex justify-between items-center flex-wrap gap-4 border-b border-white/5 pb-4">
                    <div className="space-y-1 text-left font-sans">
                      <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                        B20 Operations Workspace
                        <span className="text-xs font-bold text-blue-400 bg-blue-950/40 px-2.5 py-1 rounded border border-blue-900/20 uppercase font-mono">
                          L2 precompile hub
                        </span>
                      </h2>
                      <p className="text-slate-400 text-xs md:text-sm">
                        Perform precompiled native actions on the Base network: Deploy, Mint circulating supply, or tag Payments with order Memos.
                      </p>
                    </div>

                    {/* Sub-tab pills */}
                    <div className="flex gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5 text-xs font-semibold select-none">
                      <button
                        onClick={() => setWorkspaceTab('deploy')}
                        className={cn(
                          'px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                          workspaceTab === 'deploy' ? 'bg-blue-600 text-white shadow-lg font-bold' : 'text-slate-400 hover:text-white'
                        )}
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        1. Deploy B20
                      </button>
                      <button
                        onClick={() => setWorkspaceTab('mint')}
                        className={cn(
                          'px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                          workspaceTab === 'mint' ? 'bg-blue-600 text-white shadow-lg font-bold' : 'text-slate-400 hover:text-white'
                        )}
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        2. Mint Tokens
                      </button>
                      <button
                        onClick={() => setWorkspaceTab('payment')}
                        className={cn(
                          'px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                          workspaceTab === 'payment' ? 'bg-blue-600 text-white shadow-lg font-bold' : 'text-slate-400 hover:text-white'
                        )}
                      >
                        <ArrowDownUp className="w-3.5 h-3.5" />
                        3. Payment
                      </button>
                    </div>
                  </div>

                  {/* Operational Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                    {/* LEFT COLUMN: Operations and Forms */}
                    <div className="space-y-6">

                      {/* SUB-SECTION 1: DEPLOY FORM */}
                      {workspaceTab === 'deploy' && (
                        <form onSubmit={handleDeploy} className="bg-[#0f1115] p-6 rounded-3xl border border-white/5 space-y-5 shadow-2xl text-left">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Variant Type</label>
                            <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                              <button
                                type="button"
                                onClick={() => setVariant('ASSET')}
                                className={cn(
                                  'flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer',
                                  variant === 'ASSET' ? 'bg-[#07080a] text-blue-400 border border-white/5 shadow-lg' : 'text-slate-400 hover:text-white'
                                )}
                              >
                                ASSET
                              </button>
                              <button
                                type="button"
                                onClick={() => setVariant('STABLECOIN')}
                                className={cn(
                                  'flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer',
                                  variant === 'STABLECOIN' ? 'bg-[#07080a] text-blue-400 border border-white/5 shadow-lg' : 'text-slate-400 hover:text-white'
                                )}
                              >
                                STABLECOIN
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-400">Token Name <span className="text-rose-500">*</span></label>
                              <input
                                type="text"
                                placeholder="e.g. USD Coin"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-[#07080a] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-400">Token Symbol <span className="text-rose-500">*</span></label>
                              <input
                                type="text"
                                placeholder="e.g. USDC"
                                required
                                maxLength={8}
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                className="w-full bg-[#07080a] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {variant === 'ASSET' ? (
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400">Decimals (6 - 18)</label>
                                <input
                                  type="number"
                                  min={6}
                                  max={18}
                                  required
                                  value={decimals}
                                  onChange={(e) => setDecimals(e.target.value)}
                                  className="w-full bg-[#07080a] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                                />
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400">ISO Currency (Fixed 6 decimals)</label>
                                <input
                                  type="text"
                                  maxLength={3}
                                  placeholder="USD"
                                  required
                                  value={currency}
                                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                                  className="w-full bg-[#07080a] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                                />
                              </div>
                            )}

                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-400">Initial Admin Address</label>
                              <input
                                type="text"
                                value={walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}` : 'Wallet not connected'}
                                disabled
                                className="w-full bg-[#07080a]/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                              />
                            </div>
                          </div>

                          <div className="space-y-3 pt-3 border-t border-white/5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <label className="flex items-start gap-3 bg-[#07080a]/40 p-3.5 rounded-xl border border-white/5 hover:bg-[#07080a] cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={grantSelfMintRole}
                                  onChange={(e) => setGrantSelfMintRole(e.target.checked)}
                                  className="mt-0.5 rounded border-white/10 text-blue-600 focus:ring-blue-500 bg-[#07080a] w-4 h-4 cursor-pointer"
                                />
                                <div>
                                  <span className="text-xs font-bold text-slate-200 block">Grant MINT_ROLE</span>
                                  <span className="text-[10px] text-slate-500 block">Deployer can mint supply</span>
                                </div>
                              </label>

                              <label className="flex items-start gap-3 bg-[#07080a]/40 p-3.5 rounded-xl border border-white/5 hover:bg-[#07080a] cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={hasSupplyCap}
                                  onChange={(e) => setHasSupplyCap(e.target.checked)}
                                  className="mt-0.5 rounded border-white/10 text-blue-600 focus:ring-blue-500 bg-[#07080a] w-4 h-4 cursor-pointer"
                                />
                                <div>
                                  <span className="text-xs font-bold text-slate-200 block">Enforce Supply Cap</span>
                                  <span className="text-[10px] text-slate-500 block">Set maximum token supply limit</span>
                                </div>
                              </label>
                            </div>

                            {hasSupplyCap && (
                              <div className="space-y-1 bg-[#07080a] p-4 rounded-xl border border-white/5">
                                <label className="text-xs font-bold text-slate-400">Supply Cap Amount</label>
                                <input
                                  type="number"
                                  required
                                  value={supplyCap}
                                  onChange={(e) => setSupplyCap(e.target.value)}
                                  className="w-full bg-[#0d0f14] border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                                />
                              </div>
                            )}
                          </div>

                          {!SUPPORTED_NETWORKS.some(n => n.id === chainId) && walletConnected && (
                            <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-start gap-2.5 text-xs text-amber-400">
                              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold block mb-0.5">Incorrect Network</span>
                                Please switch your wallet to Base Sepolia or Vibenet to execute deployments.
                              </div>
                            </div>
                          )}

                          <div className="pt-2">
                            {walletConnected ? (
                              SUPPORTED_NETWORKS.some(n => n.id === chainId) ? (
                                <button
                                  type="submit"
                                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 cursor-pointer text-sm flex items-center justify-center gap-2"
                                >
                                  <Plus className="w-4 h-4 font-black" />
                                  Deploy B20 Token
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => switchNetwork(84532)}
                                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all cursor-pointer text-sm flex items-center justify-center gap-2"
                                >
                                  <ArrowRightLeft className="w-4 h-4" />
                                  Switch to Base Sepolia
                                </button>
                              )
                            ) : (
                              <button
                                type="button"
                                onClick={() => connectWallet()}
                                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all cursor-pointer text-sm flex items-center justify-center gap-2"
                              >
                                <Wallet className="w-4 h-4" />
                                Connect Wallet to Deploy
                              </button>
                            )}
                          </div>
                        </form>
                      )}

                      {/* SUB-SECTION 2: MINT TOKENS LOOKUP & FORM */}
                      {workspaceTab === 'mint' && (
                        <div className="space-y-6 text-left">
                          {/* Lookup Card */}
                          <div className="bg-[#0f1115] p-5 rounded-3xl border border-white/5 shadow-2xl space-y-4">
                            <form onSubmit={handleMintSearch} className="space-y-1">
                              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Inspect Contract Address</label>
                              <div className="flex gap-2.5">
                                <input
                                  type="text"
                                  placeholder="Paste B20 address (0xB200...)"
                                  value={mintQueryAddr}
                                  onChange={(e) => { setMintQueryAddr(e.target.value); setMintQueryError(null); }}
                                  className="flex-1 bg-[#07080a] border border-white/5 rounded-xl px-4 py-2.5 text-xs md:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                                />
                                <button
                                  type="submit"
                                  disabled={mintQueryLoading || !mintQueryAddr}
                                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:bg-white/5 disabled:text-slate-600 flex items-center justify-center gap-1.5 shrink-0"
                                >
                                  {mintQueryLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Inspect'}
                                </button>
                              </div>
                              {mintQueryError && <p className="text-xs text-rose-400 mt-1">{mintQueryError}</p>}
                            </form>

                            {userTokens.filter(t => t.chainId === chainId).length > 0 && (
                              <div className="pt-2 flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">Watchlist:</span>
                                {userTokens.filter(t => t.chainId === chainId).map((t) => (
                                  <button
                                    key={t.address}
                                    onClick={() => { setMintQueryAddr(t.address); handleMintSearch(undefined, t.address); }}
                                    className="text-[10px] bg-[#07080a] hover:bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg text-blue-400 cursor-pointer font-mono font-bold"
                                  >
                                    {t.symbol}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Mint execution form */}
                          {mintTokenDetails ? (
                            <div className="bg-[#0f1115] p-5 rounded-3xl border border-white/5 shadow-2xl space-y-4 animate-fadeIn">
                              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                                  <Sliders className="w-4 h-4 text-blue-400" />
                                  Execute Mint
                                </h3>

                                <div className="flex bg-[#07080a] p-0.5 rounded-lg border border-white/5">
                                  <button
                                    type="button"
                                    onClick={() => { setIsBatchMint(false); setMintTxSuccess(null); setMintTxError(null); }}
                                    className={cn(
                                      "px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer",
                                      !isBatchMint ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                                    )}
                                  >
                                    Single
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setIsBatchMint(true); setBatchMintSuccess(null); setBatchMintError(null); }}
                                    className={cn(
                                      "px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer",
                                      isBatchMint ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                                    )}
                                  >
                                    Airdrop
                                  </button>
                                </div>
                              </div>

                              {mintTokenDetails.isMinter ? (
                                !isBatchMint ? (
                                  <form onSubmit={executeMint} className="space-y-4">
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Recipient Wallet Address</label>
                                      <input
                                        type="text"
                                        placeholder="0xRecipientAddress..."
                                        required
                                        value={mintRecipient}
                                        onChange={(e) => setMintRecipient(e.target.value)}
                                        className="w-full bg-[#07080a] border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Mint Amount ({mintTokenDetails.symbol})</label>
                                      <input
                                        type="number"
                                        placeholder="1000.0"
                                        required
                                        value={mintAmount}
                                        onChange={(e) => setMintAmount(e.target.value)}
                                        className="w-full bg-[#07080a] border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                                      />
                                    </div>

                                    {mintTxError && <p className="text-[10px] text-rose-400 font-semibold">{mintTxError}</p>}

                                    {mintTxSuccess && (
                                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] text-emerald-400 leading-normal flex items-start gap-1.5">
                                        <Check className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" />
                                        <div>
                                          <span className="font-bold block mb-0.5">Mint Succeeded!</span>
                                          Tx Hash: <span className="font-mono">{mintTxSuccess.substring(0, 12)}...{mintTxSuccess.substring(58)}</span>
                                        </div>
                                      </div>
                                    )}

                                    {/* MetaMask simulation warning note */}
                                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 flex gap-2">
                                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                      <p className="text-amber-300/80 text-[10px] leading-relaxed">
                                        <span className="font-bold text-amber-300">Expected:</span> MetaMask may show &quot;This transaction is likely to fail&quot;. This is a known false positive — the public RPC cannot simulate B20 precompile calls, but the actual transaction succeeds on-chain. <span className="font-semibold">Click &quot;Confirm&quot; to proceed.</span>
                                      </p>
                                    </div>

                                    <button
                                      type="submit"
                                      disabled={mintTxLoading || !mintRecipient || !mintAmount}
                                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-slate-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                    >
                                      {mintTxLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Execute Mint'}
                                    </button>
                                  </form>
                                ) : (
                                  <form onSubmit={executeBatchMint} className="space-y-4">
                                    <div className="space-y-1">
                                      <div className="flex justify-between items-center mb-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Recipient List</label>
                                        <span className="text-[8px] font-medium text-slate-500 font-mono">address amount (one per line)</span>
                                      </div>
                                      <textarea
                                        rows={4}
                                        placeholder={`0x1234567890123456789012345678901234567890 1000\n0x0987654321098765432109876543210987654321 2500`}
                                        required
                                        value={batchRecipientList}
                                        onChange={(e) => setBatchRecipientList(e.target.value)}
                                        className="w-full bg-[#07080a] border border-white/5 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-700 min-h-[90px]"
                                      />
                                    </div>

                                    {/* Preview Box */}
                                    {batchRecipientsCount > 0 && (
                                      <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-1 text-[10px] leading-relaxed">
                                        <div className="flex justify-between text-slate-400">
                                          <span>Total Valid Addresses:</span>
                                          <span className="font-bold text-slate-200 font-mono">{batchRecipientsCount}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-400">
                                          <span>Total Airdrop Value:</span>
                                          <span className="font-bold text-blue-400 font-mono">{batchTotalTokens} {mintTokenDetails.symbol}</span>
                                        </div>
                                      </div>
                                    )}

                                    {batchMintProgress && (
                                      <div className="text-[10px] text-blue-400 font-mono flex items-center gap-1.5 bg-blue-950/20 p-2.5 rounded-xl border border-blue-900/30 leading-normal">
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" />
                                        <span>{batchMintProgress}</span>
                                      </div>
                                    )}

                                    {batchMintError && (
                                      <p className="text-[10px] text-rose-400 font-semibold whitespace-pre-line leading-relaxed max-h-[80px] overflow-y-auto bg-rose-950/15 p-2 rounded-lg border border-rose-900/20">{batchMintError}</p>
                                    )}

                                    {batchMintSuccess && (
                                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] text-emerald-400 leading-normal flex items-start gap-1.5">
                                        <Check className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" />
                                        <div>
                                          <span className="font-bold block mb-0.5">Airdrop Completed!</span>
                                          Receipt Tx: <span className="font-mono">{batchMintSuccess.substring(0, 12)}...{batchMintSuccess.substring(58)}</span>
                                        </div>
                                      </div>
                                    )}

                                    {/* MetaMask simulation warning note */}
                                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 flex gap-2">
                                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                      <p className="text-amber-300/80 text-[10px] leading-relaxed">
                                        <span className="font-bold text-amber-300">Expected:</span> MetaMask may show &quot;This transaction is likely to fail&quot;. This is a known false positive — the public RPC cannot simulate B20 precompile calls, but the actual transaction succeeds on-chain. <span className="font-semibold">Click &quot;Confirm&quot; to proceed.</span>
                                      </p>
                                    </div>

                                    <button
                                      type="submit"
                                      disabled={batchMintLoading || batchRecipientsCount === 0}
                                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-slate-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                    >
                                      {batchMintLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : `Execute Airdrop (${batchRecipientsCount} Wallets)`}
                                    </button>
                                  </form>
                                )
                              ) : (
                                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-start gap-2.5 text-xs text-slate-400 leading-relaxed">
                                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
                                  <span>Your connected wallet does not hold the MINT_ROLE for this contract and is unauthorized to mint new supply.</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-[#0f1115]/40 border border-white/5 border-dashed rounded-3xl p-8 text-center text-slate-500 text-xs py-12">
                              Search a contract address above to load the Minting forms.
                            </div>
                          )}
                        </div>
                      )}

                      {/* SUB-SECTION 3: PAYMENT LOOKUP & FORM */}
                      {workspaceTab === 'payment' && (
                        <div className="space-y-6 text-left animate-fadeIn">
                          {/* Lookup Card */}
                          <div className="bg-[#0f1115] p-5 rounded-3xl border border-white/5 shadow-2xl space-y-4">
                            <form onSubmit={handlePaySearch} className="space-y-1">
                              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Inspect Contract Address</label>
                              <div className="flex gap-2.5">
                                <input
                                  type="text"
                                  placeholder="Paste B20 address (0xB200...)"
                                  value={payQueryAddr}
                                  onChange={(e) => { setPayQueryAddr(e.target.value); setPayQueryError(null); }}
                                  className="flex-1 bg-[#07080a] border border-white/5 rounded-xl px-4 py-2.5 text-xs md:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                                />
                                <button
                                  type="submit"
                                  disabled={payQueryLoading || !payQueryAddr}
                                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:bg-white/5 disabled:text-slate-600 flex items-center justify-center gap-1.5 shrink-0"
                                >
                                  {payQueryLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Inspect'}
                                </button>
                              </div>
                              {payQueryError && <p className="text-xs text-rose-400 mt-1">{payQueryError}</p>}
                            </form>

                            {userTokens.filter(t => t.chainId === chainId).length > 0 && (
                              <div className="pt-2 flex flex-wrap items-center gap-1.5 border-t border-white/5 mt-2">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">Watchlist:</span>
                                {userTokens.filter(t => t.chainId === chainId).map((t) => (
                                  <button
                                    key={t.address}
                                    type="button"
                                    onClick={() => { setPayQueryAddr(t.address); handlePaySearch(undefined, t.address); }}
                                    className="text-[10px] bg-[#07080a] hover:bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg text-blue-400 cursor-pointer font-mono font-bold"
                                  >
                                    {t.symbol}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Payment Form */}
                          {payTokenDetails ? (
                            <div className="bg-[#0f1115] p-5 rounded-3xl border border-white/5 shadow-2xl space-y-4 animate-fadeIn">
                              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                                  <Sliders className="w-4 h-4 text-pink-400" />
                                  Execute Payment with Memo
                                </h3>
                              </div>

                              <form onSubmit={executePayment} className="space-y-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Merchant Wallet Address</label>
                                  <input
                                    type="text"
                                    placeholder="0xMerchantAddress..."
                                    required
                                    value={payRecipient}
                                    onChange={(e) => setPayRecipient(e.target.value)}
                                    className="w-full bg-[#07080a] border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Payment Amount ({payTokenDetails.symbol})</label>
                                  <input
                                    type="number"
                                    step="any"
                                    placeholder="10.0"
                                    required
                                    value={payAmount}
                                    onChange={(e) => setPayAmount(e.target.value)}
                                    className="w-full bg-[#07080a] border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Order Memo (String, max 32 chars)</label>
                                  <input
                                    type="text"
                                    placeholder="order-12345"
                                    value={payMemo}
                                    onChange={(e) => setPayMemo(e.target.value)}
                                    maxLength={32}
                                    className="w-full bg-[#07080a] border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                                  />
                                </div>

                                {/* MetaMask simulation warning note */}
                                <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 flex gap-2">
                                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                  <p className="text-amber-300/80 text-[10px] leading-relaxed">
                                    <span className="font-bold text-amber-300">Expected:</span> MetaMask may show &quot;This transaction is likely to fail&quot;. This is a known false positive — the public RPC cannot simulate B20 precompile calls, but the actual transaction succeeds on-chain. <span className="font-semibold">Click &quot;Confirm&quot; to proceed.</span>
                                  </p>
                                </div>

                                {payTxError && <p className="text-[10px] text-rose-400 font-semibold">{payTxError}</p>}

                                {payTxSuccess && (
                                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] text-emerald-400 leading-normal flex items-start gap-1.5">
                                    <Check className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" />
                                    <div>
                                      <span className="font-bold block mb-0.5">Payment Succeeded!</span>
                                      Tx Hash: <span className="font-mono">{payTxSuccess.substring(0, 12)}...{payTxSuccess.substring(58)}</span>
                                    </div>
                                  </div>
                                )}

                                <button
                                  type="submit"
                                  disabled={payTxLoading || !payRecipient || !payAmount}
                                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-slate-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  {payTxLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Execute Payment'}
                                </button>
                              </form>
                            </div>
                          ) : (
                            <div className="bg-[#0f1115]/40 border border-white/5 border-dashed rounded-3xl p-8 text-center text-slate-500 text-xs py-12">
                              Search a contract address above to load the Payment form.
                            </div>
                          )}
                        </div>
                      )}


                      {/* Sub-section 4 removed */}
                    </div>

                    {/* RIGHT COLUMN: Visual Loop Animations & Descriptions */}
                    <div className="space-y-6 text-left">

                      {/* Explainer Panel Card */}
                      <div className="bg-[#0f1115] p-5 rounded-3xl border border-white/5 shadow-2xl space-y-5">

                        {/* Section Header */}
                        <div className="flex justify-between items-center border-b border-white/5 pb-3">
                          <span className="text-[10px] font-mono font-bold uppercase text-blue-400 tracking-widest block leading-none">
                            {workspaceTab === 'deploy' && 'Deploy B20 Explanation'}
                            {workspaceTab === 'mint' && 'Mint Tokens Explanation'}
                            {workspaceTab === 'payment' && 'Payment Memo Explanation'}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-white/5 px-2.5 py-0.5 rounded border border-white/5 font-mono">
                            Animation Explainer
                          </span>
                        </div>

                        {/* HIGH FIDELITY CYBERPUNK ANIMATION PANEL */}
                        <div className="bg-[#07080a] rounded-3xl p-6 border border-white/5 min-h-[220px] flex flex-col justify-center items-center relative overflow-hidden bg-[radial-gradient(circle_at_center,_#0f172a_0%,_#07080a_100%)]">

                          {/* Tech Grid Background */}
                          <div
                            className="absolute inset-0 opacity-15 pointer-events-none"
                            style={{
                              backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
                              backgroundSize: '20px 20px'
                            }}
                          />

                          <AnimatePresence mode="wait">

                            {/* Deploy Animation */}
                            {workspaceTab === 'deploy' && (
                              <motion.div
                                key="deploy-anim"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="w-full flex flex-col items-center justify-center space-y-6 z-10"
                              >
                                {/* Running SVG laser stream */}
                                <div className="w-full max-w-sm flex items-center justify-between relative h-20">

                                  {/* Laser Line */}
                                  <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                                    <defs>
                                      <linearGradient id="deployGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                                        <stop offset="50%" stopColor="#60a5fa" stopOpacity="1" />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                                      </linearGradient>
                                    </defs>
                                    <line x1="15%" y1="50%" x2="85%" y2="50%" stroke="rgba(255,255,255,0.05)" strokeWidth="4" strokeLinecap="round" />
                                    <motion.line
                                      x1="15%" y1="50%" x2="85%" y2="50%"
                                      stroke="url(#deployGrad)" strokeWidth="4" strokeLinecap="round"
                                      strokeDasharray="40 180"
                                      animate={{ strokeDashoffset: [0, -220] }}
                                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                    />
                                  </svg>

                                  {/* Source Node: Wallet */}
                                  <div className="z-10 flex flex-col items-center">
                                    <motion.div
                                      animate={{ boxShadow: ['0 0 0 0px rgba(59,130,246,0.3)', '0 0 0 8px rgba(59,130,246,0)'] }}
                                      transition={{ repeat: Infinity, duration: 2 }}
                                      className="w-10 h-10 bg-blue-950/80 border border-blue-500/30 rounded-2xl flex items-center justify-center shadow-lg"
                                    >
                                      <Wallet className="w-5 h-5 text-blue-400" />
                                    </motion.div>
                                    <span className="text-[9px] font-bold text-slate-400 mt-1.5 font-mono">Creator</span>
                                  </div>

                                  {/* Precompile Node: B20 Factory */}
                                  <div className="z-10 flex flex-col items-center relative">
                                    {/* Double Validation Rings */}
                                    <motion.div
                                      animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                                      transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                                      className="absolute -inset-1 rounded-full border border-sky-400/40 -z-0"
                                    />
                                    <motion.div
                                      animate={{ scale: [1, 2.3], opacity: [0.3, 0] }}
                                      transition={{ repeat: Infinity, duration: 2, delay: 0.5, ease: "easeOut" }}
                                      className="absolute -inset-1 rounded-full border border-sky-400/20 -z-0"
                                    />

                                    <div className="w-12 h-12 bg-sky-950/80 border border-sky-400/50 rounded-full flex items-center justify-center shadow-2xl relative z-10">
                                      <Cpu className="w-5.5 h-5.5 text-sky-400 animate-spin" style={{ animationDuration: '6s' }} />
                                    </div>
                                    <span className="text-[9px] font-bold text-sky-400 mt-1.5 font-mono">B20 Factory</span>
                                  </div>

                                  {/* Target Node: Deployed Token */}
                                  <div className="z-10 flex flex-col items-center">
                                    <motion.div
                                      animate={{
                                        borderColor: ['rgba(16,185,129,0.2)', 'rgba(16,185,129,0.6)', 'rgba(16,185,129,0.2)'],
                                        scale: [1, 1.05, 1]
                                      }}
                                      transition={{ repeat: Infinity, duration: 2 }}
                                      className="w-10 h-10 bg-emerald-950/80 border border-emerald-500/30 rounded-2xl flex items-center justify-center shadow-lg"
                                    >
                                      <Rocket className="w-5 h-5 text-emerald-400" />
                                    </motion.div>
                                    <span className="text-[9px] font-bold text-emerald-400 mt-1.5 font-mono">0xB200...</span>
                                  </div>

                                </div>

                                <div className="space-y-2 text-center max-w-sm">
                                  <h4 className="text-xs font-bold text-slate-200">How B20 Token Deployment Works</h4>
                                  <p className="text-[10.5px] text-slate-400 leading-relaxed font-medium">
                                    The laser beam shows your wallet sending parameters to the <code className="text-sky-400 font-mono">B20Factory</code> precompile. The precompile generates a deterministic address starting with <code className="text-emerald-400 font-mono">0xB200</code>. By compiling natively to Rust, deployment cost is slashed by **99.8%** compared to standard EVM Solidity script deploys.
                                  </p>
                                </div>
                              </motion.div>
                            )}

                            {/* Mint Animation */}
                            {workspaceTab === 'mint' && (
                              <motion.div
                                key="mint-anim"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="w-full flex flex-col items-center justify-center space-y-6 z-10"
                              >
                                {!isBatchMint ? (
                                  /* Standard Mint Anim */
                                  <div className="w-full max-w-sm flex items-center justify-between relative h-20">
                                    {/* Laser Line */}
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                                      <defs>
                                        <linearGradient id="mintGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
                                          <stop offset="50%" stopColor="#818cf8" stopOpacity="1" />
                                          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                                        </linearGradient>
                                      </defs>
                                      <line x1="15%" y1="50%" x2="85%" y2="50%" stroke="rgba(255,255,255,0.05)" strokeWidth="4" strokeLinecap="round" />
                                      <motion.line
                                        x1="15%" y1="50%" x2="85%" y2="50%"
                                        stroke="url(#mintGrad)" strokeWidth="4" strokeLinecap="round"
                                        strokeDasharray="40 180"
                                        animate={{ strokeDashoffset: [0, -220] }}
                                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                      />
                                    </svg>

                                    {/* Source Node: Admin */}
                                    <div className="z-10 flex flex-col items-center">
                                      <motion.div
                                        animate={{ boxShadow: ['0 0 0 0px rgba(99,102,241,0.3)', '0 0 0 8px rgba(99,102,241,0)'] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="w-10 h-10 bg-indigo-950/80 border border-indigo-500/30 rounded-2xl flex items-center justify-center shadow-lg"
                                      >
                                        <Lock className="w-5 h-5 text-indigo-400" />
                                      </motion.div>
                                      <span className="text-[9px] font-bold text-slate-400 mt-1.5 font-mono">MINT_ROLE</span>
                                    </div>

                                    {/* Precompile Node: B20 Token */}
                                    <div className="z-10 flex flex-col items-center relative">
                                      {/* Double Validation Rings */}
                                      <motion.div
                                        animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                                        transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                                        className="absolute -inset-1 rounded-full border border-indigo-400/40 -z-0"
                                      />
                                      <motion.div
                                        animate={{ scale: [1, 2.3], opacity: [0.3, 0] }}
                                        transition={{ repeat: Infinity, duration: 2, delay: 0.5, ease: "easeOut" }}
                                        className="absolute -inset-1 rounded-full border border-indigo-400/20 -z-0"
                                      />

                                      <div className="w-12 h-12 bg-indigo-950/80 border border-indigo-400/50 rounded-full flex items-center justify-center shadow-2xl relative z-10">
                                        <Zap className="w-5.5 h-5.5 text-indigo-400 animate-pulse" />
                                      </div>
                                      <span className="text-[9px] font-bold text-indigo-400 mt-1.5 font-mono">Validating Cap</span>
                                    </div>

                                    {/* Target Node: Recipient */}
                                    <div className="z-10 flex flex-col items-center">
                                      <motion.div
                                        animate={{
                                          borderColor: ['rgba(168,85,247,0.2)', 'rgba(168,85,247,0.6)', 'rgba(168,85,247,0.2)'],
                                          scale: [1, 1.05, 1]
                                        }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="w-10 h-10 bg-purple-950/80 border border-purple-500/30 rounded-2xl flex items-center justify-center shadow-lg"
                                      >
                                        <Check className="w-5 h-5 text-purple-400" />
                                      </motion.div>
                                      <span className="text-[9px] font-bold text-purple-400 mt-1.5 font-mono">Recipient</span>
                                    </div>
                                  </div>
                                ) : (
                                  /* Batch Mint Anim (Airdrop Network Split) */
                                  <div className="w-full max-w-sm relative h-36 flex items-center justify-center">
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                      <defs>
                                        <linearGradient id="batchGrad1" x1="50%" y1="50%" x2="20%" y2="20%">
                                          <stop offset="0%" stopColor="#a855f7" stopOpacity="1" />
                                          <stop offset="100%" stopColor="#ec4899" stopOpacity="0.2" />
                                        </linearGradient>
                                        <linearGradient id="batchGrad2" x1="50%" y1="50%" x2="80%" y2="50%">
                                          <stop offset="0%" stopColor="#a855f7" stopOpacity="1" />
                                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
                                        </linearGradient>
                                        <linearGradient id="batchGrad3" x1="50%" y1="50%" x2="20%" y2="80%">
                                          <stop offset="0%" stopColor="#a855f7" stopOpacity="1" />
                                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
                                        </linearGradient>
                                      </defs>
                                      {/* Background structural lines */}
                                      <line x1="50%" y1="50%" x2="20%" y2="20%" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
                                      <line x1="50%" y1="50%" x2="80%" y2="50%" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
                                      <line x1="50%" y1="50%" x2="20%" y2="80%" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />

                                      {/* Moving Laser Streams */}
                                      <motion.line
                                        x1="50%" y1="50%" x2="20%" y2="20%"
                                        stroke="url(#batchGrad1)" strokeWidth="4" strokeLinecap="round"
                                        strokeDasharray="20 80"
                                        animate={{ strokeDashoffset: [0, -100] }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                      />
                                      <motion.line
                                        x1="50%" y1="50%" x2="80%" y2="50%"
                                        stroke="url(#batchGrad2)" strokeWidth="4" strokeLinecap="round"
                                        strokeDasharray="20 80"
                                        animate={{ strokeDashoffset: [0, -100] }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: 0.3 }}
                                      />
                                      <motion.line
                                        x1="50%" y1="50%" x2="20%" y2="80%"
                                        stroke="url(#batchGrad3)" strokeWidth="4" strokeLinecap="round"
                                        strokeDasharray="20 80"
                                        animate={{ strokeDashoffset: [0, -100] }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: 0.6 }}
                                      />
                                    </svg>

                                    {/* Emitter Center Node */}
                                    <div className="absolute left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] z-20 flex flex-col items-center">
                                      <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="w-12 h-12 bg-purple-950/90 border border-purple-500/50 rounded-full flex items-center justify-center shadow-2xl relative z-10"
                                      >
                                        <Cpu className="w-6 h-6 text-purple-400 animate-spin" style={{ animationDuration: '10s' }} />
                                      </motion.div>
                                      <span className="text-[8px] font-bold text-purple-400 mt-1 font-mono">B20 Emitter</span>
                                    </div>

                                    {/* Recipient 1 (Top Left) */}
                                    <div className="absolute left-[15%] top-[10%] z-10 flex items-center gap-1.5">
                                      <div className="w-8 h-8 bg-pink-950/70 border border-pink-500/30 rounded-xl flex items-center justify-center">
                                        <Plus className="w-4 h-4 text-pink-400" />
                                      </div>
                                      <span className="text-[8px] font-mono text-pink-400 font-bold">Node_A</span>
                                    </div>

                                    {/* Recipient 2 (Right) */}
                                    <div className="absolute left-[78%] top-[45%] z-10 flex flex-col items-center">
                                      <div className="w-8 h-8 bg-blue-950/70 border border-blue-500/30 rounded-xl flex items-center justify-center">
                                        <Plus className="w-4 h-4 text-blue-400" />
                                      </div>
                                      <span className="text-[8px] font-mono text-blue-400 font-bold mt-0.5">Node_B</span>
                                    </div>

                                    {/* Recipient 3 (Bottom Left) */}
                                    <div className="absolute left-[15%] top-[72%] z-10 flex items-center gap-1.5">
                                      <div className="w-8 h-8 bg-emerald-950/70 border border-emerald-500/30 rounded-xl flex items-center justify-center">
                                        <Plus className="w-4 h-4 text-emerald-400" />
                                      </div>
                                      <span className="text-[8px] font-mono text-emerald-400 font-bold">Node_C</span>
                                    </div>
                                  </div>
                                )}

                                <div className="space-y-2 text-center max-w-sm">
                                  <h4 className="text-xs font-bold text-slate-200">
                                    {!isBatchMint ? "How Single Minting Works" : "How Batch Airdrop Minting Works"}
                                  </h4>
                                  <p className="text-[10.5px] text-slate-400 leading-relaxed font-medium">
                                    {!isBatchMint ? (
                                      <>The laser beam shows the mint call flowing from the administrator. The B20 precompile intercepts the transaction, checks that the sender owns <code className="text-indigo-400 font-mono">MINT_ROLE</code> authorization, and asserts that the new tokens do not breach the configured <code className="text-indigo-400 font-mono">supplyCap</code>. If approved, supply increases natively in the ledger.</>
                                    ) : (
                                      <>Admin broadcasts multiple mint calls atomically. If the wallet supports EIP-7579, all recipient balances are updated in a single atomic transaction bundle. If not, the dApp executes sequential zero-cost precompile mints automatically.</>
                                    )}
                                  </p>
                                </div>
                              </motion.div>
                            )}

                            {/* Payment Animation */}
                            {workspaceTab === 'payment' && (
                              <motion.div
                                key="payment-anim"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="w-full flex flex-col items-center justify-center space-y-6 z-10"
                              >
                                {/* Running SVG laser stream */}
                                <div className="w-full max-w-sm flex items-center justify-between relative h-20">

                                  {/* Laser Line */}
                                  <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                                    <defs>
                                      <linearGradient id="payGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#ec4899" stopOpacity="0" />
                                        <stop offset="50%" stopColor="#f472b6" stopOpacity="1" />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                                      </linearGradient>
                                    </defs>
                                    <line x1="15%" y1="50%" x2="85%" y2="50%" stroke="rgba(255,255,255,0.05)" strokeWidth="4" strokeLinecap="round" />
                                    <motion.line
                                      x1="15%" y1="50%" x2="85%" y2="50%"
                                      stroke="url(#payGrad)" strokeWidth="4" strokeLinecap="round"
                                      strokeDasharray="40 180"
                                      animate={{ strokeDashoffset: [0, -220] }}
                                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                    />
                                  </svg>

                                  {/* Source Node: Customer */}
                                  <div className="z-10 flex flex-col items-center">
                                    <motion.div
                                      animate={{ boxShadow: ['0 0 0 0px rgba(236,72,153,0.3)', '0 0 0 8px rgba(236,72,153,0)'] }}
                                      transition={{ repeat: Infinity, duration: 2 }}
                                      className="w-10 h-10 bg-pink-950/80 border border-pink-500/30 rounded-2xl flex items-center justify-center shadow-lg"
                                    >
                                      <Wallet className="w-5 h-5 text-pink-400" />
                                    </motion.div>
                                    <span className="text-[9px] font-bold text-slate-400 mt-1.5 font-mono">Payer</span>
                                  </div>

                                  {/* Precompile Node: Memo Log */}
                                  <div className="z-10 flex flex-col items-center relative">
                                    {/* Double Validation Rings */}
                                    <motion.div
                                      animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                                      transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                                      className="absolute -inset-1 rounded-full border border-pink-400/40 -z-0"
                                    />
                                    <motion.div
                                      animate={{ scale: [1, 2.3], opacity: [0.3, 0] }}
                                      transition={{ repeat: Infinity, duration: 2, delay: 0.5, ease: "easeOut" }}
                                      className="absolute -inset-1 rounded-full border border-pink-400/20 -z-0"
                                    />

                                    <div className="w-12 h-12 bg-pink-950/80 border border-pink-400/50 rounded-full flex items-center justify-center shadow-2xl relative z-10">
                                      <FileSpreadsheet className="w-5.5 h-5.5 text-pink-400 animate-pulse" />
                                    </div>
                                    <span className="text-[9px] font-bold text-pink-400 mt-1.5 font-mono">Memo Event</span>
                                  </div>

                                  {/* Target Node: Merchant */}
                                  <div className="z-10 flex flex-col items-center">
                                    <motion.div
                                      animate={{
                                        borderColor: ['rgba(16,185,129,0.2)', 'rgba(16,185,129,0.6)', 'rgba(16,185,129,0.2)'],
                                        scale: [1, 1.05, 1]
                                      }}
                                      transition={{ repeat: Infinity, duration: 2 }}
                                      className="w-10 h-10 bg-emerald-950/80 border border-emerald-500/30 rounded-2xl flex items-center justify-center shadow-lg"
                                    >
                                      <Compass className="w-5 h-5 text-emerald-400" />
                                    </motion.div>
                                    <span className="text-[9px] font-bold text-emerald-400 mt-1.5 font-mono">Merchant</span>
                                  </div>

                                </div>

                                <div className="space-y-2 text-center max-w-sm">
                                  <h4 className="text-xs font-bold text-slate-200">How Payments with Memos Work</h4>
                                  <p className="text-[10.5px] text-slate-400 leading-relaxed font-medium">
                                    The laser beam shows the payment payload carrying a 32-byte Order Memo. As the transfer completes, the B20 precompile triggers an onchain <code className="text-pink-400 font-mono">Memo(address,bytes32)</code> event log. Backends reconcile this order reference offchain instantly with zero extra transaction steps.
                                  </p>
                                </div>
                              </motion.div>
                            )}
                            {/* Admin Explainer Animation Removed */}
                          </AnimatePresence>
                        </div>

                        {/* At a glance table */}
                        <div className="space-y-2">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-mono">
                            Differences At A Glance
                          </span>
                          <div className="overflow-x-auto border border-white/5 rounded-2xl bg-[#07080a]">
                            <table className="w-full text-[10px] border-collapse text-left">
                              <thead>
                                <tr className="border-b border-white/5 bg-white/[0.01] text-slate-500 font-bold">
                                  <th className="px-4 py-2">Operation</th>
                                  <th className="px-4 py-2">Target Frequency</th>
                                  <th className="px-4 py-2">Access Role</th>
                                  <th className="px-4 py-2">Primary Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5 text-slate-300 font-medium">
                                <tr className="hover:bg-white/[0.01]">
                                  <td className="px-4 py-2 font-bold text-sky-400">Deploy B20</td>
                                  <td className="px-4 py-2 text-slate-400">Once per token</td>
                                  <td className="px-4 py-2">Anyone</td>
                                  <td className="px-4 py-2 font-mono text-[9px]">createB20()</td>
                                </tr>
                                <tr className="hover:bg-white/[0.01]">
                                  <td className="px-4 py-2 font-bold text-indigo-400">Mint Supply</td>
                                  <td className="px-4 py-2 text-slate-400">As needed</td>
                                  <td className="px-4 py-2">MINT_ROLE</td>
                                  <td className="px-4 py-2 font-mono text-[9px]">mint()</td>
                                </tr>
                                <tr className="hover:bg-white/[0.01]">
                                  <td className="px-4 py-2 font-bold text-pink-400">Payment</td>
                                  <td className="px-4 py-2 text-slate-400">Continuous</td>
                                  <td className="px-4 py-2">Token Holder</td>
                                  <td className="px-4 py-2 font-mono text-[9px]">transferWithMemo()</td>
                                </tr>
                                {B20_DEPLOYER_CONTRACT_ADDRESS && (
                                  <tr className="hover:bg-white/[0.01]">
                                    <td className="px-4 py-2 font-bold text-blue-400">Fee Manager</td>
                                    <td className="px-4 py-2 text-slate-400">Administrative</td>
                                    <td className="px-4 py-2">Contract Owner</td>
                                    <td className="px-4 py-2 font-mono text-[9px]">withdrawAll(), setFee()</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Payment Tab Memo Event Logs (Show on right side under the explainer) */}
                      {workspaceTab === 'payment' && payTokenDetails && (
                        <div className="bg-[#0f1115] p-5 rounded-3xl border border-white/5 shadow-2xl space-y-4 animate-fadeIn">
                          <div className="flex justify-between items-center">
                            <h3 className="text-xs font-bold text-white flex items-center gap-2">
                              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                              Onchain Payment Memos Log
                            </h3>
                            <button
                              onClick={() => handlePaySearch()}
                              disabled={payMemosLoading}
                              className="text-[10px] font-bold text-blue-400 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Refresh Logs
                            </button>
                          </div>

                          <div className="overflow-x-auto border border-white/5 rounded-2xl bg-[#07080a]">
                            <table className="w-full text-xs text-left border-collapse font-mono">
                              <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02] text-slate-500 font-bold">
                                  <th className="px-4 py-2.5">Block</th>
                                  <th className="px-4 py-2.5">Sender</th>
                                  <th className="px-4 py-2.5">Memo ID</th>
                                  <th className="px-4 py-2.5 text-right font-sans">Tx</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5 text-slate-300 font-medium">
                                {payMemosLoading ? (
                                  <tr>
                                    <td colSpan={4} className="py-6 text-center text-slate-500">
                                      <RefreshCw className="w-4 h-4 animate-spin mx-auto text-blue-500" />
                                    </td>
                                  </tr>
                                ) : payMemosList.length === 0 ? (
                                  <tr>
                                    <td colSpan={4} className="py-6 text-center text-slate-500 font-sans">
                                      No payments detected. Send a payment on the left to emit a log!
                                    </td>
                                  </tr>
                                ) : (
                                  payMemosList.map((memo, idx) => (
                                    <tr key={idx} className="hover:bg-white/[0.01]">
                                      <td className="px-4 py-2.5 text-slate-500">{memo.blockNumber}</td>
                                      <td className="px-4 py-2.5 text-slate-200 select-all">{memo.caller.substring(0, 6)}...{memo.caller.substring(38)}</td>
                                      <td className="px-4 py-2.5">
                                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/15 rounded text-[9px] font-sans font-bold">
                                          {memo.memoText}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-right">
                                        <a
                                          href={`${getChainById(chainId).blockExplorers.default.url}/tx/${memo.txHash}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-slate-400 hover:text-blue-400 transition-colors"
                                        >
                                          <ExternalLink className="w-3 h-3 inline" />
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
                  </div>
                </div>
              )}

              {/* Watchlist Tab */}
              {activeTab === 'portfolio' && (
                <div className="space-y-12">

                  {/* SECTION 1: MY DEPLOYED TOKENS */}
                  <div className="space-y-6">
                    <div className="text-center md:text-left max-w-2xl space-y-2 mb-4 font-sans">
                      <h2 className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight flex items-center justify-center md:justify-start gap-2">
                        <Briefcase className="w-5 h-5 text-blue-400" />
                        My Deployed Tokens Watchlist
                      </h2>
                      <p className="text-slate-400 text-xs md:text-sm">
                        Track B20 precompiled tokens deployed specifically by your currently connected wallet.
                      </p>
                    </div>

                    {!walletConnected ? (
                      <div className="text-center py-12 text-slate-500 bg-[#0d0f14]/30 rounded-3xl border border-white/5 border-dashed text-xs max-w-xl mx-auto flex flex-col items-center gap-3">
                        <Wallet className="w-6 h-6 text-slate-600 animate-pulse" />
                        <span>Please connect your web3 wallet to view your deployed tokens.</span>
                      </div>
                    ) : userTokens.filter(token => token.chainId === chainId).length === 0 ? (
                      <div className="text-center py-16 text-slate-500 bg-[#0d0f14]/40 rounded-3xl border border-white/5 border-dashed text-sm flex flex-col items-center gap-3 max-w-xl mx-auto">
                        <Rocket className="w-8 h-8 text-slate-600" />
                        <div>
                          <span className="font-bold block mb-1">No tokens deployed yet</span>
                          Go to the B20 Workspace to create a deterministic B20 token with this wallet.
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {userTokens.filter(token => token.chainId === chainId).map((token) => (
                          <div
                            key={token.address}
                            className="p-5 bg-[#0f1115] rounded-3xl border border-white/5 hover:border-white/10 transition-all shadow-md group relative text-left"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="min-w-0">
                                <h3 className="font-bold text-slate-100 flex flex-wrap items-center gap-1.5 text-sm md:text-base">
                                  {token.name}
                                  <span className="text-[10px] bg-[#07080a] px-2 py-0.5 rounded text-blue-400 border border-white/5 font-mono font-bold uppercase tracking-wider shrink-0">
                                    {token.symbol}
                                  </span>
                                  {token.chainId === 8453 ? (
                                    <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/15 px-1.5 py-0.5 rounded font-sans font-bold uppercase tracking-wider shrink-0">
                                      Mainnet
                                    </span>
                                  ) : token.chainId === 84538453 ? (
                                    <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/15 px-1.5 py-0.5 rounded font-sans font-bold uppercase tracking-wider shrink-0">
                                      Vibenet
                                    </span>
                                  ) : (
                                    <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/15 px-1.5 py-0.5 rounded font-sans font-bold uppercase tracking-wider shrink-0">
                                      Sepolia
                                    </span>
                                  )}
                                </h3>
                                <span className="text-[10px] text-slate-500 font-mono block truncate max-w-44 select-all mt-1">
                                  {token.address}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteWatchlistToken(token.address)}
                                className="p-1.5 text-slate-600 hover:text-rose-400 bg-white/[0.02] border border-white/5 rounded-lg cursor-pointer shrink-0"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="space-y-1.5 text-xs pt-3 border-t border-white/5">
                              <div className="flex justify-between text-slate-400">
                                <span>Decimals</span>
                                <span className="font-mono text-slate-200">{token.decimals}</span>
                              </div>
                              <div className="flex justify-between text-slate-400">
                                <span>Total Supply</span>
                                <span className="font-mono text-slate-200">
                                  {parseFloat(token.totalSupply).toLocaleString()}
                                </span>
                              </div>
                            </div>

                            <div className="pt-4 flex gap-2">
                              <button
                                onClick={() => { setMintQueryAddr(token.address); handleMintSearch(undefined, token.address); setActiveTab('workspace'); setWorkspaceTab('mint'); }}
                                className="flex-1 py-1.5 bg-blue-600/10 hover:bg-blue-600 border border-blue-500/10 text-blue-400 hover:text-white rounded-xl text-[10px] font-bold cursor-pointer transition-all"
                              >
                                Mint
                              </button>
                              <button
                                onClick={() => { setPayQueryAddr(token.address); handlePaySearch(undefined, token.address); setActiveTab('workspace'); setWorkspaceTab('payment'); }}
                                className="flex-1 py-1.5 bg-pink-600/10 hover:bg-pink-600 border border-pink-500/10 text-pink-400 hover:text-white rounded-xl text-[10px] font-bold cursor-pointer transition-all"
                              >
                                Pay
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SECTION 2: GLOBAL EXPLORER / REGISTRY */}
                  <div className="space-y-6 border-t border-white/5 pt-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="text-center md:text-left max-w-2xl space-y-1 font-sans">
                        <h2 className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight flex items-center justify-center md:justify-start gap-2">
                          <Globe className="w-5 h-5 text-emerald-400" />
                          Global Token Registry
                        </h2>
                        <p className="text-slate-400 text-xs md:text-sm">
                          Discover all precompiled B20 tokens imported or deployed on this browser. Add them to your specific watchlist.
                        </p>
                      </div>

                      {/* Import Token Form */}
                      <form onSubmit={handleImportToken} className="flex gap-2 w-full md:max-w-md">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="Paste B20 address (0xB200...)"
                            value={importAddr}
                            onChange={(e) => { setImportAddr(e.target.value); setImportError(null); }}
                            className="w-full bg-[#07080a] border border-white/5 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                          />
                          {importError && (
                            <span className="absolute left-0 -bottom-5 text-[9px] text-rose-400 font-semibold truncate max-w-full">
                              {importError}
                            </span>
                          )}
                        </div>
                        <button
                          type="submit"
                          disabled={importLoading || !importAddr}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-white/5 disabled:text-slate-600 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1 shrink-0"
                        >
                          {importLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Import'}
                        </button>
                      </form>
                    </div>

                    {globalTokens.length === 0 ? (
                      <div className="text-center py-16 text-slate-500 bg-[#0d0f14]/20 rounded-3xl border border-white/5 border-dashed text-xs max-w-xl mx-auto flex flex-col items-center gap-3">
                        <Globe className="w-6 h-6 text-slate-700" />
                        <span>No tokens in global registry. Deploy a token or paste an address above to import!</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {globalTokens.map((token) => {
                          const isWatched = userTokens.some(t => t.address.toLowerCase() === token.address.toLowerCase());
                          return (
                            <div
                              key={token.address}
                              className="p-5 bg-[#0f1115] rounded-3xl border border-white/5 hover:border-white/10 transition-all shadow-md group relative text-left"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div className="min-w-0">
                                  <h3 className="font-bold text-slate-100 flex flex-wrap items-center gap-1.5 text-sm md:text-base">
                                    {token.name}
                                    <span className="text-[10px] bg-[#07080a] px-2 py-0.5 rounded text-emerald-400 border border-white/5 font-mono font-bold uppercase tracking-wider shrink-0">
                                      {token.symbol}
                                    </span>
                                    {token.chainId === 8453 ? (
                                      <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/15 px-1.5 py-0.5 rounded font-sans font-bold uppercase tracking-wider shrink-0">
                                        Mainnet
                                      </span>
                                    ) : token.chainId === 84538453 ? (
                                      <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/15 px-1.5 py-0.5 rounded font-sans font-bold uppercase tracking-wider shrink-0">
                                        Vibenet
                                      </span>
                                    ) : (
                                      <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/15 px-1.5 py-0.5 rounded font-sans font-bold uppercase tracking-wider shrink-0">
                                        Sepolia
                                      </span>
                                    )}
                                  </h3>
                                  <span className="text-[10px] text-slate-500 font-mono block truncate max-w-44 select-all mt-1">
                                    {token.address}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleDeleteGlobalToken(token.address)}
                                  className="p-1.5 text-slate-700 hover:text-rose-400 bg-white/[0.01] hover:bg-rose-950/20 border border-white/5 rounded-lg cursor-pointer shrink-0 transition-colors"
                                  title="Remove from Global Registry"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="space-y-1.5 text-xs pt-3 border-t border-white/5">
                                <div className="flex justify-between text-slate-400">
                                  <span>Decimals</span>
                                  <span className="font-mono text-slate-200">{token.decimals}</span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                  <span>Total Supply</span>
                                  <span className="font-mono text-slate-200">
                                    {parseFloat(token.totalSupply).toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              <div className="pt-4 flex gap-2">
                                <button
                                  onClick={() => handleToggleWatchToken(token)}
                                  className={cn(
                                    "flex-1 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer transition-all border",
                                    isWatched
                                      ? "bg-emerald-600/10 hover:bg-rose-600/10 text-emerald-400 hover:text-rose-400 border-emerald-500/10 hover:border-rose-500/20"
                                      : "bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border-blue-500/10"
                                  )}
                                >
                                  {isWatched ? '✓ Watching' : '+ Watch'}
                                </button>
                                <button
                                  onClick={() => { setMintQueryAddr(token.address); handleMintSearch(undefined, token.address); setActiveTab('workspace'); setWorkspaceTab('mint'); }}
                                  className="py-1.5 px-3 bg-[#07080a] hover:bg-slate-800 border border-white/5 text-slate-300 rounded-xl text-[10px] font-bold cursor-pointer transition-all"
                                >
                                  Mint
                                </button>
                                <button
                                  onClick={() => { setPayQueryAddr(token.address); handlePaySearch(undefined, token.address); setActiveTab('workspace'); setWorkspaceTab('payment'); }}
                                  className="py-1.5 px-3 bg-[#07080a] hover:bg-slate-800 border border-white/5 text-slate-300 rounded-xl text-[10px] font-bold cursor-pointer transition-all"
                                >
                                  Pay
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Docs Tab */}
              {activeTab === 'docs' && <DocsTab />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Fee Manager Admin Panel in Footer - Visible only to Contract Owner */}
      {B20_DEPLOYER_CONTRACT_ADDRESS && adminOwner && walletAddress && adminOwner.toLowerCase() === walletAddress.toLowerCase() && (
        <div className="max-w-7xl mx-auto px-6 md:px-8 mt-12 w-full text-left">
          <details className="group bg-[#0f1115]/80 border border-white/5 rounded-3xl p-5 shadow-2xl transition-all open:bg-[#0f1115] overflow-hidden">
            <summary className="list-none flex items-center justify-between cursor-pointer select-none">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-950/50 border border-blue-500/20 rounded-xl flex items-center justify-center">
                  <Shield className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">B20Deployer Fee Management</h3>
                  <p className="text-[10px] text-slate-500">Contract Owner Settings & Withdrawals</p>
                </div>
              </div>
              <span className="text-xs text-slate-400 group-open:rotate-180 transition-transform duration-200">
                ▼
              </span>
            </summary>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-white/5 animate-fadeIn">
              {/* Left Side: State Info */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deployer Contract State</h4>
                  <button
                    onClick={fetchDeployerAdminDetails}
                    disabled={adminDetailsLoading}
                    className="text-[10px] bg-[#07080a] border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white px-2 py-1 rounded-lg cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className={cn("w-3 h-3", adminDetailsLoading && "animate-spin")} />
                    Refresh
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="bg-[#07080a] p-3 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Contract Balance</span>
                    <span className="text-sm font-bold text-blue-400">{adminContractBalance} ETH</span>
                  </div>
                  <div className="bg-[#07080a] p-3 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Deploy Fee</span>
                    <span className="text-sm font-bold text-white">{adminDeployFee} ETH</span>
                  </div>
                  <div className="bg-[#07080a] p-3 rounded-2xl border border-white/5 space-y-1 col-span-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Owner Address</span>
                    <span className="text-[10px] font-bold text-slate-300 break-all">{adminOwner || 'Checking...'}</span>
                  </div>
                  {adminPendingOwner && (
                    <div className="bg-[#07080a] p-3 rounded-2xl border border-rose-500/10 space-y-1 col-span-2">
                      <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider block">Pending Nominee</span>
                      <span className="text-[10px] font-bold text-slate-300 break-all">{adminPendingOwner}</span>
                    </div>
                  )}
                </div>

                {/* Pending Ownership Acceptance Trigger */}
                {adminPendingOwner && walletAddress && adminPendingOwner.toLowerCase() === walletAddress.toLowerCase() && (
                  <div className="p-3.5 bg-blue-950/20 border border-blue-900/30 rounded-2xl flex flex-col gap-2">
                    <span className="text-xs font-bold text-blue-300">You are nominated as the Pending Owner of this contract!</span>
                    <button
                      onClick={handleAdminAcceptOwnership}
                      disabled={adminOpLoading}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      {adminOpLoading ? 'Processing...' : 'Accept Ownership (Claim Contract)'}
                    </button>
                  </div>
                )}
              </div>

              {/* Right Side: Admin Actions */}
              <div className="space-y-5 bg-[#07080a]/50 p-5 rounded-3xl border border-white/5">
                <h4 className="text-xs font-bold text-slate-300 border-b border-white/5 pb-2">Contract Admin Operations</h4>

                {/* Operation Success/Error */}
                {adminOpError && (
                  <p className="text-[10px] text-rose-400 font-semibold bg-rose-950/15 p-2 rounded-lg border border-rose-900/20">{adminOpError}</p>
                )}
                {adminOpSuccess && (
                  <p className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/15 p-2 rounded-lg border border-emerald-900/20">{adminOpSuccess}</p>
                )}

                {/* Set Fee Form */}
                <form onSubmit={handleAdminSetFee} className="space-y-2 border-b border-white/5 pb-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">1. Set Deployment Fee (ETH)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 0.00004"
                      required
                      value={inputNewFee}
                      onChange={(e) => setInputNewFee(e.target.value)}
                      className="flex-1 bg-[#07080a] border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={adminOpLoading || !inputNewFee}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-slate-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      {adminOpLoading ? 'Writing...' : 'Update Fee'}
                    </button>
                  </div>
                </form>

                {/* Withdraw Form */}
                <div className="space-y-3 border-b border-white/5 pb-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">2. Withdraw Fees</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Recipient Address (defaults to owner)"
                      value={inputWithdrawTo}
                      onChange={(e) => setInputWithdrawTo(e.target.value)}
                      className="w-full bg-[#07080a] border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="any"
                        placeholder="Amount (for Partial)"
                        value={inputWithdrawAmount}
                        onChange={(e) => setInputWithdrawAmount(e.target.value)}
                        className="flex-1 bg-[#07080a] border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={(e) => handleAdminWithdraw(e, false)}
                        disabled={adminOpLoading || !inputWithdrawAmount}
                        className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-white/5"
                      >
                        Withdraw Partial
                      </button>
                      <button
                        onClick={(e) => handleAdminWithdraw(e, true)}
                        disabled={adminOpLoading}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        Withdraw All
                      </button>
                    </div>
                  </div>
                </div>

                {/* Transfer Ownership Form */}
                <form onSubmit={handleAdminTransferOwnership} className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">3. Transfer Ownership (2-Step)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="New Owner wallet (0x...)"
                      required
                      value={inputNewOwner}
                      onChange={(e) => setInputNewOwner(e.target.value)}
                      className="flex-1 bg-[#07080a] border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={adminOpLoading || !inputNewOwner}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-slate-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      {adminOpLoading ? 'Nominating...' : 'Nominate'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </details>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 md:px-8 border-t border-white/5 pt-6 mt-12 w-full flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-semibold text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          <span className="bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-xl text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold select-none">
            © {new Date().getFullYear()} B20DEPLOY
          </span>
          <span className="text-slate-800 hidden sm:inline select-none">•</span>
          <span className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Created by</span>
            <a
              href="https://x.com/yournahian"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/15 rounded-xl transition-all font-bold inline-flex items-center gap-1.5 align-middle text-[11px] shadow-sm shadow-blue-500/5 hover:-translate-y-0.5 duration-200"
            >
              <svg className="w-2.5 h-2.5 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              @yournahian
            </a>
          </span>
        </div>
        <div className="flex gap-4">
          <Link href="/mcp" className="hover:text-slate-400 transition-colors">
            MCP API Server
          </Link>
          <a href="https://docs.base.org/get-started/launch-b20-token" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">
            Base Documentation
          </a>
        </div>
      </footer>

      {/* Deployment Progress Modal */}
      <AnimatePresence>
        {isDeploying && (
          <div className="fixed inset-0 bg-[#07080a]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0f1115] border border-white/5 rounded-3xl w-full max-w-md p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6">
                <h3 className="text-slate-100 font-black text-lg flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-blue-500 animate-bounce" />
                  B20 Precompile Deployment
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  Broadcasting B20 Factory call on Base Network (Chain ID: {chainId}).
                </p>
              </div>

              <div className="space-y-4 mb-6">
                {/* MetaMask simulation warning note */}
                {deployStep === 3 && (
                  <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-300/80 text-[10px] leading-relaxed">
                      <span className="font-bold text-amber-300">Expected:</span> MetaMask may show &quot;This transaction is likely to fail&quot;. This is a known false positive — the public RPC cannot simulate B20 precompile calls, but the actual transaction succeeds on-chain. <span className="font-semibold">Click &quot;Confirm&quot; to proceed.</span>
                    </p>
                  </div>
                )}
                {[
                  { id: 1, label: '1. Local parameters encoding' },
                  { id: 2, label: '2. Developer fee included (0.00004 ETH)' },
                  { id: 3, label: '3. Confirm deployment in wallet (click Confirm)' },
                  { id: 4, label: '4. Extracting token address from receipt' },
                ].map((step) => (
                  <div key={step.id} className="flex items-center justify-between text-xs">
                    <span className={cn('font-semibold', deployStep >= step.id ? 'text-slate-200' : 'text-slate-500')}>
                      {step.label}
                    </span>
                    {deployStep === step.id && !deployedTokenResult && (
                      <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                    )}
                    {deployStep > step.id && <Check className="w-4 h-4 text-emerald-400" />}
                    {deployStep === 4 && deployedTokenResult && step.id === 4 && (
                      <Check className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                ))}
              </div>

              {/* Deployed Results View */}
              {deployedTokenResult && (
                <div className="bg-[#07080a] p-4 rounded-2xl border border-white/5 space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
                      <Check className="w-4.5 h-4.5 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-200 text-sm">Token Deployed Successfully!</h4>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Deterministic B20 Precompile Address derived
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-[11px] border-t border-white/5 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Token Address</span>
                      <span className="font-mono text-slate-300 flex items-center gap-1.5">
                        {deployedTokenResult.address.substring(0, 10)}...{deployedTokenResult.address.substring(34)}
                        <button
                          onClick={() => handleCopy(deployedTokenResult.address, 'res_addr')}
                          className="hover:text-slate-100 cursor-pointer"
                        >
                          {copiedText === 'res_addr' ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Transaction Hash</span>
                      <span className="font-mono text-slate-300 flex items-center gap-1.5">
                        {deployTxHash.substring(0, 10)}...{deployTxHash.substring(54)}
                        <button
                          onClick={() => handleCopy(deployTxHash, 'res_tx')}
                          className="hover:text-slate-100 cursor-pointer"
                        >
                          {copiedText === 'res_tx' ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleResetDeployerModal}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl transition-all text-xs cursor-pointer"
                  >
                    View in Watchlist & Manage
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
