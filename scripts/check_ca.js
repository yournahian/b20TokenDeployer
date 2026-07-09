const { createPublicClient, http } = require('viem');
const { baseSepolia } = require('viem/chains');

async function main() {
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http()
  });

  const address = '0x9e2c62375dd16d4b365ade47872eb8579ffec558';
  console.log(`Checking address: ${address}...`);

  try {
    const code = await client.getBytecode({ address });
    if (!code || code === '0x') {
      console.log('❌ Code does NOT exist at this address on Base Sepolia! It is an EOA or empty.');
      return;
    }
    console.log('✅ Contract bytecode exists!');
    
    // Let's call owner() and deployFee()
    const owner = await client.readContract({
      address,
      abi: [
        { type: 'function', name: 'owner', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' },
        { type: 'function', name: 'deployFee', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' }
      ],
      functionName: 'owner'
    });
    console.log(`Owner: ${owner}`);

    const fee = await client.readContract({
      address,
      abi: [
        { type: 'function', name: 'deployFee', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' }
      ],
      functionName: 'deployFee'
    });
    console.log(`Deploy Fee: ${Number(fee) / 1e18} ETH (${fee.toString()} wei)`);

  } catch (err) {
    console.error('Error querying contract:', err);
  }
}

main();
