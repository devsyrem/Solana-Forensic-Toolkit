import fetch from 'node-fetch';
import { log } from '../vite';

const SOLSCAN_API_BASE = 'https://public-api.solscan.io/v1';
const SOLSCAN_API_KEY = process.env.SOLSCAN_API_KEY;
const FETCH_TIMEOUT = 10000; // 10 seconds timeout

// Custom timeout utility for node-fetch v2
const fetchWithTimeout = (url: string, options: RequestInit) => {
  return new Promise<Response>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Request timed out for URL: ${url}`));
    }, FETCH_TIMEOUT);
    
    fetch(url, options)
      .then(response => {
        clearTimeout(timeout);
        resolve(response);
      })
      .catch(error => {
        clearTimeout(timeout);
        reject(error);
      });
  });
};

// Function to fetch account information from Solscan
export async function getAccountInfo(address: string) {
  try {
    // Build URL with query parameters
    const url = new URL(`${SOLSCAN_API_BASE}/account`);
    url.searchParams.append('address', address);

    const response = await fetchWithTimeout(url.toString(), {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'token': SOLSCAN_API_KEY || '',
        'user-agent': 'SolFlow Analytics App'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Solscan API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error: any) {
    log(`Error fetching account info from Solscan: ${error.message}`, 'solscan');
    throw error;
  }
}

// Function to fetch transaction signatures for an address
export async function getTransactionSignatures(address: string, limit: number = 10, before?: string) {
  try {
    // Build URL with query parameters
    const url = new URL(`${SOLSCAN_API_BASE}/account/transactions`);
    url.searchParams.append('address', address);
    url.searchParams.append('limit', limit.toString());
    
    if (before) {
      url.searchParams.append('beforeSignature', before);
    }

    const response = await fetchWithTimeout(url.toString(), {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'token': SOLSCAN_API_KEY || '',
        'user-agent': 'SolFlow Analytics App'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Solscan API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error: any) {
    log(`Error fetching transaction signatures from Solscan: ${error.message}`, 'solscan');
    throw error;
  }
}

// Function to fetch transaction details
export async function getTransactionDetails(signature: string) {
  try {
    // Build URL with query parameters
    const url = new URL(`${SOLSCAN_API_BASE}/transaction`);
    url.searchParams.append('signature', signature);

    const response = await fetchWithTimeout(url.toString(), {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'token': SOLSCAN_API_KEY || '',
        'user-agent': 'SolFlow Analytics App'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Solscan API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error: any) {
    log(`Error fetching transaction details from Solscan: ${error.message}`, 'solscan');
    throw error;
  }
}

// Function to fetch token holdings
export async function getTokenHoldings(address: string) {
  try {
    // Build URL with query parameters
    const url = new URL(`${SOLSCAN_API_BASE}/account/tokens`);
    url.searchParams.append('address', address);

    const response = await fetchWithTimeout(url.toString(), {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'token': SOLSCAN_API_KEY || '',
        'user-agent': 'SolFlow Analytics App'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Solscan API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error: any) {
    log(`Error fetching token holdings from Solscan: ${error.message}`, 'solscan');
    throw error;
  }
}

// Function to check if Solscan API is available with our key
export async function checkSolscanApiStatus() {
  try {
    // Try to get a known account as a test
    const testAddress = 'So11111111111111111111111111111111111111112'; // SOL token address
    
    // Build URL with query parameters
    const url = new URL(`${SOLSCAN_API_BASE}/account`);
    url.searchParams.append('address', testAddress);

    const response = await fetchWithTimeout(url.toString(), {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'token': SOLSCAN_API_KEY || '',
        'user-agent': 'SolFlow Analytics App'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      const errorText = await response.text();
      log(`Solscan API check failed: ${errorText}`, 'solscan');
      return {
        status: 'error',
        message: `API returned status ${response.status}`,
        hasValidKey: false
      };
    }

    const data = await response.json();
    const hasValidKey = !data.message || data.message !== 'Invalid token provided';

    return {
      status: 'ok',
      hasValidKey,
      apiVersion: 'v1'
    };
  } catch (error: any) {
    log(`Error checking Solscan API status: ${error.message}`, 'solscan');
    return {
      status: 'error',
      message: error.message,
      hasValidKey: false
    };
  }
}

// Format Solscan transaction data to standard format for our application
export function formatSolscanTransaction(txData: any) {
  if (!txData) return null;

  try {
    return {
      signature: txData.txHash,
      blockTime: txData.blockTime,
      slot: txData.slot,
      fee: txData.fee || 0,
      status: txData.status === 'Success' ? 'success' : 'failed',
      instructions: (txData.parsedInstruction || []).map((ix: any) => ({
        programId: ix.programId || '',
        accounts: ix.accounts || [],
        data: ix.data || ''
      })),
      accountKeys: txData.accounts || []
    };
  } catch (error: any) {
    log(`Error formatting Solscan transaction: ${error.message}`, 'solscan');
    return null;
  }
}

// Get all transaction details for an address (fetches signatures then details)
export async function getAllTransactionsForAddress(address: string, limit: number = 10) {
  try {
    // First get signatures
    const signaturesData = await getTransactionSignatures(address, limit);
    
    if (!signaturesData || !Array.isArray(signaturesData)) {
      throw new Error('Invalid response from Solscan API when fetching signatures');
    }
    
    // Extract signatures
    const signatures = signaturesData.map((tx: any) => tx.txHash);

    // Fetch details for each signature
    const transactions = await Promise.all(
      signatures.map(async (signature) => {
        try {
          const txData = await getTransactionDetails(signature);
          return formatSolscanTransaction(txData);
        } catch (error: any) {
          log(`Error fetching details for tx ${signature}: ${error.message}`, 'solscan');
          return null;
        }
      })
    );

    // Filter out failed transactions
    return transactions.filter(tx => tx !== null);
  } catch (error: any) {
    log(`Error in getAllTransactionsForAddress: ${error.message}`, 'solscan');
    throw error;
  }
}