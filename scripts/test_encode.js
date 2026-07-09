const { encodeAbiParameters } = require('viem');

const caller = '0xD914E6078c43E0A6228Eef39a417EDF37a8F182B';

const encodedParams = encodeAbiParameters(
  [
    { name: 'name', type: 'string' },
    { name: 'symbol', type: 'string' },
    { name: 'admin', type: 'address' },
    { name: 'decimals', type: 'uint8' }
  ],
  ['Test Token', 'TTK', caller, 18]
);

console.log('encodedParams (length =', (encodedParams.length - 2) / 2, 'bytes):');
console.log(encodedParams);

const params = ('0x00' + encodedParams.slice(2));
console.log('\nparams (length =', (params.length - 2) / 2, 'bytes):');
console.log(params);
