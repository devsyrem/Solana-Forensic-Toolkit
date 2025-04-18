import { storage } from '../storage';
import { Transaction, Wallet, InsertWallet } from '@shared/schema';
import { Connection, PublicKey } from '@solana/web3.js';
import { getSolanaConnection } from '../solana';

/**
 * Interface for representing transaction clusters
 */
interface TransactionCluster {
  id: string;
  transactions: Transaction[];
  wallets: string[];
  createdAt: Date;
  score: number; // Confidence score from 0 to 1
  type: 'normal' | 'unusual' | 'suspicious';
  description: string;
  metadata?: Record<string, any>;
}

/**
 * TransactionClusteringService provides methods for:
 * - Grouping related transactions
 * - Identifying associated wallets
 * - Flagging unusual transaction movements
 */
export class TransactionClusteringService {
  private connection: Connection;

  constructor() {
    this.connection = getSolanaConnection();
  }

  /**
   * Group related transactions based on patterns, timing, and amounts
   * @param walletAddress The address of the wallet to analyze
   * @param userId Optional user ID for storing results
   * @param options Configuration options for clustering
   */
  async clusterTransactions(
    walletAddress: string, 
    userId?: number, 
    options: {
      timeWindowHours?: number;
      minTransactions?: number;
      similarityThreshold?: number;
    } = {}
  ): Promise<TransactionCluster[]> {
    // Default options
    const timeWindow = options.timeWindowHours || 24; // Default 24 hour window
    const minTransactions = options.minTransactions || 3; // Minimum 3 transactions to form a cluster
    const similarityThreshold = options.similarityThreshold || 0.7; // Similarity threshold for clustering

    // Get or create wallet
    let wallet = await storage.getWalletByAddress(walletAddress);
    if (!wallet && userId) {
      wallet = await storage.createWallet({
        address: walletAddress,
        userId,
      });
    }

    if (!wallet) {
      throw new Error(`Cannot cluster transactions for unknown wallet: ${walletAddress}`);
    }

    // Fetch transactions
    const transactions = await storage.getWalletTransactions(walletAddress, 200);
    if (transactions.length < minTransactions) {
      return []; // Not enough transactions to perform meaningful clustering
    }

    // Perform temporal clustering (transactions that happen close together in time)
    const temporalClusters = this.clusterByTime(transactions, timeWindow);
    
    // Perform amount-based clustering (transactions with similar amounts)
    const amountClusters = this.clusterByAmount(transactions);
    
    // Perform pattern-based clustering (transactions with similar patterns)
    const patternClusters = this.clusterByPattern(transactions);
    
    // Merge clusters with high similarity
    const mergedClusters = this.mergeClusters([
      ...temporalClusters, 
      ...amountClusters,
      ...patternClusters
    ], similarityThreshold);
    
    // Identify and flag unusual transaction movements
    return this.flagUnusualMovements(mergedClusters, walletAddress);
  }

  /**
   * Cluster transactions based on temporal proximity
   */
  private clusterByTime(transactions: Transaction[], timeWindowHours: number): TransactionCluster[] {
    const clusters: TransactionCluster[] = [];
    const sortedTransactions = [...transactions].sort((a, b) => {
      const aTime = a.blockTime ? new Date(a.blockTime).getTime() : 0;
      const bTime = b.blockTime ? new Date(b.blockTime).getTime() : 0;
      return aTime - bTime;
    });

    let currentCluster: Transaction[] = [];
    let lastTimestamp = 0;
    const timeWindowMs = timeWindowHours * 60 * 60 * 1000;

    for (const tx of sortedTransactions) {
      if (!tx.blockTime) continue;
      
      const txTime = new Date(tx.blockTime).getTime();
      
      if (currentCluster.length === 0 || (txTime - lastTimestamp) <= timeWindowMs) {
        // Add to current cluster if it's empty or within time window
        currentCluster.push(tx);
        lastTimestamp = txTime;
      } else {
        // Close current cluster and start a new one
        if (currentCluster.length >= 3) {
          // Only keep clusters with at least 3 transactions
          clusters.push(this.createCluster(currentCluster, 'Temporal cluster', 0.8, 'normal'));
        }
        currentCluster = [tx];
        lastTimestamp = txTime;
      }
    }

    // Don't forget to process the last cluster
    if (currentCluster.length >= 3) {
      clusters.push(this.createCluster(currentCluster, 'Temporal cluster', 0.8, 'normal'));
    }

    return clusters;
  }

  /**
   * Cluster transactions based on similar amounts
   */
  private clusterByAmount(transactions: Transaction[]): TransactionCluster[] {
    const clusters: TransactionCluster[] = [];
    const txWithAmounts = transactions.filter(tx => tx.amount !== null && tx.amount !== undefined);
    
    // Group transactions by similar amounts (within 5% margin)
    const amountGroups: Map<number, Transaction[]> = new Map();
    
    for (const tx of txWithAmounts) {
      let foundGroup = false;
      const txAmount = tx.amount!;
      
      for (const [baseAmount, group] of amountGroups.entries()) {
        // Check if within 5% of the base amount
        if (Math.abs(txAmount - baseAmount) / baseAmount <= 0.05) {
          group.push(tx);
          foundGroup = true;
          break;
        }
      }
      
      if (!foundGroup) {
        amountGroups.set(txAmount, [tx]);
      }
    }
    
    // Convert groups to clusters
    for (const [amount, group] of amountGroups.entries()) {
      if (group.length >= 3) {
        const formattedAmount = amount.toFixed(4);
        clusters.push(this.createCluster(
          group, 
          `Transactions with similar amount (~${formattedAmount} SOL)`, 
          0.75, 
          'normal'
        ));
      }
    }
    
    return clusters;
  }

  /**
   * Cluster transactions based on repeating patterns
   */
  private clusterByPattern(transactions: Transaction[]): TransactionCluster[] {
    const clusters: TransactionCluster[] = [];
    
    // Group by transaction type
    const typeGroups: Map<string, Transaction[]> = new Map();
    for (const tx of transactions) {
      const type = tx.type || 'unknown';
      if (!typeGroups.has(type)) {
        typeGroups.set(type, []);
      }
      typeGroups.get(type)!.push(tx);
    }
    
    // Find repeating source/destination patterns
    const patternGroups: Map<string, Transaction[]> = new Map();
    for (const tx of transactions) {
      if (!tx.sourceAddress || !tx.destinationAddress) continue;
      
      const pattern = `${tx.sourceAddress}->${tx.destinationAddress}`;
      if (!patternGroups.has(pattern)) {
        patternGroups.set(pattern, []);
      }
      patternGroups.get(pattern)!.push(tx);
    }
    
    // Convert groups to clusters
    for (const [type, group] of typeGroups.entries()) {
      if (group.length >= 3) {
        clusters.push(this.createCluster(
          group, 
          `Transactions of type: ${type}`, 
          0.7, 
          'normal'
        ));
      }
    }
    
    for (const [pattern, group] of patternGroups.entries()) {
      if (group.length >= 2) { // Lower threshold for repeated exact patterns
        const [source, destination] = pattern.split('->');
        
        // Check if this is a circular pattern (funds returning to origin)
        const isCircular = transactions.some(tx => 
          tx.sourceAddress === destination && tx.destinationAddress === source
        );
        
        if (isCircular) {
          clusters.push(this.createCluster(
            group, 
            `Circular transaction pattern between wallets`, 
            0.9, 
            'unusual',
            { isCircular: true }
          ));
        } else {
          clusters.push(this.createCluster(
            group, 
            `Repeated transactions between same wallets`, 
            0.8, 
            'normal'
          ));
        }
      }
    }
    
    return clusters;
  }

  /**
   * Merge similar clusters based on transaction overlap
   */
  private mergeClusters(clusters: TransactionCluster[], similarityThreshold: number): TransactionCluster[] {
    if (clusters.length <= 1) return clusters;
    
    const mergedClusters: TransactionCluster[] = [];
    const processed = new Set<string>();
    
    for (let i = 0; i < clusters.length; i++) {
      if (processed.has(clusters[i].id)) continue;
      
      let currentCluster = { ...clusters[i] };
      processed.add(currentCluster.id);
      
      for (let j = i + 1; j < clusters.length; j++) {
        if (processed.has(clusters[j].id)) continue;
        
        const similarity = this.calculateClusterSimilarity(currentCluster, clusters[j]);
        
        if (similarity >= similarityThreshold) {
          // Merge clusters
          const uniqueTransactions = new Map<string, Transaction>();
          
          // Add all transactions from both clusters to the map
          [...currentCluster.transactions, ...clusters[j].transactions].forEach(tx => {
            uniqueTransactions.set(tx.signature, tx);
          });
          
          // Create a new merged cluster
          currentCluster = {
            ...currentCluster,
            transactions: Array.from(uniqueTransactions.values()),
            wallets: [...new Set([...currentCluster.wallets, ...clusters[j].wallets])],
            score: Math.max(currentCluster.score, clusters[j].score),
            description: `Merged: ${currentCluster.description} & ${clusters[j].description}`,
          };
          
          processed.add(clusters[j].id);
        }
      }
      
      mergedClusters.push(currentCluster);
    }
    
    return mergedClusters;
  }

  /**
   * Calculate similarity between two clusters based on transaction overlap
   */
  private calculateClusterSimilarity(cluster1: TransactionCluster, cluster2: TransactionCluster): number {
    const txSet1 = new Set(cluster1.transactions.map(tx => tx.signature));
    const txSet2 = new Set(cluster2.transactions.map(tx => tx.signature));
    
    // Count overlapping transactions
    let overlap = 0;
    for (const signature of txSet1) {
      if (txSet2.has(signature)) {
        overlap++;
      }
    }
    
    // Jaccard similarity: intersection size divided by union size
    const union = txSet1.size + txSet2.size - overlap;
    return union > 0 ? overlap / union : 0;
  }

  /**
   * Flag unusual transaction movements based on various heuristics
   */
  private flagUnusualMovements(clusters: TransactionCluster[], walletAddress: string): TransactionCluster[] {
    return clusters.map(cluster => {
      let isUnusual = false;
      let isSuspicious = false;
      let reason = '';
      
      // Check for large variance in amounts
      const amounts = cluster.transactions
        .filter(tx => tx.amount !== null && tx.amount !== undefined)
        .map(tx => tx.amount as number);
      
      if (amounts.length >= 3) {
        const avg = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
        const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - avg, 2), 0) / amounts.length;
        const stdDev = Math.sqrt(variance);
        
        // High variance can indicate unusual patterns
        if (stdDev / avg > 1.5) {
          isUnusual = true;
          reason += 'High variance in transaction amounts. ';
        }
      }
      
      // Check for unusual timing patterns
      const timestamps = cluster.transactions
        .filter(tx => tx.blockTime)
        .map(tx => new Date(tx.blockTime!).getTime());
      
      if (timestamps.length >= 3) {
        // Sort timestamps
        timestamps.sort((a, b) => a - b);
        
        // Calculate time differences between consecutive transactions
        const timeDiffs = [];
        for (let i = 1; i < timestamps.length; i++) {
          timeDiffs.push(timestamps[i] - timestamps[i-1]);
        }
        
        // Check for very regular timing (potential bot/scripted activity)
        const avgTimeDiff = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
        const timingVariance = timeDiffs.reduce((sum, diff) => sum + Math.pow(diff - avgTimeDiff, 2), 0) / timeDiffs.length;
        const timingStdDev = Math.sqrt(timingVariance);
        
        if (timingStdDev / avgTimeDiff < 0.1) {
          isUnusual = true;
          reason += 'Suspiciously regular transaction timing. ';
        }
      }
      
      // Check if transaction flow is predominantly in one direction
      const outgoing = cluster.transactions.filter(tx => tx.sourceAddress === walletAddress).length;
      const incoming = cluster.transactions.filter(tx => tx.destinationAddress === walletAddress).length;
      
      if (cluster.transactions.length >= 5 && (outgoing === 0 || incoming === 0)) {
        isUnusual = true;
        reason += `One-directional transaction flow (${outgoing === 0 ? 'all incoming' : 'all outgoing'}). `;
      }
      
      // Flag potential wash trading or circular fund movements
      const uniqueCounterparties = new Set<string>();
      cluster.transactions.forEach(tx => {
        if (tx.sourceAddress !== walletAddress) uniqueCounterparties.add(tx.sourceAddress);
        if (tx.destinationAddress !== walletAddress) uniqueCounterparties.add(tx.destinationAddress);
      });
      
      if (cluster.transactions.length > 5 && uniqueCounterparties.size <= 2) {
        isSuspicious = true;
        reason += 'Potential wash trading or circular fund movement. ';
      }
      
      // Check for unusual number of transactions with same counterparty
      const counterpartyFrequency: Record<string, number> = {};
      cluster.transactions.forEach(tx => {
        const counterparty = tx.sourceAddress === walletAddress ? tx.destinationAddress : tx.sourceAddress;
        counterpartyFrequency[counterparty] = (counterpartyFrequency[counterparty] || 0) + 1;
      });
      
      const maxFrequency = Math.max(...Object.values(counterpartyFrequency));
      if (maxFrequency > cluster.transactions.length * 0.7) {
        isUnusual = true;
        reason += 'High concentration of transactions with single counterparty. ';
      }
      
      // Update cluster type and description if needed
      if (isSuspicious) {
        cluster.type = 'suspicious';
        cluster.description = reason + cluster.description;
      } else if (isUnusual) {
        cluster.type = 'unusual';
        cluster.description = reason + cluster.description;
      }
      
      return cluster;
    });
  }

  /**
   * Helper to create a new transaction cluster
   */
  private createCluster(
    transactions: Transaction[], 
    description: string, 
    score: number,
    type: 'normal' | 'unusual' | 'suspicious',
    metadata?: Record<string, any>
  ): TransactionCluster {
    // Extract unique wallets involved in the transactions
    const wallets = new Set<string>();
    transactions.forEach(tx => {
      if (tx.sourceAddress) wallets.add(tx.sourceAddress);
      if (tx.destinationAddress) wallets.add(tx.destinationAddress);
    });
    
    return {
      id: Math.random().toString(36).substring(2, 15),
      transactions,
      wallets: Array.from(wallets),
      createdAt: new Date(),
      score,
      type,
      description,
      metadata
    };
  }

  /**
   * Get associated wallets based on transaction patterns
   */
  async getAssociatedWallets(walletAddress: string, userId?: number): Promise<{ 
    address: string; 
    score: number; 
    reason: string;
    transactionCount: number;
  }[]> {
    // Get clusters for this wallet
    const clusters = await this.clusterTransactions(walletAddress, userId);
    
    // Create a map of wallet -> scores
    const walletScores: Map<string, { score: number; reasons: Set<string>; txCounts: number }> = new Map();
    
    for (const cluster of clusters) {
      // Skip the input wallet
      const otherWallets = cluster.wallets.filter(w => w !== walletAddress);
      
      for (const otherWallet of otherWallets) {
        if (!walletScores.has(otherWallet)) {
          walletScores.set(otherWallet, { score: 0, reasons: new Set(), txCounts: 0 });
        }
        
        const walletInfo = walletScores.get(otherWallet)!;
        
        // Count transactions between these wallets
        const txCount = cluster.transactions.filter(tx => 
          (tx.sourceAddress === walletAddress && tx.destinationAddress === otherWallet) ||
          (tx.sourceAddress === otherWallet && tx.destinationAddress === walletAddress)
        ).length;
        
        // Add points based on cluster type
        let points = 0;
        let reason = '';
        
        switch(cluster.type) {
          case 'normal':
            points = 0.2;
            reason = 'Normal transaction pattern';
            break;
          case 'unusual':
            points = 0.5;
            reason = 'Unusual transaction pattern';
            break;
          case 'suspicious':
            points = 0.8;
            reason = 'Suspicious transaction pattern';
            break;
        }
        
        // Add more points for frequent interactions
        if (txCount >= 5) {
          points += 0.3;
          reason += ', frequent interactions';
        } else if (txCount >= 3) {
          points += 0.1;
          reason += ', multiple interactions';
        }
        
        // Update scores
        walletInfo.score = Math.min(1.0, walletInfo.score + points);
        walletInfo.reasons.add(reason);
        walletInfo.txCounts += txCount;
      }
    }
    
    // Convert map to array and sort by score
    return Array.from(walletScores.entries())
      .map(([address, info]) => ({
        address,
        score: info.score,
        reason: Array.from(info.reasons).join('; '),
        transactionCount: info.txCounts
      }))
      .sort((a, b) => b.score - a.score);
  }
}

// Export a singleton instance
export const transactionClusteringService = new TransactionClusteringService();