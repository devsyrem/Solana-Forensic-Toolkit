import { storage } from '../storage';
import { Transaction, Wallet, WalletEntityRelation, Entity, InsertWallet, InsertEntity,
  InsertFundingSource, InsertActivityPattern, FundingSource, ActivityPattern } from '@shared/schema';
import { Connection, PublicKey } from '@solana/web3.js';
import { getSolanaConnection } from '../solana';

/**
 * WalletAnalysisService provides functionality for:
 * - Tracking funding sources for wallets
 * - Analyzing transaction patterns
 * - Identifying entity connections
 * - Calculating complete history of fund origins
 */
export class WalletAnalysisService {
  private connection: Connection;

  constructor() {
    this.connection = getSolanaConnection();
  }

  /**
   * Tracks all incoming transactions to a wallet to determine funding sources
   */
  async trackFundingSources(walletAddress: string, userId?: number): Promise<FundingSource[]> {
    // Get or create wallet
    let wallet = await storage.getWalletByAddress(walletAddress);
    if (!wallet && userId) {
      wallet = await storage.createWallet({
        address: walletAddress,
        userId,
      });
    }

    if (!wallet) {
      throw new Error(`Cannot track funding sources for unknown wallet: ${walletAddress}`);
    }

    // Fetch transactions
    const transactions = await storage.getWalletTransactions(walletAddress, 100);
    
    // Filter for incoming transactions
    const incomingTransactions = transactions.filter(tx => 
      tx.destinationAddress === walletAddress &&
      tx.amount && tx.amount > 0
    );

    // Process each funding source
    const fundingSources: FundingSource[] = [];
    
    for (const tx of incomingTransactions) {
      // Get or create source wallet
      let sourceWallet = await storage.getWalletByAddress(tx.sourceAddress);
      if (!sourceWallet && userId) {
        sourceWallet = await storage.createWallet({
          address: tx.sourceAddress,
          userId,
        });
      }

      if (!sourceWallet) {
        console.warn(`Source wallet not found: ${tx.sourceAddress}`);
        continue;
      }

      // Add this as a funding source
      const fundingSource = await storage.addFundingSource({
        walletId: wallet.id,
        sourceWalletId: sourceWallet.id,
        firstTransactionSignature: tx.signature,
        firstTransactionDate: tx.blockTime || new Date(),
        lastTransactionSignature: tx.signature,
        lastTransactionDate: tx.blockTime || new Date(),
        totalAmount: tx.amount || 0,
        transactionCount: 1,
        isDirectSource: true,
        confidence: 1,
        path: [sourceWallet.address, wallet.address],
        userId: userId,
      });

      fundingSources.push(fundingSource);
    }

    // Return all funding sources
    return await storage.getFundingSources(wallet.id);
  }

  /**
   * Analyzes transaction patterns for a wallet
   */
  async analyzeActivityPatterns(walletAddress: string, userId?: number): Promise<ActivityPattern[]> {
    // Get or create wallet
    let wallet = await storage.getWalletByAddress(walletAddress);
    if (!wallet && userId) {
      wallet = await storage.createWallet({
        address: walletAddress,
        userId,
      });
    }

    if (!wallet) {
      throw new Error(`Cannot analyze activity patterns for unknown wallet: ${walletAddress}`);
    }

    // Fetch transactions
    const transactions = await storage.getWalletTransactions(walletAddress, 200);
    
    if (transactions.length === 0) {
      return [];
    }

    // Detect patterns

    // 1. Transaction frequency pattern
    const transactionDates = transactions
      .filter(tx => tx.blockTime)
      .map(tx => tx.blockTime!)
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (transactionDates.length > 5) {
      // Calculate average time between transactions
      let totalTimeBetween = 0;
      for (let i = 1; i < transactionDates.length; i++) {
        totalTimeBetween += transactionDates[i].getTime() - transactionDates[i-1].getTime();
      }
      const avgTimeBetween = totalTimeBetween / (transactionDates.length - 1);
      const avgHoursBetween = avgTimeBetween / (1000 * 60 * 60);
      
      // Determine frequency
      let frequency = 'irregular';
      let patternType = 'unknown';
      
      if (avgHoursBetween <= 2) {
        frequency = 'hourly';
        patternType = 'frequent-transactions';
      } else if (avgHoursBetween <= 24) {
        frequency = 'daily';
        patternType = 'daily-activity';
      } else if (avgHoursBetween <= 24 * 7) {
        frequency = 'weekly';
        patternType = 'weekly-activity';
      } else if (avgHoursBetween <= 24 * 30) {
        frequency = 'monthly';
        patternType = 'monthly-activity';
      }
      
      await storage.addActivityPattern({
        walletId: wallet.id,
        pattern: patternType,
        frequency,
        confidence: 0.7,
        description: `Transactions occur approximately ${frequency}`,
        userId,
      });
    }

    // 2. Transaction type patterns
    const typeCounts: Record<string, number> = {};
    for (const tx of transactions) {
      typeCounts[tx.type || 'transfer'] = (typeCounts[tx.type || 'transfer'] || 0) + 1;
    }
    
    // Find dominant transaction type
    let dominantType = 'transfer';
    let maxCount = 0;
    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type;
      }
    }
    
    const dominantPercentage = maxCount / transactions.length;
    if (dominantPercentage > 0.6) {
      await storage.addActivityPattern({
        walletId: wallet.id,
        pattern: `${dominantType}-focused`,
        confidence: dominantPercentage,
        description: `${Math.round(dominantPercentage * 100)}% of transactions are ${dominantType}s`,
        userId,
      });
    }

    // 3. Transaction amount pattern
    if (transactions.filter(tx => tx.amount).length > 5) {
      const amounts = transactions
        .filter(tx => tx.amount !== null && tx.amount !== undefined)
        .map(tx => tx.amount as number);
      
      const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
      
      // Check consistency
      const deviations = amounts.map(amt => Math.abs(amt - avgAmount) / avgAmount);
      const avgDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
      
      if (avgDeviation < 0.2) {
        await storage.addActivityPattern({
          walletId: wallet.id,
          pattern: 'consistent-amounts',
          confidence: 0.8,
          description: `Transactions have consistent amounts around ${avgAmount.toFixed(4)} SOL`,
          userId,
        });
      } else {
        // Check for large transfers
        const largeTransfers = amounts.filter(amt => amt > 5).length;
        if (largeTransfers > 0) {
          const percentage = largeTransfers / amounts.length;
          await storage.addActivityPattern({
            walletId: wallet.id,
            pattern: 'large-transfers',
            confidence: 0.6,
            description: `${Math.round(percentage * 100)}% of transactions involve large amounts (>5 SOL)`,
            userId,
          });
        }
      }
    }

    // Return all activity patterns
    return await storage.getWalletActivityPatterns(wallet.id);
  }

  /**
   * Identifies entity connections for a wallet
   */
  async identifyEntityConnections(walletAddress: string, userId?: number): Promise<Entity[]> {
    // Get or create wallet
    let wallet = await storage.getWalletByAddress(walletAddress);
    if (!wallet && userId) {
      wallet = await storage.createWallet({
        address: walletAddress,
        userId,
      });
    }

    if (!wallet) {
      throw new Error(`Cannot identify entity connections for unknown wallet: ${walletAddress}`);
    }
    
    // First, check if the wallet is already associated with any entities
    let walletEntities = await storage.getWalletEntities(wallet.id);
    
    // If we have some, return them
    if (walletEntities.length > 0) {
      return walletEntities;
    }
    
    // Not found, try to detect known entity patterns
    
    // 1. Detect if this might be an exchange wallet
    const transactions = await storage.getWalletTransactions(walletAddress, 50);
    
    if (transactions.length > 10) {
      // Exchanges typically have many transactions with different accounts
      const uniqueCounterparties = new Set<string>();
      for (const tx of transactions) {
        if (tx.sourceAddress !== walletAddress) {
          uniqueCounterparties.add(tx.sourceAddress);
        }
        if (tx.destinationAddress !== walletAddress) {
          uniqueCounterparties.add(tx.destinationAddress);
        }
      }
      
      const counterpartyRatio = uniqueCounterparties.size / transactions.length;
      if (counterpartyRatio > 0.8 && transactions.length > 20) {
        // This looks like an exchange or high-activity entity
        const entityName = `Exchange or High-Activity Wallet ${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
        const entity = await storage.createEntity({
          name: entityName,
          type: 'exchange',
          description: 'Detected exchange-like pattern with many counterparties',
          userId,
          isPublic: true,
          color: '#5F9EA0',
        });
        
        // Associate this wallet with the entity
        await storage.addWalletToEntity({
          walletId: wallet.id,
          entityId: entity.id,
          confirmedBy: userId,
        });
        
        return [entity];
      }
    }
    
    // No associations yet
    return [];
  }

  /**
   * Calculate the full fund origin history for a wallet
   */
  async traceFundOrigins(walletAddress: string, userId?: number, depth: number = 3): Promise<FundingSource[]> {
    // Get or create wallet
    let wallet = await storage.getWalletByAddress(walletAddress);
    if (!wallet && userId) {
      wallet = await storage.createWallet({
        address: walletAddress,
        userId,
      });
    }

    if (!wallet) {
      throw new Error(`Cannot trace fund origins for unknown wallet: ${walletAddress}`);
    }
    
    // First, get direct funding sources
    const directSources = await this.trackFundingSources(walletAddress, userId);
    
    if (depth <= 1 || directSources.length === 0) {
      return directSources;
    }
    
    // For each source, recursively trace its origins
    const processedAddresses = new Set<string>([walletAddress]);
    const allSources: FundingSource[] = [...directSources];
    
    const processSourceWallet = async (source: FundingSource, currentDepth: number) => {
      // Skip if we've reached our depth limit or already processed this address
      const sourceWallet = await storage.getWallet(source.sourceWalletId);
      if (!sourceWallet || currentDepth >= depth || processedAddresses.has(sourceWallet.address)) {
        return;
      }
      
      processedAddresses.add(sourceWallet.address);
      
      // Find funding sources for this wallet
      const nestedSources = await this.trackFundingSources(sourceWallet.address, userId);
      
      // For each nested source, create an indirect funding source from origin to target
      for (const nestedSource of nestedSources) {
        const nestedWallet = await storage.getWallet(nestedSource.sourceWalletId);
        if (!nestedWallet) continue;
        
        // Create indirect funding link
        const indirectSource = await storage.addFundingSource({
          walletId: wallet.id,
          sourceWalletId: nestedSource.sourceWalletId,
          firstTransactionSignature: nestedSource.firstTransactionSignature,
          firstTransactionDate: nestedSource.firstTransactionDate,
          lastTransactionSignature: nestedSource.lastTransactionSignature,
          lastTransactionDate: nestedSource.lastTransactionDate,
          totalAmount: nestedSource.totalAmount,
          transactionCount: nestedSource.transactionCount,
          isDirectSource: false,
          confidence: Math.max(0.1, (nestedSource.confidence || 0.5) - 0.2), // Lower confidence for indirect links
          path: [...(nestedSource.path || []), sourceWallet.address, wallet.address],
          userId,
        });
        
        allSources.push(indirectSource);
        
        // Recurse deeper
        await processSourceWallet(nestedSource, currentDepth + 1);
      }
    };
    
    // Process each direct source
    for (const source of directSources) {
      await processSourceWallet(source, 1);
    }
    
    return allSources;
  }
}

// Export a singleton instance
export const walletAnalysisService = new WalletAnalysisService();