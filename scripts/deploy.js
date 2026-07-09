const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { createWalletClient, http, publicActions, defineChain } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { baseSepolia, base } = require('viem/chains');

// Define Vibenet as a custom chain
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

async function main() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => readline.question(query, resolve));

  try {
    console.log('--- B20Deployer Solidity Compiler ---');
    console.log('Compiling contracts/B20Deployer.sol...');

    const sourcePath = path.join(__dirname, '../contracts/B20Deployer.sol');
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Solidity source file not found at ${sourcePath}`);
    }

    const source = fs.readFileSync(sourcePath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: {
        'B20Deployer.sol': {
          content: source
        }
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode']
          }
        },
        optimizer: {
          enabled: false,
          runs: 200
        }
      }
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    if (output.errors) {
      output.errors.forEach(err => {
        if (err.severity === 'error') {
          console.error(`\x1b[31mError:\x1b[0m ${err.formattedMessage}`);
        } else {
          console.warn(`\x1b[33mWarning:\x1b[0m ${err.formattedMessage}`);
        }
      });
      if (output.errors.some(err => err.severity === 'error')) {
        process.exit(1);
      }
    }

    const compiledContract = output.contracts['B20Deployer.sol']['B20Deployer'];
    const abi = compiledContract.abi;
    const bytecode = compiledContract.evm.bytecode.object;

    console.log('Compilation successful!');

    console.log('\n--- Network Selection ---');
    console.log('1. Base Sepolia (Testnet)');
    console.log('2. Base Vibenet (Testnet)');
    console.log('3. Base (Mainnet)');
    const netChoice = await question('Select network (1-3): ');
    
    let chain = baseSepolia;
    if (netChoice === '2') chain = baseVibenet;
    if (netChoice === '3') chain = base;

    console.log(`Using Network: ${chain.name}`);

    const pkey = await question('\nEnter your deployment Private Key (starts with 0x): ');
    if (!pkey.startsWith('0x') || pkey.length !== 66) {
      throw new Error('Invalid private key. Must be a 66-character hex string starting with 0x.');
    }

    const account = privateKeyToAccount(pkey);
    console.log(`Deployer address: ${account.address}`);

    const feeVal = 40000000000000n; // 0.00004 ETH in wei
    console.log(`Setting deployFee constructor argument to: 0.00004 ETH (${feeVal.toString()} wei)`);

    console.log('\nDeploying contract...');
    const client = createWalletClient({
      account,
      chain,
      transport: http()
    }).extend(publicActions);

    const hash = await client.deployContract({
      abi,
      bytecode: `0x${bytecode}`,
      args: [feeVal]
    });

    console.log(`Transaction sent! Hash: ${hash}`);
    console.log('Waiting for confirmation receipt...');

    const receipt = await client.waitForTransactionReceipt({ hash });
    console.log(`\n\x1b[32mContract deployed successfully!\x1b[0m`);
    console.log(`Contract Address: \x1b[36m${receipt.contractAddress}\x1b[0m`);
    console.log(`\nCopy the address above and set export const B20_DEPLOYER_CONTRACT_ADDRESS = '${receipt.contractAddress}' inside lib/b20.ts`);
  } catch (err) {
    console.error('Error:', err.message || err);
  } finally {
    readline.close();
  }
}

main();
