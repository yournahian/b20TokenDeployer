/**
 * Test B20 factory with all possible encoding combinations to find the working one.
 * This creates a thorough systematic test.
 */
const { createPublicClient, http, encodeAbiParameters, getAddress, encodeFunctionData } = require('viem');
const { baseSepolia } = require('viem/chains');

const client = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') });
const CALLER = getAddress('0x546c8c7a9d3db29eb0c194da0c72631f8a717b00');
const B20_FACTORY = '0xB20f000000000000000000000000000000000000';
const FACTORY_ABI = [{ type: 'function', name: 'createB20', inputs: [
  { name: 'variant', type: 'uint8' }, { name: 'salt', type: 'bytes32' },
  { name: 'params', type: 'bytes' }, { name: 'initCalls', type: 'bytes[]' }
], outputs: [{ name: 'token', type: 'address' }], stateMutability: 'nonpayable' }];

let saltNonce = 1;

async function tryParams(label, variant, params, initCalls = []) {
  const salt = '0x' + (saltNonce++).toString(16).padStart(64, '0');
  try {
    const result = await client.request({
      method: 'eth_call',
      params: [{
        from: CALLER,
        to: B20_FACTORY,
        data: encodeFunctionData({ abi: FACTORY_ABI, functionName: 'createB20', args: [variant, salt, params, initCalls] })
      }, 'latest']
    });
    console.log('✅', label, '-> Token:', '0x' + result.slice(-40));
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
      console.log('❌', label, '->', text.trim().slice(0, 120));
    } else {
      console.log('❌', label, '->', e.message.slice(0, 80));
    }
    return false;
  }
}

async function main() {
  console.log('=== Systematic B20 encoding test ===\n');

  const name = 'T';
  const symbol = 'T';
  
  // -- ASSET variant (0) --
  // Format 1: 5-field struct with uint8 version (what B20FactoryLib uses according to interface)
  const f1 = encodeAbiParameters(
    [{ type: 'uint8' }, { type: 'string' }, { type: 'string' }, { type: 'address' }, { type: 'uint8' }],
    [1, name, symbol, CALLER, 18]
  );
  await tryParams('ASSET: 5-field (uint8 ver, str, str, addr, uint8)', 0, f1);
  await tryParams('ASSET: 5-field with decimals=6', 0,
    encodeAbiParameters(
      [{ type: 'uint8' }, { type: 'string' }, { type: 'string' }, { type: 'address' }, { type: 'uint8' }],
      [1, name, symbol, CALLER, 6]
    )
  );

  // Format 2: Raw 1-byte prefix + 4-field body
  const f2 = '0x01' + encodeAbiParameters(
    [{ type: 'string' }, { type: 'string' }, { type: 'address' }, { type: 'uint8' }],
    [name, symbol, CALLER, 18]
  ).slice(2);
  await tryParams('ASSET: 0x01 + 4-field body', 0, f2);

  // Format 3: version as full 32-byte left-padded word + 4-field body  
  const f3 = '0x' + '0000000000000000000000000000000000000000000000000000000000000001' +
    encodeAbiParameters(
      [{ type: 'string' }, { type: 'string' }, { type: 'address' }, { type: 'uint8' }],
      [name, symbol, CALLER, 18]
    ).slice(2);
  await tryParams('ASSET: version word (left-pad) + 4-field body', 0, f3);

  // Format 4: Try without version byte at all (maybe precompile handles it internally?)
  const f4 = encodeAbiParameters(
    [{ type: 'string' }, { type: 'string' }, { type: 'address' }, { type: 'uint8' }],
    [name, symbol, CALLER, 18]
  );
  await tryParams('ASSET: no version, 4-field only', 0, f4);

  // -- STABLECOIN variant (1) --
  const sc1 = encodeAbiParameters(
    [{ type: 'uint8' }, { type: 'string' }, { type: 'string' }, { type: 'address' }, { type: 'string' }],
    [1, name, symbol, CALLER, 'USD']
  );
  await tryParams('STABLECOIN: 5-field (uint8 ver, str, str, addr, str)', 1, sc1);

  // Stablecoin without version
  const sc2 = encodeAbiParameters(
    [{ type: 'string' }, { type: 'string' }, { type: 'address' }, { type: 'string' }],
    [name, symbol, CALLER, 'USD']
  );
  await tryParams('STABLECOIN: no version, 4-field', 1, sc2);
  await tryParams('STABLECOIN: 0x01 + 4-field', 1, '0x01' + sc2.slice(2));

  console.log('\nDone.');
}

main().catch(console.error);
