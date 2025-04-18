import { Router, Request, Response } from 'express';
import { transactionClusteringService } from '../services/transactionClustering';
import { PublicKey } from '@solana/web3.js';

const router = Router();

// Helper function to validate Solana addresses
function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get transaction clusters for a wallet
 * 
 * @route GET /api/transaction-clustering/clusters/:address
 */
router.get('/clusters/:address', async (req: Request, res: Response) => {
  const { address } = req.params;
  const { timeWindowHours, minTransactions, similarityThreshold } = req.query;
  
  if (!address || !isValidSolanaAddress(address)) {
    return res.status(400).json({ error: 'Invalid Solana wallet address' });
  }
  
  try {
    // Get user ID from session if available
    const userId = req.user ? (req.user as any).id : undefined;
    
    // Parse query parameters
    const options = {
      timeWindowHours: timeWindowHours ? parseFloat(timeWindowHours as string) : undefined,
      minTransactions: minTransactions ? parseInt(minTransactions as string, 10) : undefined,
      similarityThreshold: similarityThreshold ? parseFloat(similarityThreshold as string) : undefined
    };
    
    const clusters = await transactionClusteringService.clusterTransactions(address, userId, options);
    
    // Transform the result for API response
    const response = clusters.map(cluster => ({
      id: cluster.id,
      transactionCount: cluster.transactions.length,
      transactionSignatures: cluster.transactions.map(tx => tx.signature),
      wallets: cluster.wallets,
      createdAt: cluster.createdAt,
      score: cluster.score,
      type: cluster.type,
      description: cluster.description
    }));
    
    return res.json(response);
  } catch (error) {
    console.error('Error in transaction clustering:', error);
    return res.status(500).json({ error: 'Failed to cluster transactions' });
  }
});

/**
 * Get associated wallets for a wallet
 * 
 * @route GET /api/transaction-clustering/associated-wallets/:address
 */
router.get('/associated-wallets/:address', async (req: Request, res: Response) => {
  const { address } = req.params;
  
  if (!address || !isValidSolanaAddress(address)) {
    return res.status(400).json({ error: 'Invalid Solana wallet address' });
  }
  
  try {
    // Get user ID from session if available
    const userId = req.user ? (req.user as any).id : undefined;
    
    const associatedWallets = await transactionClusteringService.getAssociatedWallets(address, userId);
    
    return res.json(associatedWallets);
  } catch (error) {
    console.error('Error in finding associated wallets:', error);
    return res.status(500).json({ error: 'Failed to find associated wallets' });
  }
});

export default router;