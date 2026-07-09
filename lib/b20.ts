import { createPublicClient, http, defineChain } from 'viem';

// Define Vibenet as a custom chain for viem
export const baseVibenet = defineChain({
  id: 84538453,
  name: 'Base Vibenet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.vibes.base.org'] },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: 'https://explorer.vibes.base.org' },
  },
});

export const baseSepolia = defineChain({
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia.base.org'] },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: 'https://sepolia.basescan.org' },
  },
});

export const baseMainnet = defineChain({
  id: 8453,
  name: 'Base Mainnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.base.org'] },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: 'https://basescan.org' },
  },
});

export function getChainById(chainId: number) {
  if (chainId === 84538453) return baseVibenet;
  if (chainId === 84532) return baseSepolia;
  return baseMainnet;
}

export function getPublicClient(chainId: number) {
  const chain = getChainById(chainId);
  return createPublicClient({
    chain,
    transport: http(),
  });
}

// B20 Factory Address
export const B20_FACTORY_ADDRESS = '0xB20f000000000000000000000000000000000000';

// Configurable B20Deployer custom Solidity wrapper contract address.
// If set to an address (e.g. '0xe1585cfc9b5b927fea2c3b0c72ca35361243d535' or your new deployed contract), 
// the site will route deployments in a single transaction through this contract.
// If empty, the site falls back to direct factory precompile deployment (Option A/two transactions).
export const B20_DEPLOYER_CONTRACT_ADDRESS: string = '0x7a09f1a886c8b017653485292bbafc111ccc7e68';

// ABI for B20Deployer wrapper
export const B20_DEPLOYER_ABI = [
  {
    type: 'function',
    name: 'deployB20Token',
    inputs: [
      { name: 'variant', type: 'uint8' },
      { name: 'salt', type: 'bytes32' },
      { name: 'params', type: 'bytes' },
      { name: 'initCalls', type: 'bytes[]' }
    ],
    outputs: [{ name: 'token', type: 'address' }],
    stateMutability: 'payable'
  },
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'deployFee',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'pendingOwner',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'setFee',
    inputs: [{ name: 'newFee', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'withdrawAll',
    inputs: [{ name: 'to', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'balance',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'transferOwnership',
    inputs: [{ name: 'newOwner', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'acceptOwnership',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable'
  }
] as const;

// B20 Factory ABI
export const B20_FACTORY_ABI = [
  {
    type: 'function',
    name: 'createB20',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'variant', type: 'uint8' }, // 0 = ASSET, 1 = STABLECOIN
      { name: 'salt', type: 'bytes32' },
      { name: 'params', type: 'bytes' },
      { name: 'initCalls', type: 'bytes[]' }
    ],
    outputs: [{ name: 'token', type: 'address' }]
  }
] as const;

// B20 Administrative / Manager ABI
export const B20_ADMIN_ABI = [
  { type: 'function', name: 'grantRole', stateMutability: 'nonpayable', inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }], outputs: [] },
  { type: 'function', name: 'updateSupplyCap', stateMutability: 'nonpayable', inputs: [{ name: 'newCap', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'mint', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'setPaused', stateMutability: 'nonpayable', inputs: [{ name: 'paused', type: 'bool' }], outputs: [] },
  { type: 'function', name: 'renounceRole', stateMutability: 'nonpayable', inputs: [{ name: 'role', type: 'bytes32' }, { name: 'callerConfirmation', type: 'address' }], outputs: [] }
] as const;

// B20 standard surface ABI
export const B20_ABI = [
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'supplyCap', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'paused', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  {
    type: 'function', name: 'hasRole', stateMutability: 'view',
    inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }],
    outputs: [{ type: 'bool' }]
  },
  {
    type: 'function', name: 'transferWithMemo', stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'memo', type: 'bytes32' }],
    outputs: [{ type: 'bool' }]
  },
  {
    type: 'event', name: 'Memo', inputs: [
      { name: 'caller', type: 'address', indexed: true },
      { name: 'memo', type: 'bytes32', indexed: true },
    ]
  },
  {
    type: 'event', name: 'Transfer', inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256' }
    ]
  }
] as const;

// Roles constants
export const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
export const MINT_ROLE = '0x154c00819833dac601ee5ddded6fda79d9d8b506b911b3dbd54cdb95fe6c3686'; // keccak256("MINT_ROLE")

// Configure the developer wallet address to receive deployment fees (0.00004 ETH)
export const DEVELOPER_FEE_RECEIVER = '0xD914E6078c43E0A6228Eef39a417EDF37a8F182B';

/**
 * Fetch detailed token details onchain
 */
export async function fetchOnchainToken(tokenAddress: `0x${string}`, chainId: number, checkUserWallet?: `0x${string}`) {
  const client = getPublicClient(chainId);

  try {
    const [name, symbol, decimals, totalSupply, supplyCap, paused] = await Promise.all([
      client.readContract({ address: tokenAddress, abi: B20_ABI, functionName: 'name' }),
      client.readContract({ address: tokenAddress, abi: B20_ABI, functionName: 'symbol' }),
      client.readContract({ address: tokenAddress, abi: B20_ABI, functionName: 'decimals' }),
      client.readContract({ address: tokenAddress, abi: B20_ABI, functionName: 'totalSupply' }),
      client.readContract({ address: tokenAddress, abi: B20_ABI, functionName: 'supplyCap' }).catch(() => BigInt(0)), // fallback if not B20
      client.readContract({ address: tokenAddress, abi: B20_ABI, functionName: 'paused' }).catch(() => false), // fallback if not pausable
    ]);

    let isAdmin = false;
    let isMinter = false;

    if (checkUserWallet) {
      [isAdmin, isMinter] = await Promise.all([
        client.readContract({ address: tokenAddress, abi: B20_ABI, functionName: 'hasRole', args: [DEFAULT_ADMIN_ROLE, checkUserWallet] }).catch(() => false),
        client.readContract({ address: tokenAddress, abi: B20_ABI, functionName: 'hasRole', args: [MINT_ROLE, checkUserWallet] }).catch(() => false),
      ]);
    }

    return {
      name,
      symbol,
      decimals,
      totalSupply: totalSupply.toString(),
      supplyCap: supplyCap.toString(),
      paused,
      isAdmin,
      isMinter,
      address: tokenAddress,
      chainId
    };
  } catch (err: any) {
    console.error('Failed to read contract details onchain:', err);
    throw new Error('Address is not a valid B20/ERC20 token contract or RPC error: ' + err.message);
  }
}

/**
 * Fetch B20 Memo events for a token
 */
export async function fetchB20Memos(tokenAddress: `0x${string}`, chainId: number) {
  const client = getPublicClient(chainId);

  try {
    const logs = await client.getLogs({
      address: tokenAddress,
      event: {
        type: 'event',
        name: 'Memo',
        inputs: [
          { name: 'caller', type: 'address', indexed: true },
          { name: 'memo', type: 'bytes32', indexed: true },
        ],
      },
      fromBlock: BigInt(0), // Start from block 0
      toBlock: 'latest'
    });

    return logs.map((log) => {
      const memoHex = log.args.memo || '0x';
      // Convert bytes32 hex to string, trim trailing null characters
      let memoStr = '';
      try {
        const cleanHex = memoHex.startsWith('0x') ? memoHex.slice(2) : memoHex;
        const bytes = Buffer.from(cleanHex, 'hex');
        memoStr = bytes.toString('utf8').replace(/\0+$/, '');
      } catch (e) {
        memoStr = memoHex;
      }

      return {
        caller: log.args.caller,
        memoHex,
        memoText: memoStr,
        txHash: log.transactionHash,
        blockNumber: log.blockNumber ? Number(log.blockNumber) : 0
      };
    });
  } catch (err) {
    console.error('Failed to fetch Memo logs:', err);
    return [];
  }
}
