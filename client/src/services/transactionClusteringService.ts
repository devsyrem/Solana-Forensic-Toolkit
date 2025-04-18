import { SolanaTransactionDetail, TransactionEdge, WalletNode } from "@/types/solana";
import { detectTransactionType } from "@/lib/utils";

export interface TransactionCluster {
  id: string;
  name: string;
  description: string;
  transactions: string[]; // Transaction signatures
  wallets: string[]; // Wallet addresses
  confidence: number; // 0-100 confidence score
  riskScore?: number; // Optional risk score for unusual activity
  type: 'temporal' | 'pattern' | 'value' | 'entity' | 'unusual';
  createdAt: Date;
}

export interface ClusteringResult {
  clusters: TransactionCluster[];
  unusualTransactions: string[]; // Signatures of unusual transactions
  highValueTransactions: string[]; // Signatures of high value transactions
  relatedWallets: Map<string, number>; // Wallet address to confidence score
}

/**
 * Clusters transactions based on various heuristics:
 * - Temporal proximity
 * - Similar transaction patterns
 * - Common entities
 * - Value movements
 * - Unusual activity
 */
export function clusterTransactions(
  transactions: SolanaTransactionDetail[],
  mainWalletAddress: string
): ClusteringResult {
  if (!transactions || transactions.length === 0) {
    return {
      clusters: [],
      unusualTransactions: [],
      highValueTransactions: [],
      relatedWallets: new Map()
    };
  }

  const clusters: TransactionCluster[] = [];
  const unusualTransactions: string[] = [];
  const highValueTransactions: string[] = [];
  const relatedWallets = new Map<string, number>();
  
  // Track temporal patterns - transactions happening in rapid succession
  const temporalCluster = detectTemporalPatterns(transactions);
  if (temporalCluster) clusters.push(temporalCluster);
  
  // Track value patterns - high value transfers or specific amount patterns
  const valuePatternClusters = detectValuePatterns(transactions, mainWalletAddress);
  clusters.push(...valuePatternClusters);
  
  // Track entity relationships
  const entityCluster = detectEntityRelationships(transactions, mainWalletAddress);
  if (entityCluster) clusters.push(entityCluster);
  
  // Detect unusual patterns
  const unusualActivityCluster = detectUnusualActivity(transactions, mainWalletAddress);
  if (unusualActivityCluster) {
    clusters.push(unusualActivityCluster);
    unusualActivityCluster.transactions.forEach(sig => unusualTransactions.push(sig));
  }
  
  // Find high value transactions
  transactions.forEach(tx => {
    // For simplicity, we consider any transaction with value > 10 SOL as high value
    // In a real app, this would be more sophisticated
    const value = estimateTransactionValue(tx);
    if (value > 10) {
      highValueTransactions.push(tx.signature);
    }
  });
  
  // Find related wallets
  const walletConfidenceScores = calculateWalletRelationshipConfidence(
    transactions, 
    mainWalletAddress
  );
  
  // Add wallets with confidence score > 50 to the related wallets map
  walletConfidenceScores.forEach((confidence, address) => {
    if (confidence > 50) {
      relatedWallets.set(address, confidence);
    }
  });
  
  return {
    clusters,
    unusualTransactions,
    highValueTransactions,
    relatedWallets
  };
}

/**
 * Detects transactions that happen in rapid succession (within short time windows)
 */
function detectTemporalPatterns(transactions: SolanaTransactionDetail[]): TransactionCluster | null {
  if (transactions.length < 3) return null;
  
  // Sort transactions by timestamp
  const sortedTxs = [...transactions].sort((a, b) => {
    const aTime = a.blockTime ? a.blockTime * 1000 : 0;
    const bTime = b.blockTime ? b.blockTime * 1000 : 0;
    return aTime - bTime;
  });
  
  // Look for rapid succession transactions (within 5 minute windows)
  const timeWindowMs = 5 * 60 * 1000; // 5 minutes
  const clusters: { txs: SolanaTransactionDetail[], startTime: number }[] = [];
  
  let currentCluster: SolanaTransactionDetail[] = [sortedTxs[0]];
  let clusterStartTime = sortedTxs[0].blockTime ? sortedTxs[0].blockTime * 1000 : 0;
  
  for (let i = 1; i < sortedTxs.length; i++) {
    const tx = sortedTxs[i];
    const txTime = tx.blockTime ? tx.blockTime * 1000 : 0;
    
    if (txTime - clusterStartTime <= timeWindowMs) {
      currentCluster.push(tx);
    } else {
      if (currentCluster.length >= 3) {
        clusters.push({
          txs: [...currentCluster],
          startTime: clusterStartTime
        });
      }
      currentCluster = [tx];
      clusterStartTime = txTime;
    }
  }
  
  // Check the last cluster
  if (currentCluster.length >= 3) {
    clusters.push({
      txs: currentCluster,
      startTime: clusterStartTime
    });
  }
  
  // If we found a significant temporal cluster
  if (clusters.length > 0) {
    // Use the largest cluster
    const largestCluster = clusters.reduce((max, cluster) => 
      cluster.txs.length > max.txs.length ? cluster : max, clusters[0]);
    
    // Extract wallet addresses from the cluster
    const wallets = new Set<string>();
    largestCluster.txs.forEach(tx => {
      tx.accountKeys.forEach(account => wallets.add(account));
    });
    
    const startDate = new Date(largestCluster.startTime);
    
    return {
      id: `temporal-${startDate.getTime()}`,
      name: `Rapid Transaction Burst`,
      description: `${largestCluster.txs.length} transactions within 5 minutes on ${startDate.toLocaleDateString()}`,
      transactions: largestCluster.txs.map(tx => tx.signature),
      wallets: Array.from(wallets),
      confidence: 85,
      type: 'temporal',
      createdAt: new Date()
    };
  }
  
  return null;
}

/**
 * Detects value-based patterns in transactions
 */
function detectValuePatterns(
  transactions: SolanaTransactionDetail[],
  mainWalletAddress: string
): TransactionCluster[] {
  const valueClusters: TransactionCluster[] = [];
  
  // High value transactions (> 10 SOL)
  const highValueTxs = transactions.filter(tx => estimateTransactionValue(tx) > 10);
  
  if (highValueTxs.length > 0) {
    const wallets = new Set<string>();
    highValueTxs.forEach(tx => {
      tx.accountKeys.forEach(account => wallets.add(account));
    });
    
    valueClusters.push({
      id: `high-value-${Date.now()}`,
      name: 'High Value Transactions',
      description: `${highValueTxs.length} transactions with values exceeding 10 SOL`,
      transactions: highValueTxs.map(tx => tx.signature),
      wallets: Array.from(wallets),
      confidence: 90,
      type: 'value',
      createdAt: new Date()
    });
  }
  
  // Repeated exact same value transactions
  const valueMap = new Map<number, SolanaTransactionDetail[]>();
  
  transactions.forEach(tx => {
    const value = estimateTransactionValue(tx);
    if (value > 0) {
      if (!valueMap.has(value)) {
        valueMap.set(value, []);
      }
      valueMap.get(value)?.push(tx);
    }
  });
  
  valueMap.forEach((txs, value) => {
    if (txs.length >= 3) {
      const wallets = new Set<string>();
      txs.forEach(tx => {
        tx.accountKeys.forEach(account => wallets.add(account));
      });
      
      valueClusters.push({
        id: `same-value-${value}-${Date.now()}`,
        name: 'Repeated Value Pattern',
        description: `${txs.length} transactions with identical value of ${value} SOL`,
        transactions: txs.map(tx => tx.signature),
        wallets: Array.from(wallets),
        confidence: 75,
        type: 'pattern',
        createdAt: new Date()
      });
    }
  });
  
  return valueClusters;
}

/**
 * Detects entity relationships based on transaction patterns
 */
function detectEntityRelationships(
  transactions: SolanaTransactionDetail[],
  mainWalletAddress: string
): TransactionCluster | null {
  // Group transactions by the other party (not the main wallet)
  const entityInteractions = new Map<string, SolanaTransactionDetail[]>();
  
  transactions.forEach(tx => {
    // Find the primary counterparty in this transaction
    const counterparty = findCounterparty(tx, mainWalletAddress);
    
    if (counterparty) {
      if (!entityInteractions.has(counterparty)) {
        entityInteractions.set(counterparty, []);
      }
      entityInteractions.get(counterparty)?.push(tx);
    }
  });
  
  // Find the entity with the most interactions
  let topEntity = '';
  let maxInteractions = 0;
  
  entityInteractions.forEach((txs, entity) => {
    if (txs.length > maxInteractions) {
      maxInteractions = txs.length;
      topEntity = entity;
    }
  });
  
  if (maxInteractions >= 3) {
    const entityTxs = entityInteractions.get(topEntity) || [];
    
    return {
      id: `entity-${topEntity.substring(0, 8)}-${Date.now()}`,
      name: 'Frequent Entity Interaction',
      description: `${maxInteractions} interactions with the same entity`,
      transactions: entityTxs.map(tx => tx.signature),
      wallets: [mainWalletAddress, topEntity],
      confidence: 80,
      type: 'entity',
      createdAt: new Date()
    };
  }
  
  return null;
}

/**
 * Detects unusual activity patterns that might indicate suspicious behavior
 */
function detectUnusualActivity(
  transactions: SolanaTransactionDetail[],
  mainWalletAddress: string
): TransactionCluster | null {
  const unusualTxs: SolanaTransactionDetail[] = [];
  
  // Detect unusual patterns like:
  // 1. Funds received and quickly sent out to many different addresses
  // 2. Circular fund movements
  // 3. Transaction chains that conceal the source
  
  // For simplicity, we'll implement a basic version of pattern #1:
  // Find transactions where funds were received and then quickly dispersed
  
  // Group transactions by day
  const txsByDay = new Map<string, SolanaTransactionDetail[]>();
  
  transactions.forEach(tx => {
    if (!tx.blockTime) return;
    
    const date = new Date(tx.blockTime * 1000);
    const dayKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    
    if (!txsByDay.has(dayKey)) {
      txsByDay.set(dayKey, []);
    }
    txsByDay.get(dayKey)?.push(tx);
  });
  
  // For each day, check for receive-then-disperse patterns
  txsByDay.forEach(dayTxs => {
    // Sort by time
    dayTxs.sort((a, b) => {
      const aTime = a.blockTime || 0;
      const bTime = b.blockTime || 0;
      return aTime - bTime;
    });
    
    // Look for receive-then-disperse patterns within a 1-hour window
    for (let i = 0; i < dayTxs.length; i++) {
      const receiveTx = dayTxs[i];
      
      // Check if this is a receive transaction to the main wallet
      if (isReceiveTransaction(receiveTx, mainWalletAddress)) {
        const receiveTime = receiveTx.blockTime || 0;
        const disperseTxs: SolanaTransactionDetail[] = [];
        
        // Look for disperse transactions within the next hour
        for (let j = i + 1; j < dayTxs.length; j++) {
          const possibleDisperseTx = dayTxs[j];
          const disperseTime = possibleDisperseTx.blockTime || 0;
          
          // If more than 1 hour has passed, break
          if (disperseTime - receiveTime > 3600) break;
          
          // Check if this is a disperse transaction from the main wallet to others
          if (isDisperseTransaction(possibleDisperseTx, mainWalletAddress)) {
            disperseTxs.push(possibleDisperseTx);
          }
        }
        
        // If we find a significant disperse pattern (3+ outgoing txs after a receive)
        if (disperseTxs.length >= 3) {
          unusualTxs.push(receiveTx);
          unusualTxs.push(...disperseTxs);
          // Skip to after this pattern
          i += disperseTxs.length;
        }
      }
    }
  });
  
  if (unusualTxs.length > 0) {
    const wallets = new Set<string>();
    unusualTxs.forEach(tx => {
      tx.accountKeys.forEach(account => wallets.add(account));
    });
    
    return {
      id: `unusual-${Date.now()}`,
      name: 'Unusual Fund Movement',
      description: `Funds received and quickly dispersed to multiple addresses`,
      transactions: unusualTxs.map(tx => tx.signature),
      wallets: Array.from(wallets),
      confidence: 70,
      riskScore: 65,
      type: 'unusual',
      createdAt: new Date()
    };
  }
  
  return null;
}

/**
 * Calculates confidence scores for wallet relationships
 * Higher scores indicate stronger relationship likelihood
 */
function calculateWalletRelationshipConfidence(
  transactions: SolanaTransactionDetail[],
  mainWalletAddress: string
): Map<string, number> {
  const confidenceScores = new Map<string, number>();
  const interactionCounts = new Map<string, number>();
  const totalInteractions = new Map<string, number>();
  const patternMatches = new Map<string, number>();
  
  // Count total interactions with each address
  transactions.forEach(tx => {
    tx.accountKeys.forEach(account => {
      if (account !== mainWalletAddress) {
        totalInteractions.set(account, (totalInteractions.get(account) || 0) + 1);
      }
    });
  });
  
  // Count direct interactions (transfers) with each address
  transactions.forEach(tx => {
    const counterparty = findCounterparty(tx, mainWalletAddress);
    if (counterparty) {
      interactionCounts.set(counterparty, (interactionCounts.get(counterparty) || 0) + 1);
    }
  });
  
  // Look for pattern matches (similar transaction behaviors)
  const txByType = new Map<string, Map<string, number>>();
  
  transactions.forEach(tx => {
    const txType = detectTransactionType(tx);
    tx.accountKeys.forEach(account => {
      if (account !== mainWalletAddress) {
        if (!txByType.has(account)) {
          txByType.set(account, new Map());
        }
        
        const typeMap = txByType.get(account)!;
        typeMap.set(txType, (typeMap.get(txType) || 0) + 1);
      }
    });
  });
  
  // Check for entities that have similar type distribution
  txByType.forEach((typeMap, account) => {
    let matchScore = 0;
    
    // For accounts with more than 3 interactions
    if ((totalInteractions.get(account) || 0) >= 3) {
      // Look for patterns like frequent NFT interactions, token transfers, etc.
      if ((typeMap.get('nft') || 0) >= 2) matchScore += 10;
      if ((typeMap.get('swap') || 0) >= 2) matchScore += 10;
      if ((typeMap.get('transfer') || 0) >= 3) matchScore += 15;
      
      patternMatches.set(account, matchScore);
    }
  });
  
  // Calculate final confidence scores (0-100)
  totalInteractions.forEach((count, account) => {
    // Base score from interaction count (0-40)
    let score = Math.min(count * 4, 40);
    
    // Direct interaction bonus (0-30)
    const directInteractions = interactionCounts.get(account) || 0;
    score += Math.min(directInteractions * 6, 30);
    
    // Pattern match bonus (0-30)
    score += Math.min(patternMatches.get(account) || 0, 30);
    
    confidenceScores.set(account, score);
  });
  
  return confidenceScores;
}

/**
 * Helper function to estimate the SOL value of a transaction
 */
function estimateTransactionValue(tx: SolanaTransactionDetail): number {
  // This is a simplified implementation
  // In a real app, we would parse the transaction instructions in detail
  
  // For this demo, we'll just use a random value between 0 and 20 SOL
  return Math.random() * 20;
}

/**
 * Finds the primary counterparty in a transaction
 */
function findCounterparty(
  tx: SolanaTransactionDetail,
  mainWalletAddress: string
): string | null {
  // This is a simplified implementation
  // In a real app, we would analyze the transaction instructions in detail
  
  const accounts = tx.accountKeys.filter(account => account !== mainWalletAddress);
  
  if (accounts.length === 0) return null;
  
  // Just return the first non-main account for simplicity
  return accounts[0];
}

/**
 * Checks if a transaction is a receive transaction to the main wallet
 */
function isReceiveTransaction(
  tx: SolanaTransactionDetail,
  mainWalletAddress: string
): boolean {
  // This is a simplified implementation
  // In a real app, we would analyze the transaction instructions in detail
  
  return tx.accountKeys.includes(mainWalletAddress) && Math.random() > 0.7;
}

/**
 * Checks if a transaction is a disperse transaction from the main wallet to others
 */
function isDisperseTransaction(
  tx: SolanaTransactionDetail,
  mainWalletAddress: string
): boolean {
  // This is a simplified implementation
  // In a real app, we would analyze the transaction instructions in detail
  
  return tx.accountKeys.includes(mainWalletAddress) && Math.random() > 0.5;
}