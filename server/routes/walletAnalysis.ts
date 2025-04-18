import { Router, Request, Response } from 'express';
import { Connection, PublicKey } from '@solana/web3.js';
import { z } from 'zod';
import { getSolanaConnection } from '../solana';

const router = Router();

// Validation schema for analyze wallet request
const analyzeWalletSchema = z.object({
  address: z.string().min(32).max(44),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
});

/**
 * Route to get wallet analysis data
 * This includes funding sources, activity patterns, and connection analysis
 */
router.get('/:address', async (req: Request, res: Response) => {
  try {
    const address = req.params.address;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    
    // Validate input
    if (!address || address.length < 32) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    // Connect to Solana
    const connection = getSolanaConnection();
    
    // Validate the address
    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(address);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid Solana address format' });
    }
    
    // Get transaction signatures
    const signatures = await connection.getSignaturesForAddress(publicKey, { limit });
    
    if (!signatures || signatures.length === 0) {
      return res.json({
        address,
        fundingSources: [],
        activityPatterns: [],
        totalInflow: 0,
        totalOutflow: 0,
        riskScore: 0,
        analysisTimestamp: Date.now()
      });
    }
    
    // Get transaction details
    const transactions = await Promise.all(
      signatures.map(sig => connection.getTransaction(sig.signature, { maxSupportedTransactionVersion: 0 }))
    );
    
    // Filter out null transactions
    const validTransactions = transactions.filter(tx => tx !== null);
    
    // Format transactions for processing - handle errors more gracefully
    let formattedTransactions = [];
    // Check if we have valid transactions before trying to process them
    if (validTransactions && validTransactions.length > 0) {
      try {
        formattedTransactions = validTransactions.map(tx => {
          // Use getAccountKeys() for versioned transactions
          const accountKeys = tx!.transaction.message.staticAccountKeys || 
                              tx!.transaction.message.getAccountKeys?.().keySegments().flat() || [];
          
          // Handle instructions for both legacy and versioned transactions
          const instructions = 'instructions' in tx!.transaction.message ?
            tx!.transaction.message.instructions :
            [];
            
          return {
            signature: tx!.transaction.signatures[0],
            blockTime: tx!.blockTime,
            slot: tx!.slot,
            accountKeys: accountKeys.map(key => key.toString()),
            instructions: instructions.map(ix => ({
              programId: accountKeys[ix.programIdIndex].toString(),
              accounts: ix.accounts.map(idx => accountKeys[idx].toString()),
              data: ix.data
            })),
            logMessages: tx!.meta?.logMessages || []
          };
        });
      } catch (error) {
        console.error('Error processing transactions:', error);
        // Continue with empty transactions rather than failing
      }
    }
    
    // In a real implementation, we would use the walletAnalysisService to analyze the transactions
    // For now, we'll return a placeholder response with realistic data structure
    
    const response = {
      address,
      fundingSources: [
        {
          address: formattedTransactions[0]?.accountKeys[1] || "unknown",
          initialTransactionSignature: formattedTransactions[0]?.signature || "unknown",
          initialTransactionTimestamp: formattedTransactions[0]?.blockTime ? formattedTransactions[0].blockTime * 1000 : Date.now(),
          totalAmount: Math.random() * 100,
          lastSeen: Date.now(),
          frequency: Math.floor(Math.random() * 10),
          confidence: 85
        }
      ],
      activityPatterns: [
        {
          type: 'temporal',
          name: 'Regular Time Activity',
          description: 'Transactions consistently occur during specific hours',
          frequency: Math.floor(Math.random() * 20),
          risk: 20,
          confidence: 70,
          examples: formattedTransactions.slice(0, 3).map(tx => tx.signature),
          firstSeen: formattedTransactions[0]?.blockTime ? formattedTransactions[0].blockTime * 1000 : Date.now(),
          lastSeen: formattedTransactions[formattedTransactions.length - 1]?.blockTime 
            ? formattedTransactions[formattedTransactions.length - 1].blockTime * 1000 
            : Date.now()
        }
      ],
      totalInflow: Math.random() * 500,
      totalOutflow: Math.random() * 400,
      primaryActivity: 'transfer',
      riskScore: Math.floor(Math.random() * 40),
      analysisTimestamp: Date.now()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error in wallet analysis:', error);
    res.status(500).json({ error: 'Failed to analyze wallet' });
  }
});

/**
 * Route to get funding source details
 */
router.get('/:address/funding-sources', async (req: Request, res: Response) => {
  try {
    const address = req.params.address;
    
    // Validate input
    if (!address || address.length < 32) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    // In a real implementation, we would fetch detailed funding source data
    // For now, return a placeholder response
    res.json({
      address,
      fundingSources: [
        {
          address: '9XyR3q3XnXPApcHEa3kV7RER2WLjQVFKEKPB4CwGTZdP',
          label: 'Exchange Deposit',
          initialTransactionSignature: '5JFKbLUiaGsPcj87DkiGHHUGYqGrN3vpxdp93g3UGrvH3NvT7TcthZFTXS3aRGNjFiNVQiCTSvgQQu1wG9nVdFn9',
          initialTransactionTimestamp: Date.now() - 3600000 * 24 * 5,
          totalAmount: 125.78,
          lastSeen: Date.now() - 3600000 * 24 * 2,
          frequency: 3,
          confidence: 90
        },
        {
          address: '2JvPg2Kw1bGEk8GpK7yBYeGQ5o2thd4XKXj87XJQ9vUV',
          initialTransactionSignature: '2HLxJXSBnM1JSgAZFEsAdAKzqBfYH5LtUfxQtDMEtvpdj6EhxjCjTRvKkZRDXrMZ6erSPYdJRWXWN3Pcm7cC6dap',
          initialTransactionTimestamp: Date.now() - 3600000 * 24 * 10,
          totalAmount: 45.62,
          lastSeen: Date.now() - 3600000 * 24 * 3,
          frequency: 2,
          confidence: 75
        }
      ]
    });
  } catch (error) {
    console.error('Error getting funding sources:', error);
    res.status(500).json({ error: 'Failed to retrieve funding sources' });
  }
});

/**
 * Route to get activity patterns
 */
router.get('/:address/activity-patterns', async (req: Request, res: Response) => {
  try {
    const address = req.params.address;
    
    // Validate input
    if (!address || address.length < 32) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    // In a real implementation, we would fetch detailed activity pattern data
    // For now, return a placeholder response
    res.json({
      address,
      activityPatterns: [
        {
          type: 'temporal',
          name: 'Regular Time Activity',
          description: 'Transactions consistently occur between 8-10 PM UTC',
          frequency: 12,
          risk: 20,
          confidence: 85,
          examples: [
            '5JFKbLUiaGsPcj87DkiGHHUGYqGrN3vpxdp93g3UGrvH3NvT7TcthZFTXS3aRGNjFiNVQiCTSvgQQu1wG9nVdFn9',
            '2HLxJXSBnM1JSgAZFEsAdAKzqBfYH5LtUfxQtDMEtvpdj6EhxjCjTRvKkZRDXrMZ6erSPYdJRWXWN3Pcm7cC6dap'
          ],
          firstSeen: Date.now() - 3600000 * 24 * 10,
          lastSeen: Date.now() - 3600000 * 24 * 1
        },
        {
          type: 'value',
          name: 'Repeated Transaction Amount',
          description: '5 transactions with identical value of 10 SOL',
          frequency: 5,
          risk: 30,
          confidence: 90,
          examples: [
            '3uivJfQ4pzxRAhBEwgFcrZSFuJTgZhwgRxGZCNKnVVgQJJtx8ARMuA6BZpRAjmYsUpfxQEQqwKNZ6FvVQwJVyY3e'
          ],
          firstSeen: Date.now() - 3600000 * 24 * 5,
          lastSeen: Date.now() - 3600000 * 24 * 1
        },
        {
          type: 'behavior',
          name: 'Fund Dispersion Pattern',
          description: '3 instances of receiving funds and quickly dispersing to multiple addresses',
          frequency: 3,
          risk: 70,
          confidence: 80,
          examples: [
            '5w5HtfZ5Zo4TVS2SBXDSXuatmRQJ5Bq6mSKHJ3JWqMBTLufiJazw5g6H4r8mBJ2krBLrpwwRkLQrqPuGR7FjDVX7'
          ],
          firstSeen: Date.now() - 3600000 * 24 * 3,
          lastSeen: Date.now() - 3600000 * 24 * 1
        }
      ]
    });
  } catch (error) {
    console.error('Error getting activity patterns:', error);
    res.status(500).json({ error: 'Failed to retrieve activity patterns' });
  }
});

export default router;