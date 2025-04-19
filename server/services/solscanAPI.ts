import fetch from 'node-fetch';
import { log } from '../vite';

const SOLSCAN_API_BASE = 'https://api.solscan.io/v1';
const SOLSCAN_API_KEY = process.env.SOLSCAN_API_KEY;

// Function to fetch account information from Solscan
export async function getAccountInfo(address: string) {
  try {
    const response = await fetch(`${SOLSCAN_API_BASE}/account/${address}`, {
      headers: {
        'accept': 'application/json',
        'token': SOLSCAN_API_KEY || ''
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Solscan API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    log(`Error fetching account info from Solscan: ${error.message}`, 'solscan');
    throw error;
  }
}

// Function to fetch transaction signatures for an address
export async function getTransactionSignatures(address: string, limit: number = 10, before?: string) {
  try {
    let url = `${SOLSCAN_API_BASE}/account/transactions?account=${address}&limit=${limit}`;
    if (before) {
      url += `&beforeHash=${before}`;
    }

    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'token': SOLSCAN_API_KEY || ''
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Solscan API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    log(`Error fetching transaction signatures from Solscan: ${error.message}`, 'solscan');
    throw error;
  }
}

// Function to fetch transaction details
export async function getTransactionDetails(signature: string) {
  try {
    const response = await fetch(`${SOLSCAN_API_BASE}/transaction/${signature}`, {
      headers: {
        'accept': 'application/json',
        'token': SOLSCAN_API_KEY || ''
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Solscan API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    log(`Error fetching transaction details from Solscan: ${error.message}`, 'solscan');
    throw error;
  }
}

// Function to fetch token holdings
export async function getTokenHoldings(address: string) {
  try {
    const response = await fetch(`${SOLSCAN_API_BASE}/account/tokens?account=${address}`, {
      headers: {
        'accept': 'application/json',
        'token': SOLSCAN_API_KEY || ''
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Solscan API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    log(`Error fetching token holdings from Solscan: ${error.message}`, 'solscan');
    throw error;
  }
}

// Function to check if Solscan API is available with our key
export async function checkSolscanApiStatus() {
  try {
    // Try to get a known account as a test
    const testAddress = 'So11111111111111111111111111111111111111112'; // SOL token address
    const response = await fetch(`${SOLSCAN_API_BASE}/account/${testAddress}`, {
      headers: {
        'accept': 'application/json',
        'token': SOLSCAN_API_KEY || ''
      }
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
      hasValidKey
    };
  } catch (error) {
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
  } catch (error) {
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
        } catch (error) {
          log(`Error fetching details for tx ${signature}: ${error.message}`, 'solscan');
          return null;
        }
      })
    );

    // Filter out failed transactions
    return transactions.filter(tx => tx !== null);
  } catch (error) {
    log(`Error in getAllTransactionsForAddress: ${error.message}`, 'solscan');
    throw error;
  }
}