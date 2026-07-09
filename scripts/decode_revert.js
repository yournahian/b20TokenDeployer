const raw = '0x62975e6a7479706520636865636b206661696c656420666f7220226f666673657420287573697a652922207769746820646174613a2038303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030';

const hex = raw.slice(2);
let result = '';
for (let i = 0; i < hex.length; i += 2) {
  const code = parseInt(hex.slice(i, i + 2), 16);
  if (code >= 32 && code <= 126) {
    result += String.fromCharCode(code);
  } else {
    result += `[${code.toString(16).padStart(2, '0')}]`;
  }
}
console.log('Decoded message:', result);
