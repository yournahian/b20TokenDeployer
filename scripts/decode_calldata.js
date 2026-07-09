// Decode the raw calldata from the failed tx to understand exactly what params was sent
const data = '0xc6d5523c0000000000000000000000000000000000000000000000000000000000000000faae74a8ac243d31093f485dfbeb95d68697b865e1d5910216d86ca9249e54ae000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000000000000000000000000000000000000000010101000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000546c8c7a9d3db29eb0c194da0c72631f8a717b0000000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000012566572696669636174696f6e20546f6b656e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000456544f4b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000442f2ff15d9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6000000000000000000000000546c8c7a9d3db29eb0c194da0c72631f8a717b0000000000000000000000000000000000000000000000000000000000';

// Skip the 4-byte selector
const body = data.slice(10);

// Each 32-byte word = 64 hex chars
function word(offset) {
  const start = offset * 64;
  return body.slice(start, start + 64);
}

console.log('=== Outer deployB20Token ABI decoding ===');
console.log('variant    (word 0):', BigInt('0x' + word(0)).toString());
console.log('salt       (word 1):', word(1));
console.log('params_off (word 2):', BigInt('0x' + word(2)).toString(), '→ offset in body');
console.log('initCalls_off(word3):', BigInt('0x' + word(3)).toString(), '→ offset in body');

// params starts at body offset 0x80 = 128 bytes = 4 words from start of body
const paramsOffsetBytes = Number(BigInt('0x' + word(2)));
const paramsStart = paramsOffsetBytes / 4 * 2; // convert to hex chars position
const paramsLenHex = body.slice(paramsStart, paramsStart + 64);
const paramsLen = Number(BigInt('0x' + paramsLenHex));
console.log('\n=== params field (at body offset', paramsOffsetBytes, ') ===');
console.log('params length:', paramsLen, 'bytes (0x' + paramsLen.toString(16) + ')');

// The raw params bytes (the actual payload sent to B20 factory)
const paramsHex = body.slice(paramsStart + 64, paramsStart + 64 + paramsLen * 2);
console.log('\n=== Raw params bytes (what B20 Factory sees) ===');
console.log('Version byte (byte 0):', paramsHex.slice(0, 2));
console.log('ABI word 0 (bytes 1-32, offset to name):', paramsHex.slice(2, 66));
console.log('ABI word 0 as number:', BigInt('0x' + paramsHex.slice(2, 66)).toString());
console.log('ABI word 1 (bytes 33-64, offset to symbol):', paramsHex.slice(66, 130));
console.log('\nFull params hex:');
console.log('0x' + paramsHex);

// Try to decode the ABI body (after version byte)
const abiBody = paramsHex.slice(2); // skip version byte
console.log('\n=== ABI body (after version byte) ===');
console.log('name offset  (word 0):', BigInt('0x' + abiBody.slice(0, 64)).toString());
console.log('sym offset   (word 1):', BigInt('0x' + abiBody.slice(64, 128)).toString());
console.log('admin addr   (word 2):', '0x' + abiBody.slice(128, 192).slice(24));
console.log('decimals     (word 3):', BigInt('0x' + abiBody.slice(192, 256)).toString());

// name: offset is relative to start of ABI body
const nameOffset = Number(BigInt('0x' + abiBody.slice(0, 64)));
const namePos = nameOffset * 2;
const nameLen = Number(BigInt('0x' + abiBody.slice(namePos, namePos + 64)));
const nameHex = abiBody.slice(namePos + 64, namePos + 64 + nameLen * 2);
console.log('\nname length:', nameLen);
console.log('name text:', Buffer.from(nameHex, 'hex').toString('utf8'));
