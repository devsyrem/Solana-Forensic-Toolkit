import { Router, Request, Response } from 'express';
import { walletAnalysisService } from '../services/walletAnalysis';
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
 * Get funding sources for a wallet
 * 
 * @route GET /api/wallet-analysis/funding-sources/:address
 */
router.get('/funding-sources/:address', async (req: Request, res: Response) => {
  const { address } = req.params;
  
  if (!address || !isValidSolanaAddress(address)) {
    return res.status(400).json({ error: 'Invalid Solana wallet address' });
  }
  
  try {
    // Get user ID from session if available
    const userId = req.user ? (req.user as any).id : undefined;
    
    const fundingSources = await walletAnalysisService.trackFundingSources(address, userId);
    
    // Transform the result for API response
    const result = fundingSources.map(source => ({
      id: source.id,
      sourceWalletId: source.sourceWalletId,
      firstTransactionSignature: source.firstTransactionSignature,
      firstTransactionDate: source.firstTransactionDate,
      lastTransactionDate: source.lastTransactionDate,
      totalAmount: source.totalAmount,
      transactionCount: source.transactionCount,
      isDirectSource: source.isDirectSource,
      confidence: source.confidence,
      path: source.path,
    }));
    
    return res.json(result);
  } catch (error) {
    console.error('Error in funding sources:', error);
    return res.status(500).json({ error: 'Failed to get funding sources' });
  }
});

/**
 * Get activity patterns for a wallet
 * 
 * @route GET /api/wallet-analysis/activity-patterns/:address
 */
router.get('/activity-patterns/:address', async (req: Request, res: Response) => {
  const { address } = req.params;
  
  if (!address || !isValidSolanaAddress(address)) {
    return res.status(400).json({ error: 'Invalid Solana wallet address' });
  }
  
  try {
    // Get user ID from session if available
    const userId = req.user ? (req.user as any).id : undefined;
    
    const activityPatterns = await walletAnalysisService.analyzeActivityPatterns(address, userId);
    
    return res.json(activityPatterns);
  } catch (error) {
    console.error('Error in activity patterns:', error);
    return res.status(500).json({ error: 'Failed to analyze activity patterns' });
  }
});

/**
 * Get entity connections for a wallet
 * 
 * @route GET /api/wallet-analysis/entity-connections/:address
 */
router.get('/entity-connections/:address', async (req: Request, res: Response) => {
  const { address } = req.params;
  
  if (!address || !isValidSolanaAddress(address)) {
    return res.status(400).json({ error: 'Invalid Solana wallet address' });
  }
  
  try {
    // Get user ID from session if available
    const userId = req.user ? (req.user as any).id : undefined;
    
    const entities = await walletAnalysisService.identifyEntityConnections(address, userId);
    
    return res.json(entities);
  } catch (error) {
    console.error('Error in entity connections:', error);
    return res.status(500).json({ error: 'Failed to identify entity connections' });
  }
});

/**
 * Trace fund origins for a wallet
 * 
 * @route GET /api/wallet-analysis/fund-origins/:address
 */
router.get('/fund-origins/:address', async (req: Request, res: Response) => {
  const { address } = req.params;
  const { depth } = req.query;
  
  if (!address || !isValidSolanaAddress(address)) {
    return res.status(400).json({ error: 'Invalid Solana wallet address' });
  }
  
  try {
    // Get user ID from session if available
    const userId = req.user ? (req.user as any).id : undefined;
    
    // Parse depth parameter, default to 3 if not specified
    const parsedDepth = depth ? parseInt(depth as string, 10) : 3;
    const validDepth = isNaN(parsedDepth) ? 3 : Math.min(Math.max(1, parsedDepth), 5); // Limit depth to 1-5
    
    const fundSources = await walletAnalysisService.traceFundOrigins(address, userId, validDepth);
    
    // Transform the result for API response
    const result = fundSources.map(source => ({
      id: source.id,
      sourceWalletId: source.sourceWalletId,
      firstTransactionSignature: source.firstTransactionSignature,
      firstTransactionDate: source.firstTransactionDate,
      lastTransactionDate: source.lastTransactionDate,
      totalAmount: source.totalAmount,
      transactionCount: source.transactionCount,
      isDirectSource: source.isDirectSource,
      confidence: source.confidence,
      path: source.path,
    }));
    
    return res.json(result);
  } catch (error) {
    console.error('Error in fund origins:', error);
    return res.status(500).json({ error: 'Failed to trace fund origins' });
  }
});

export default router;