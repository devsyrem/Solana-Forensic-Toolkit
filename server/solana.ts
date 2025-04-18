import { Connection, clusterApiUrl } from '@solana/web3.js';

let connection: Connection;

/**
 * Gets or creates a Solana connection using the configured endpoint.
 * If SOLANA_RPC_URL is set, it will use that endpoint. Otherwise, it uses the mainnet-beta endpoint.
 */
export function getSolanaConnection(): Connection {
  if (!connection) {
    const rpcEndpoint = process.env.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta');
    connection = new Connection(rpcEndpoint, {
      commitment: 'confirmed',
      disableRetryOnRateLimit: false,
      confirmTransactionInitialTimeout: 60000,
    });
    console.log('Initialized Solana connection to RPC endpoint');
  }
  return connection;
}

/**
 * Reset the Solana connection, forcing a new connection on the next call to getSolanaConnection()
 */
export function resetSolanaConnection(): void {
  connection = undefined as unknown as Connection;
}