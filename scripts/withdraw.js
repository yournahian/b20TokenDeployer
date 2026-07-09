const { createWalletClient, http, publicActions, defineChain } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { baseSepolia, base } = require('viem/chains');

// Import your deployed contract address from lib/b20
const fs = require('fs');
const path = require('path');

const baseVibenet = defineChain({
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

const WITHDRAW_ABI = [
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
  }
];

// Helper to parse configured contract address from lib/b20.ts
function getConfiguredAddress() {
  try {
    const fileContent = fs.readFileSync(path.join(__dirname, '../lib/b20.ts'), 'utf8');
    const match = fileContent.match(/B20_DEPLOYER_CONTRACT_ADDRESS:\s*string\s*=\s*['"](0x[a-fA-F0-9]{40})['"]/);
    return match ? match[1] : '';
  } catch (e) {
    return '';
  }
}

async function main() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => readline.question(query, resolve));

  try {
    console.log('--- B20Deployer Fee Withdrawal Terminal ---');

    console.log('\n--- Network Selection ---');
    console.log('1. Base Sepolia (Testnet)');
    console.log('2. Base Vibenet (Testnet)');
    console.log('3. Base (Mainnet)');
    const netChoice = await question('Select network (1-3): ');

    let chain = baseSepolia;
    if (netChoice === '2') chain = baseVibenet;
    if (netChoice === '3') chain = base;

    console.log(`Using Network: ${chain.name}`);

    const defaultAddr = getConfiguredAddress();
    const contractAddrInput = await question(`Enter B20Deployer contract address [Default: ${defaultAddr || 'None'}]: `);
    const contractAddress = contractAddrInput.trim() || defaultAddr;

    if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress.length !== 42) {
      throw new Error('Invalid contract address.');
    }

    const pkey = await question('\nEnter Owner Private Key (starts with 0x): ');
    if (!pkey.startsWith('0x') || pkey.length !== 66) {
      throw new Error('Invalid private key.');
    }

    const account = privateKeyToAccount(pkey);
    console.log(`Owner address: ${account.address}`);

    const client = createWalletClient({
      account,
      chain,
      transport: http()
    }).extend(publicActions);

    console.log('\nChecking contract balance...');
    const rawBalance = await client.readContract({
      address: contractAddress,
      abi: WITHDRAW_ABI,
      functionName: 'balance'
    });

    const balEth = Number(rawBalance) / 1e18;
    console.log(`Current Contract Balance: ${balEth} ETH (${rawBalance.toString()} wei)`);

    if (rawBalance === 0n) {
      console.log('Contract balance is zero. Nothing to withdraw.');
      return;
    }

    const recipient = await question(`\nEnter recipient address to send funds to [Default: Owner wallet]: `);
    const withdrawTo = recipient.trim() || account.address;

    if (!withdrawTo.startsWith('0x') || withdrawTo.length !== 42) {
      throw new Error('Invalid recipient wallet address.');
    }

    console.log(`\nWithdrawing ${balEth} ETH to ${withdrawTo}...`);
    
    const hash = await client.writeContract({
      address: contractAddress,
      abi: WITHDRAW_ABI,
      functionName: 'withdrawAll',
      args: [withdrawTo]
    });

    console.log(`Transaction sent! Hash: ${hash}`);
    console.log('Waiting for confirmation receipt...');

    const receipt = await client.waitForTransactionReceipt({ hash });
    
    if (receipt.status === '0x0') {
      throw new Error('Withdrawal transaction reverted.');
    }

    console.log(`\n\x1b[32mSuccess! All funds withdrawn successfully.\x1b[0m`);
  } catch (err) {
    console.error('\x1b[31mError:\x1b[0m', err.message || err);
  } finally {
    readline.close();
  }
}

main();
