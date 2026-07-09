/**
 * Simulate a createB20 call directly to the B20 Factory precompile on Base Sepolia
 * to get the exact revert reason from the precompile.
 */
const { createPublicClient, http, encodeAbiParameters, encodeFunctionData, getAddress, keccak256, toBytes } = require('viem');
const { baseSepolia } = require('viem/chains');

const client = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org')
});

const B20_FACTORY = '0xB20f000000000000000000000000000000000000';
const CALLER = '0x546c8c7a9d3db29eb0c194da0c72631f8a717b00';

const B20_FACTORY_ABI = [{
  type: 'function',
  name: 'createB20',
  inputs: [
    { name: 'variant', type: 'uint8' },
    { name: 'salt', type: 'bytes32' },
    { name: 'params', type: 'bytes' },
    { name: 'initCalls', type: 'bytes[]' }
  ],
  outputs: [{ name: 'token', type: 'address' }],
  stateMutability: 'nonpayable'
}];

const MINT_ROLE = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6';
const GRANT_ROLE_ABI = [{
  type: 'function',
  name: 'grantRole',
  inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }],
  outputs: [],
  stateMutability: 'nonpayable'
}];

async function main() {
  const salt = '0x' + 'ab'.repeat(32);
  const checksumCaller = getAddress(CALLER);

  // Build params: version byte 0x01 + ABI-encoded struct
  const encodedParams = encodeAbiParameters(
    [
      { name: 'name', type: 'string' },
      { name: 'symbol', type: 'string' },
      { name: 'admin', type: 'address' },
      { name: 'decimals', type: 'uint8' }
    ],
    ['TestToken', 'TTK', checksumCaller, 18]
  );
  const params = ('0x01' + encodedParams.slice(2));

  console.log('params length (bytes):', (params.length - 2) / 2);
  console.log('params version byte:', params.slice(2, 4));
  console.log('params ABI word 0 (name offset):', parseInt(params.slice(4, 68), 16), '(should be 128)');

  // Build initCalls (empty first, then with grantRole)
  const initCalls = [];

  console.log('\n--- Test 1: Direct call to B20 Factory (no initCalls) ---');
  try {
    const result = await client.simulateContract({
      address: B20_FACTORY,
      abi: B20_FACTORY_ABI,
      functionName: 'createB20',
      args: [0, salt, params, initCalls],
      account: checksumCaller
    });
    console.log('SUCCESS! Token address:', result.result);
  } catch(e) {
    console.log('REVERTED:', e.message.slice(0, 500));
    if (e.data) console.log('Raw revert data:', e.data);
  }

  // Try calling via wrapper (simulate)
  console.log('\n--- Test 2: Call via wrapper ---');
  const WRAPPER_ABI = [{
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
  }];
  
  try {
    const result = await client.simulateContract({
      address: '0x9e2c62375dd16d4b365ade47872eb8579ffec558',
      abi: WRAPPER_ABI,
      functionName: 'deployB20Token',
      args: [0, salt, params, initCalls],
      account: checksumCaller,
      value: 40000000000000n
    });
    console.log('SUCCESS! Token address:', result.result);
  } catch(e) {
    console.log('REVERTED:', e.message.slice(0, 500));
    if (e.data) console.log('Raw revert data:', e.data);
  }
}

main().catch(console.error);
