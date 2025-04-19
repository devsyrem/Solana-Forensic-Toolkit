import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';

let connection: Connection;
const RATE_LIMIT_RETRIES = 5;
const MAX_BATCH_SIZE = 5; // Maximum number of transactions to fetch in parallel

/**
 * Gets or creates a Solana connection using the configured endpoint.
 * We're now using the default mainnet-beta endpoint since the custom endpoint was having issues.
 */
export function getSolanaConnection(): Connection {
  if (!connection) {
    // Force using the default mainnet-beta endpoint
    const rpcEndpoint = process.env.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta');
    connection = new Connection(rpcEndpoint, {
      commitment: 'confirmed',
      disableRetryOnRateLimit: false, // Let the connection handle rate limits
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

/**
 * Fetch transaction signatures with retry logic for rate limiting
 */
export async function getSignaturesForAddress(
  address: PublicKey,
  options: { limit?: number; before?: string } = {}
): Promise<any[]> {
  const conn = getSolanaConnection();
  let retries = 0;
  
  while (retries < RATE_LIMIT_RETRIES) {
    try {
      const signatures = await conn.getSignaturesForAddress(address, options);
      return signatures;
    } catch (error: any) {
      // Check if it's a rate limit error
      if (error.message?.includes('429') || error.message?.includes('Too many requests')) {
        retries++;
        console.log(`Rate limited when fetching signatures, retry ${retries}/${RATE_LIMIT_RETRIES}`);
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retries), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Not a rate limit error, rethrow
        throw error;
      }
    }
  }
  
  throw new Error('Failed to fetch signatures after multiple retries due to rate limiting');
}

/**
 * Fetch transaction details in batches with retry logic for rate limiting
 */
export async function getTransactionsInBatches(signatures: string[]): Promise<any[]> {
  const conn = getSolanaConnection();
  const results: any[] = [];
  
  // Process in small batches to avoid overloading the RPC endpoint
  for (let i = 0; i < signatures.length; i += MAX_BATCH_SIZE) {
    const batch = signatures.slice(i, i + MAX_BATCH_SIZE);
    
    // Process each transaction in batch with retries
    const batchResults = await Promise.all(
      batch.map(async (signature) => {
        let retries = 0;
        
        while (retries < RATE_LIMIT_RETRIES) {
          try {
            const tx = await conn.getTransaction(signature, {
              maxSupportedTransactionVersion: 0,
            });
            return { signature, transaction: tx };
          } catch (error: any) {
            // Check if it's a rate limit error
            if (error.message?.includes('429') || error.message?.includes('Too many requests')) {
              retries++;
              console.log(`Rate limited when fetching transaction ${signature}, retry ${retries}/${RATE_LIMIT_RETRIES}`);
              
              // Exponential backoff
              const delay = Math.min(1000 * Math.pow(2, retries), 10000);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              // Not a rate limit error, return null
              console.log(`Error fetching transaction ${signature}: ${error.message}`);
              return { signature, transaction: null, error: error.message };
            }
          }
        }
        
        return { signature, transaction: null, error: 'Rate limited too many times' };
      })
    );
    
    results.push(...batchResults);
    
    // Add a small delay between batches to avoid rate limiting
    if (i + MAX_BATCH_SIZE < signatures.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}