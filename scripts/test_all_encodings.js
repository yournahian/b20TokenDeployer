const { createPublicClient, http, encodeAbiParameters, getAddress, encodeFunctionData } = require('viem');
const { baseSepolia } = require('viem/chains');

const client = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') });
const CALLER = getAddress('0x546c8c7a9d3db29eb0c194da0c72631f8a717b00');
const B20_FACTORY = '0xB20f000000000000000000000000000000000000';
const FACTORY_ABI = [{ type: 'function', name: 'createB20', inputs: [
  { name: 'variant', type: 'uint8' }, { name: 'salt', type: 'bytes32' },
  { name: 'params', type: 'bytes' }, { name: 'initCalls', type: 'bytes[]' }
], outputs: [{ name: 'token', type: 'address' }], stateMutability: 'nonpayable' }];

async function tryParams(label, params) {
  try {
    const result = await client.request({
      method: 'eth_call',
      params: [{
        from: CALLER,
        to: B20_FACTORY,
        data: encodeFunctionData({
          abi: FACTORY_ABI,
          functionName: 'createB20',
          args: [0, '0x' + 'ab'.repeat(32), params, []]
        })
      }, 'latest']
    });
    console.log(label, '-> SUCCESS! Token:', '0x' + result.slice(-40));
    return true;
  } catch(e) {
    const raw = e.data || (e.cause && e.cause.data) || '';
    if (raw) {
      const hex = raw.startsWith('0x') ? raw.slice(2) : raw;
      let text = '';
      for (let i = 8; i < Math.min(hex.length, 400); i += 2) {
        const c = parseInt(hex.slice(i, i + 2), 16);
        text += (c >= 32 && c <= 126) ? String.fromCharCode(c) : '.';
      }
      console.log(label, '-> REVERT:', text.trim().slice(0, 200));
    } else {
      console.log(label, '-> REVERT:', e.message.slice(0, 100));
    }
    return false;
  }
}

async function main() {
  // Check B20 factory code
  const code = await client.getBytecode({ address: B20_FACTORY });
  console.log('B20 Factory bytecode length:', code ? (code.length - 2) / 2 : 0, 'bytes\n');

  // Test A: version as uint8 slot + 4-field body (most likely correct based on source)
  const fourField = encodeAbiParameters(
    [{ type: 'string' }, { type: 'string' }, { type: 'address' }, { type: 'uint8' }],
    ['T', 'T', CALLER, 18]
  );
  const paramsA = '0x' + '0000000000000000000000000000000000000000000000000000000000000001' + fourField.slice(2);
  await tryParams('A: uint8 version word + 4-field body', paramsA);

  // Test B: short 1-char strings with raw 1-byte prefix (257-33=224 bytes)
  const paramsB = '0x01' + encodeAbiParameters(
    [{ type: 'string' }, { type: 'string' }, { type: 'address' }, { type: 'uint8' }],
    ['T', 'T', CALLER, 18]
  ).slice(2);
  await tryParams('B: raw 0x01 prefix + 4-field body', paramsB);

  // Test C: Same as B20FactoryLib - abi.encode with uint8 version as 5-field struct
  const paramsC = encodeAbiParameters(
    [{ type: 'uint8' }, { type: 'string' }, { type: 'string' }, { type: 'address' }, { type: 'uint8' }],
    [1, 'T', 'T', CALLER, 18]
  );
  await tryParams('C: 5-field struct (version+name+symbol+admin+decimals)', paramsC);

  // Test D: Just check what happens with decimals out of range
  const paramsD = encodeAbiParameters(
    [{ type: 'uint8' }, { type: 'string' }, { type: 'string' }, { type: 'address' }, { type: 'uint8' }],
    [1, 'T', 'T', CALLER, 6]  // decimals=6, minimum allowed
  );
  await tryParams('D: 5-field struct with decimals=6 (minimum)', paramsD);
}

main().catch(console.error);
