import { Connection, clusterApiUrl } from '@solana/web3.js';

let connection: Connection;

/**
 * Gets or creates a Solana connection using the configured endpoint.
 * We're now using the default mainnet-beta endpoint since the custom endpoint was having issues.
 */
export function getSolanaConnection(): Connection {
  if (!connection) {
    // Force using the default mainnet-beta endpoint
    const rpcEndpoint = clusterApiUrl('mainnet-beta');
    connection = new Connection(rpcEndpoint, {
      commitment: 'confirmed',
      disableRetryOnRateLimit: false,
      confirmTransactionInitialTimeout: 60000,
    });
    console.log('Initialized Solana connection to default mainnet RPC endpoint');
  }
  return connection;
}

/**
 * Reset the Solana connection, forcing a new connection on the next call to getSolanaConnection()
 */
export function resetSolanaConnection(): void {
  connection = undefined as unknown as Connection;
}