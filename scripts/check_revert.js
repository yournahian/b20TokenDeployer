/**
 * Fetches the most recent transaction to the B20Deployer wrapper contract on Base Sepolia
 * and decodes the revert reason.
 */
const { createPublicClient, http, decodeFunctionData, decodeErrorResult } = require('viem');
const { baseSepolia } = require('viem/chains');

const WRAPPER = '0x9e2c62375dd16d4b365ade47872eb8579ffec558';
const B20_FACTORY = '0xB20f000000000000000000000000000000000000';

const client = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org')
});

async function main() {
  // Get recent blocks
  const latestBlock = await client.getBlockNumber();
  console.log('Latest block:', latestBlock.toString());

  // Search last 100 blocks for txs to our wrapper
  const fromBlock = latestBlock - 100n;
  console.log('Searching from block', fromBlock.toString(), 'to', latestBlock.toString());

  for (let b = latestBlock; b >= fromBlock; b--) {
    const block = await client.getBlock({ blockNumber: b, includeTransactions: true });
    const txsToWrapper = block.transactions.filter(
      tx => tx.to && tx.to.toLowerCase() === WRAPPER.toLowerCase()
    );

    if (txsToWrapper.length > 0) {
      for (const tx of txsToWrapper) {
        console.log('\n=== Found tx:', tx.hash);
        console.log('Block:', tx.blockNumber?.toString());
        console.log('From:', tx.from);
        console.log('Value:', tx.value?.toString(), 'wei');

        const receipt = await client.getTransactionReceipt({ hash: tx.hash });
        console.log('Status:', receipt.status);

        if (receipt.status === 'reverted') {
          // Simulate to get revert reason
          try {
            await client.call({
              to: WRAPPER,
              data: tx.input,
              value: tx.value,
              from: tx.from,
              blockNumber: tx.blockNumber - 1n
            });
          } catch (err) {
            console.log('\nRevert reason:', err.message);
            if (err.data) {
              console.log('Raw revert data:', err.data);
              // Try to decode as Error(string)
              try {
                const hex = err.data.slice(10); // remove 0x08c379a0 selector
                const buf = Buffer.from(hex, 'hex');
                // offset, length, string
                const len = parseInt(buf.slice(32, 64).toString('hex'), 16);
                const msg = buf.slice(64, 64 + len).toString('utf8');
                console.log('Decoded error string:', msg);
              } catch {}
            }
          }
        }
      }
    }
  }
}

main().catch(console.error);
