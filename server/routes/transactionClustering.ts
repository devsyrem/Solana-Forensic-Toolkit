import { Router, Request, Response } from 'express';
import { Connection, PublicKey } from '@solana/web3.js';
import { z } from 'zod';
import { getSolanaConnection } from '../solana';

const router = Router();

// Validation schema for clustering request
const clusteringRequestSchema = z.object({
  address: z.string().min(32).max(44),
  limit: z.number().min(1).max(200).default(50),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  clusterThreshold: z.number().min(0).max(1).default(0.5),
  includeUnusual: z.boolean().default(true),
});

/**
 * Route to get transaction clusters for a wallet
 * This identifies patterns, unusual activity, and groups related transactions
 */
router.get('/:address', async (req: Request, res: Response) => {
  try {
    const address = req.params.address;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const includeUnusual = req.query.includeUnusual !== 'false';
    
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
        clusters: [],
        unusualTransactions: [],
        highValueTransactions: [],
        relatedWallets: {}
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
    
    // In a real implementation, we would use the transactionClusteringService
    // For now, return a placeholder response with realistic data structure
    
    // Create sample clusters based on actual transaction data
    const temporalCluster = {
      id: `temporal-${Date.now()}`,
      name: 'Rapid Transaction Burst',
      description: 'Multiple transactions within a short time window',
      transactions: formattedTransactions.slice(0, Math.min(5, formattedTransactions.length))
        .map(tx => tx.signature),
      wallets: Array.from(new Set(
        formattedTransactions.slice(0, Math.min(5, formattedTransactions.length))
          .flatMap(tx => tx.accountKeys)
      )),
      confidence: 85,
      type: 'temporal',
      createdAt: new Date()
    };
    
    const valueCluster = {
      id: `value-${Date.now()}`,
      name: 'High Value Transactions',
      description: 'Transactions with significant SOL value',
      transactions: formattedTransactions.slice(
        Math.min(5, formattedTransactions.length), 
        Math.min(8, formattedTransactions.length)
      ).map(tx => tx.signature),
      wallets: Array.from(new Set(
        formattedTransactions.slice(
          Math.min(5, formattedTransactions.length), 
          Math.min(8, formattedTransactions.length)
        ).flatMap(tx => tx.accountKeys)
      )),
      confidence: 75,
      type: 'value',
      createdAt: new Date()
    };
    
    // Convert relatedWallets Map to an object for the response
    const relatedWalletsObj: Record<string, number> = {};
    
    // Add some sample related wallets from the actual transaction data
    const uniqueAddresses = new Set<string>();
    formattedTransactions.forEach(tx => {
      tx.accountKeys.forEach(addr => {
        if (addr !== address) {
          uniqueAddresses.add(addr);
        }
      });
    });
    
    // Convert to array, take first 5, and assign confidence scores
    Array.from(uniqueAddresses).slice(0, 5).forEach(addr => {
      relatedWalletsObj[addr] = Math.floor(Math.random() * 40) + 60; // Random score between 60-100
    });
    
    // Sample unusual transactions (first 2 transactions)
    const unusualTransactions = formattedTransactions.length >= 2 
      ? formattedTransactions.slice(0, 2).map(tx => tx.signature)
      : [];
    
    // Sample high value transactions (last 2 transactions)
    const highValueTransactions = formattedTransactions.length >= 2
      ? formattedTransactions.slice(-2).map(tx => tx.signature)
      : [];
    
    res.json({
      address,
      clusters: [temporalCluster, valueCluster],
      unusualTransactions,
      highValueTransactions,
      relatedWallets: relatedWalletsObj
    });
  } catch (error) {
    console.error('Error in transaction clustering:', error);
    res.status(500).json({ error: 'Failed to analyze transaction clusters' });
  }
});

/**
 * Route to get details about a specific transaction cluster
 */
router.get('/:address/cluster/:clusterId', async (req: Request, res: Response) => {
  try {
    const { address, clusterId } = req.params;
    
    // Validate input
    if (!address || address.length < 32) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    if (!clusterId) {
      return res.status(400).json({ error: 'Invalid cluster ID' });
    }
    
    // In a real implementation, we would fetch detailed cluster data
    // For now, return a placeholder response based on the cluster type
    
    let cluster;
    if (clusterId.startsWith('temporal')) {
      cluster = {
        id: clusterId,
        name: 'Rapid Transaction Burst',
        description: '8 transactions within 5 minutes on 2023-04-15',
        transactions: [
          '5JFKbLUiaGsPcj87DkiGHHUGYqGrN3vpxdp93g3UGrvH3NvT7TcthZFTXS3aRGNjFiNVQiCTSvgQQu1wG9nVdFn9',
          '2HLxJXSBnM1JSgAZFEsAdAKzqBfYH5LtUfxQtDMEtvpdj6EhxjCjTRvKkZRDXrMZ6erSPYdJRWXWN3Pcm7cC6dap',
          '3uivJfQ4pzxRAhBEwgFcrZSFuJTgZhwgRxGZCNKnVVgQJJtx8ARMuA6BZpRAjmYsUpfxQEQqwKNZ6FvVQwJVyY3e'
        ],
        wallets: [
          address,
          '9XyR3q3XnXPApcHEa3kV7RER2WLjQVFKEKPB4CwGTZdP',
          '2JvPg2Kw1bGEk8GpK7yBYeGQ5o2thd4XKXj87XJQ9vUV'
        ],
        confidence: 85,
        type: 'temporal',
        createdAt: new Date(Date.now() - 24 * 3600 * 1000), // 1 day ago
        analysisDetails: {
          timeWindow: '5 minutes',
          averageTimeBetweenTransactions: '38 seconds',
          startTime: new Date(Date.now() - 24 * 3600 * 1000 - 5 * 60 * 1000),
          endTime: new Date(Date.now() - 24 * 3600 * 1000),
          transactionTypes: {
            transfer: 5,
            swap: 2,
            other: 1
          }
        }
      };
    } else if (clusterId.startsWith('value')) {
      cluster = {
        id: clusterId,
        name: 'High Value Transactions',
        description: '3 transactions with values exceeding 50 SOL',
        transactions: [
          '5w5HtfZ5Zo4TVS2SBXDSXuatmRQJ5Bq6mSKHJ3JWqMBTLufiJazw5g6H4r8mBJ2krBLrpwwRkLQrqPuGR7FjDVX7',
          '4PBnVaU76jz5h3RJgekAGvH3t7Ec1Vb4BmmAeBMpxvxEZFpdF64EgEgXXsVbSygRsN8PGTq7MedSbkn7mL7URKMR'
        ],
        wallets: [
          address,
          'HJtNXKofomxjuWpWLMzTbAb4dQQYF74wYPCQNBrHfUMd',
          'DSHLCu5ivgmLQwwFfM8A11mHNsVQNsP2LExXDpsF3xjQ'
        ],
        confidence: 90,
        type: 'value',
        createdAt: new Date(Date.now() - 48 * 3600 * 1000), // 2 days ago
        analysisDetails: {
          totalValue: 175.32,
          averageValue: 58.44,
          highestValue: 82.15,
          lowestValue: 50.02,
          valueDistribution: {
            '50-60': 1,
            '60-70': 1,
            '80+': 1
          }
        }
      };
    } else if (clusterId.startsWith('entity')) {
      cluster = {
        id: clusterId,
        name: 'Frequent Entity Interaction',
        description: '12 interactions with the same entity',
        transactions: [
          '3xYJvbXqiRf1ePQQyEsQMwJyp1zHYBdxCbxcYZZYgUfaBzXv6FPv9mxxs1KpzyPixZGK95HxGBcfKKkXeNrQNQww',
          '3Rdr7m3sZJeQYVDRqxXQCzTr1xiiS4jxrNCzgNDLVfUKcKcExSKbwkVLmPXPjvwRwjf8k9tWHPgkKtFfyhjN8c8Q'
        ],
        wallets: [
          address,
          'EXnGBBSamqzM1LL5vED32xibD1Jgc8xDQQ5fzEgFJjXD'
        ],
        confidence: 80,
        type: 'entity',
        createdAt: new Date(Date.now() - 72 * 3600 * 1000), // 3 days ago
        analysisDetails: {
          entityAddress: 'EXnGBBSamqzM1LL5vED32xibD1Jgc8xDQQ5fzEgFJjXD',
          entityType: 'likely exchange',
          interactionFrequency: 'every 2.3 days',
          firstInteraction: new Date(Date.now() - 30 * 24 * 3600 * 1000),
          lastInteraction: new Date(Date.now() - 3 * 24 * 3600 * 1000),
          totalTransactions: 12
        }
      };
    } else {
      return res.status(404).json({ error: 'Cluster not found' });
    }
    
    res.json(cluster);
  } catch (error) {
    console.error('Error getting cluster details:', error);
    res.status(500).json({ error: 'Failed to retrieve cluster details' });
  }
});

/**
 * Route to get unusual transactions
 */
router.get('/:address/unusual', async (req: Request, res: Response) => {
  try {
    const address = req.params.address;
    
    // Validate input
    if (!address || address.length < 32) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    // In a real implementation, we would fetch unusual transaction data
    // For now, return a placeholder response
    res.json({
      address,
      unusualTransactions: [
        {
          signature: '5w5HtfZ5Zo4TVS2SBXDSXuatmRQJ5Bq6mSKHJ3JWqMBTLufiJazw5g6H4r8mBJ2krBLrpwwRkLQrqPuGR7FjDVX7',
          timestamp: Date.now() - 2 * 24 * 3600 * 1000,
          type: 'receive-then-disperse',
          description: 'Funds received and quickly dispersed to 5 addresses',
          riskScore: 75,
          involvedAddresses: [
            address,
            'HJtNXKofomxjuWpWLMzTbAb4dQQYF74wYPCQNBrHfUMd',
            'DSHLCu5ivgmLQwwFfM8A11mHNsVQNsP2LExXDpsF3xjQ',
            '3rjCMxkTCxsmuR16syDqW4o97JM4bWJCTUxEcjavXhG5',
            'HfLVSWuqHNJ5jUNqDySJzkGCk3AZPUEHfXLkYJMjXhL1',
            'VmqFNfqQUHeuDuyZty5yQdf8e79fBDvgWoBdYvcSkWM'
          ]
        },
        {
          signature: '3zRXmpvQCmGJ7ZZCErTCVGMirRKwmHZcWqdBrEuQyxJNEZGebKmBmSvgKRQv92JjZhqZprJvkY6iB4foNYxREXr',
          timestamp: Date.now() - 5 * 24 * 3600 * 1000,
          type: 'circular-transaction',
          description: 'Funds moved in a circular pattern through 3 addresses',
          riskScore: 65,
          involvedAddresses: [
            address,
            'EXnGBBSamqzM1LL5vED32xibD1Jgc8xDQQ5fzEgFJjXD',
            '9XyR3q3XnXPApcHEa3kV7RER2WLjQVFKEKPB4CwGTZdP'
          ]
        }
      ]
    });
  } catch (error) {
    console.error('Error getting unusual transactions:', error);
    res.status(500).json({ error: 'Failed to retrieve unusual transactions' });
  }
});

export default router;