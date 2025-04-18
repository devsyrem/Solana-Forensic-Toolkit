import { SolanaTransactionDetail } from "@/types/solana";
import { detectTransactionType } from "@/lib/utils";

export interface FundingSource {
  address: string;
  label?: string;
  initialTransactionSignature: string;
  initialTransactionTimestamp: number;
  totalAmount: number;
  lastSeen?: number;
  frequency?: number; // Number of transactions
  riskScore?: number; // 0-100, higher means higher risk
  confidence: number; // 0-100, confidence that this is indeed a funding source
}

export interface ActivityPattern {
  type: 'temporal' | 'value' | 'endpoint' | 'behavior';
  name: string;
  description: string;
  frequency: number; // Number of occurrences
  risk: number; // 0-100, higher means higher risk
  confidence: number; // 0-100, confidence in this pattern
  examples: string[]; // Transaction signatures exhibiting this pattern
  firstSeen: number;
  lastSeen: number;
}

export interface WalletAnalysisResult {
  fundingSources: FundingSource[];
  activityPatterns: ActivityPattern[];
  totalInflow: number;
  totalOutflow: number;
  primaryActivity?: string;
  riskScore: number; // 0-100, higher means higher risk
  analysisTimestamp: number;
}

/**
 * Primary function to analyze wallet activity and funding sources
 */
export function analyzeWallet(
  transactions: SolanaTransactionDetail[],
  walletAddress: string
): WalletAnalysisResult {
  if (!transactions || transactions.length === 0) {
    return {
      fundingSources: [],
      activityPatterns: [],
      totalInflow: 0,
      totalOutflow: 0,
      riskScore: 0,
      analysisTimestamp: Date.now()
    };
  }
  
  // Track funding sources - wallets sending funds to this wallet
  const fundingSources = identifyFundingSources(transactions, walletAddress);
  
  // Track activity patterns
  const activityPatterns = identifyActivityPatterns(transactions, walletAddress);
  
  // Calculate total inflow and outflow
  const { inflow, outflow } = calculateFlows(transactions, walletAddress);
  
  // Determine primary activity
  const primaryActivity = determinePrimaryActivity(transactions);
  
  // Calculate overall risk score
  const riskScore = calculateRiskScore(fundingSources, activityPatterns);
  
  return {
    fundingSources,
    activityPatterns,
    totalInflow: inflow,
    totalOutflow: outflow,
    primaryActivity,
    riskScore,
    analysisTimestamp: Date.now()
  };
}

/**
 * Identify wallets that have funded this wallet
 */
function identifyFundingSources(
  transactions: SolanaTransactionDetail[],
  walletAddress: string
): FundingSource[] {
  const fundingSources: Map<string, FundingSource> = new Map();
  
  // Get transactions sorted by timestamp (oldest first)
  const sortedTxs = [...transactions].sort((a, b) => {
    const aTime = a.blockTime || 0;
    const bTime = b.blockTime || 0;
    return aTime - bTime;
  });
  
  // Look for transactions sending funds to this wallet
  sortedTxs.forEach(tx => {
    if (isIncomingTransaction(tx, walletAddress)) {
      // Find the sender
      const sender = findSender(tx, walletAddress);
      
      if (!sender) return;
      
      const amount = estimateTransactionValue(tx);
      const timestamp = tx.blockTime ? tx.blockTime * 1000 : Date.now();
      
      if (fundingSources.has(sender)) {
        // Update existing funding source
        const source = fundingSources.get(sender)!;
        source.totalAmount += amount;
        source.lastSeen = timestamp;
        source.frequency = (source.frequency || 0) + 1;
        
        // Update confidence and risk scores based on frequency
        source.confidence = Math.min(source.confidence + 5, 100);
        
        fundingSources.set(sender, source);
      } else {
        // Create new funding source
        fundingSources.set(sender, {
          address: sender,
          initialTransactionSignature: tx.signature,
          initialTransactionTimestamp: timestamp,
          totalAmount: amount,
          lastSeen: timestamp,
          frequency: 1,
          confidence: 60, // Initial confidence
        });
      }
    }
  });
  
  // Sort funding sources by total amount (descending)
  return Array.from(fundingSources.values())
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * Identify recurring patterns in wallet activity
 */
function identifyActivityPatterns(
  transactions: SolanaTransactionDetail[],
  walletAddress: string
): ActivityPattern[] {
  const patterns: ActivityPattern[] = [];
  
  // Look for temporal patterns (regular transactions at specific times)
  const temporalPattern = findTemporalPatterns(transactions, walletAddress);
  if (temporalPattern) patterns.push(temporalPattern);
  
  // Look for value patterns (repeated transaction amounts)
  const valuePatterns = findValuePatterns(transactions, walletAddress);
  patterns.push(...valuePatterns);
  
  // Look for frequent endpoints (common transaction counterparties)
  const endpointPatterns = findEndpointPatterns(transactions, walletAddress);
  patterns.push(...endpointPatterns);
  
  // Look for behavioral patterns (specific transaction sequences)
  const behaviorPatterns = findBehavioralPatterns(transactions, walletAddress);
  patterns.push(...behaviorPatterns);
  
  return patterns;
}

/**
 * Find temporal patterns in transactions
 */
function findTemporalPatterns(
  transactions: SolanaTransactionDetail[],
  walletAddress: string
): ActivityPattern | null {
  if (transactions.length < 5) return null;
  
  // Sort transactions by timestamp
  const sortedTxs = [...transactions].filter(tx => tx.blockTime)
    .sort((a, b) => (a.blockTime || 0) - (b.blockTime || 0));
  
  if (sortedTxs.length < 5) return null;
  
  // Group transactions by hour of day
  const hourDistribution = new Array(24).fill(0);
  
  sortedTxs.forEach(tx => {
    if (!tx.blockTime) return;
    
    const date = new Date(tx.blockTime * 1000);
    const hour = date.getUTCHours();
    hourDistribution[hour]++;
  });
  
  // Find the peak activity hour
  const maxHour = hourDistribution.indexOf(Math.max(...hourDistribution));
  const maxCount = hourDistribution[maxHour];
  
  // If at least 30% of transactions happen during the same hour, consider it a pattern
  if (maxCount >= sortedTxs.length * 0.3 && maxCount >= 3) {
    // Get example transactions from this hour
    const examples = sortedTxs
      .filter(tx => {
        if (!tx.blockTime) return false;
        const date = new Date(tx.blockTime * 1000);
        return date.getUTCHours() === maxHour;
      })
      .slice(0, 5)
      .map(tx => tx.signature);
    
    return {
      type: 'temporal',
      name: 'Regular Time Activity',
      description: `${maxCount} transactions consistently occur during hour ${maxHour} UTC`,
      frequency: maxCount,
      risk: 20, // Low risk for temporal patterns
      confidence: 70,
      examples,
      firstSeen: sortedTxs[0].blockTime! * 1000,
      lastSeen: sortedTxs[sortedTxs.length - 1].blockTime! * 1000
    };
  }
  
  return null;
}

/**
 * Find value patterns in transactions
 */
function findValuePatterns(
  transactions: SolanaTransactionDetail[],
  walletAddress: string
): ActivityPattern[] {
  const patterns: ActivityPattern[] = [];
  
  // Group transactions by value
  const valueMap: Map<number, SolanaTransactionDetail[]> = new Map();
  
  transactions.forEach(tx => {
    const value = Math.round(estimateTransactionValue(tx) * 1000) / 1000; // Round to 3 decimal places
    if (value > 0) {
      if (!valueMap.has(value)) {
        valueMap.set(value, []);
      }
      valueMap.get(value)!.push(tx);
    }
  });
  
  // Find values that occur frequently
  valueMap.forEach((txs, value) => {
    if (txs.length >= 3) {
      // Sort transactions by time
      txs.sort((a, b) => (a.blockTime || 0) - (b.blockTime || 0));
      
      patterns.push({
        type: 'value',
        name: 'Repeated Transaction Amount',
        description: `${txs.length} transactions with identical value of ${value} SOL`,
        frequency: txs.length,
        risk: txs.length > 10 ? 40 : 20, // Higher risk for very repetitive patterns
        confidence: 75,
        examples: txs.slice(0, 5).map(tx => tx.signature),
        firstSeen: txs[0].blockTime ? txs[0].blockTime * 1000 : Date.now(),
        lastSeen: txs[txs.length - 1].blockTime ? txs[txs.length - 1].blockTime * 1000 : Date.now()
      });
    }
  });
  
  return patterns;
}

/**
 * Find common transaction counterparties
 */
function findEndpointPatterns(
  transactions: SolanaTransactionDetail[],
  walletAddress: string
): ActivityPattern[] {
  const patterns: ActivityPattern[] = [];
  
  // Group transactions by counterparty
  const counterpartyMap: Map<string, SolanaTransactionDetail[]> = new Map();
  
  transactions.forEach(tx => {
    const counterparty = findCounterparty(tx, walletAddress);
    if (counterparty) {
      if (!counterpartyMap.has(counterparty)) {
        counterpartyMap.set(counterparty, []);
      }
      counterpartyMap.get(counterparty)!.push(tx);
    }
  });
  
  // Find counterparties that occur frequently
  counterpartyMap.forEach((txs, counterparty) => {
    if (txs.length >= 5) {
      // Sort transactions by time
      txs.sort((a, b) => (a.blockTime || 0) - (b.blockTime || 0));
      
      patterns.push({
        type: 'endpoint',
        name: 'Frequent Counterparty',
        description: `${txs.length} transactions with address ${counterparty.slice(0, 8)}...`,
        frequency: txs.length,
        risk: 30, // Medium risk for frequent counterparty
        confidence: 80,
        examples: txs.slice(0, 5).map(tx => tx.signature),
        firstSeen: txs[0].blockTime ? txs[0].blockTime * 1000 : Date.now(),
        lastSeen: txs[txs.length - 1].blockTime ? txs[txs.length - 1].blockTime * 1000 : Date.now()
      });
    }
  });
  
  return patterns;
}

/**
 * Find behavioral patterns (specific transaction sequences)
 */
function findBehavioralPatterns(
  transactions: SolanaTransactionDetail[],
  walletAddress: string
): ActivityPattern[] {
  const patterns: ActivityPattern[] = [];
  
  // Sort transactions by time
  const sortedTxs = [...transactions].filter(tx => tx.blockTime)
    .sort((a, b) => (a.blockTime || 0) - (b.blockTime || 0));
  
  if (sortedTxs.length < 5) return patterns;
  
  // Look for receive-then-disperse pattern
  const dispersePatterns = findReceiveDispersePatterns(sortedTxs, walletAddress);
  if (dispersePatterns) patterns.push(dispersePatterns);
  
  // Look for circular transactions
  const circularPatterns = findCircularTransactions(sortedTxs, walletAddress);
  if (circularPatterns) patterns.push(circularPatterns);
  
  return patterns;
}

/**
 * Find receive-then-disperse patterns
 */
function findReceiveDispersePatterns(
  sortedTxs: SolanaTransactionDetail[],
  walletAddress: string
): ActivityPattern | null {
  const receiveDispersePairs: {receive: SolanaTransactionDetail, disperse: SolanaTransactionDetail[]}[] = [];
  
  // Look for receive transactions followed closely by multiple disperse transactions
  for (let i = 0; i < sortedTxs.length - 1; i++) {
    const receiveTx = sortedTxs[i];
    
    if (isIncomingTransaction(receiveTx, walletAddress)) {
      const receiveTime = receiveTx.blockTime || 0;
      const disperseTxs: SolanaTransactionDetail[] = [];
      
      // Look for disperse transactions within 1 hour
      for (let j = i + 1; j < sortedTxs.length; j++) {
        const tx = sortedTxs[j];
        const txTime = tx.blockTime || 0;
        
        // If more than 1 hour has passed, break
        if (txTime - receiveTime > 3600) break;
        
        if (isOutgoingTransaction(tx, walletAddress)) {
          disperseTxs.push(tx);
        }
      }
      
      // If we find a significant disperse pattern (3+ outgoing txs after a receive)
      if (disperseTxs.length >= 3) {
        receiveDispersePairs.push({
          receive: receiveTx,
          disperse: disperseTxs
        });
        
        // Skip to after this pattern
        i += disperseTxs.length;
      }
    }
  }
  
  if (receiveDispersePairs.length >= 2) {
    // Multiple receive-disperse patterns found
    const totalInstances = receiveDispersePairs.length;
    const totalDisperseTxs = receiveDispersePairs.reduce(
      (sum, pair) => sum + pair.disperse.length, 0
    );
    
    const examples = receiveDispersePairs.slice(0, 2).flatMap(
      pair => [pair.receive.signature, ...pair.disperse.slice(0, 2).map(tx => tx.signature)]
    );
    
    return {
      type: 'behavior',
      name: 'Fund Dispersion Pattern',
      description: `${totalInstances} instances of receiving funds and quickly dispersing to multiple addresses`,
      frequency: totalInstances,
      risk: 70, // High risk behavior
      confidence: 85,
      examples,
      firstSeen: receiveDispersePairs[0].receive.blockTime! * 1000,
      lastSeen: receiveDispersePairs[receiveDispersePairs.length - 1].disperse[
        receiveDispersePairs[receiveDispersePairs.length - 1].disperse.length - 1
      ].blockTime! * 1000
    };
  }
  
  return null;
}

/**
 * Find circular transaction patterns
 */
function findCircularTransactions(
  sortedTxs: SolanaTransactionDetail[],
  walletAddress: string
): ActivityPattern | null {
  // Map of address -> transactions involving that address
  const addressTxMap: Map<string, SolanaTransactionDetail[]> = new Map();
  
  // Populate the map
  sortedTxs.forEach(tx => {
    tx.accountKeys.forEach(address => {
      if (address !== walletAddress) {
        if (!addressTxMap.has(address)) {
          addressTxMap.set(address, []);
        }
        addressTxMap.get(address)!.push(tx);
      }
    });
  });
  
  // Look for addresses involved in multiple transactions
  const circularCandidates: {address: string, txs: SolanaTransactionDetail[]}[] = [];
  
  addressTxMap.forEach((txs, address) => {
    if (txs.length >= 2) {
      // Check if there are both incoming and outgoing transactions
      const hasIncoming = txs.some(tx => isIncomingTransaction(tx, walletAddress));
      const hasOutgoing = txs.some(tx => isOutgoingTransaction(tx, walletAddress));
      
      if (hasIncoming && hasOutgoing) {
        circularCandidates.push({address, txs});
      }
    }
  });
  
  if (circularCandidates.length >= 2) {
    // Sort by number of transactions
    circularCandidates.sort((a, b) => b.txs.length - a.txs.length);
    
    const topCandidate = circularCandidates[0];
    const examples = topCandidate.txs.slice(0, 5).map(tx => tx.signature);
    
    // Sort transactions by time
    topCandidate.txs.sort((a, b) => (a.blockTime || 0) - (b.blockTime || 0));
    
    return {
      type: 'behavior',
      name: 'Circular Fund Movement',
      description: `Funds repeatedly move between this wallet and ${circularCandidates.length} other addresses`,
      frequency: circularCandidates.reduce((sum, c) => sum + c.txs.length, 0),
      risk: 60, // Medium-high risk
      confidence: 75,
      examples,
      firstSeen: topCandidate.txs[0].blockTime! * 1000,
      lastSeen: topCandidate.txs[topCandidate.txs.length - 1].blockTime! * 1000
    };
  }
  
  return null;
}

/**
 * Calculate total inflow and outflow for a wallet
 */
function calculateFlows(
  transactions: SolanaTransactionDetail[],
  walletAddress: string
): { inflow: number, outflow: number } {
  let inflow = 0;
  let outflow = 0;
  
  transactions.forEach(tx => {
    const value = estimateTransactionValue(tx);
    
    if (isIncomingTransaction(tx, walletAddress)) {
      inflow += value;
    } else if (isOutgoingTransaction(tx, walletAddress)) {
      outflow += value;
    }
  });
  
  return { inflow, outflow };
}

/**
 * Determine the primary activity type for this wallet
 */
function determinePrimaryActivity(transactions: SolanaTransactionDetail[]): string | undefined {
  if (transactions.length === 0) return undefined;
  
  // Count transactions by type
  const typeCounts: Record<string, number> = {};
  
  transactions.forEach(tx => {
    const type = detectTransactionType(tx);
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });
  
  // Find the most common type
  let maxType = '';
  let maxCount = 0;
  
  Object.entries(typeCounts).forEach(([type, count]) => {
    if (count > maxCount) {
      maxType = type;
      maxCount = count;
    }
  });
  
  // Only return if it's a significant portion of transactions
  if (maxCount >= transactions.length * 0.4) {
    return maxType;
  }
  
  return undefined;
}

/**
 * Calculate overall risk score based on funding sources and activity patterns
 */
function calculateRiskScore(
  fundingSources: FundingSource[],
  activityPatterns: ActivityPattern[]
): number {
  // Base risk score
  let riskScore = 20;
  
  // Adjust based on funding sources
  if (fundingSources.length === 0) {
    // No funding sources identified - could be suspicious
    riskScore += 10;
  } else if (fundingSources.length > 10) {
    // Many funding sources - could be suspicious
    riskScore += 15;
  }
  
  // Add risk from activity patterns
  const patternRisk = activityPatterns.reduce((sum, pattern) => {
    return sum + (pattern.risk * (pattern.confidence / 100));
  }, 0);
  
  riskScore += Math.min(patternRisk / activityPatterns.length, 50);
  
  // Cap risk score at 100
  return Math.min(Math.round(riskScore), 100);
}

/**
 * Simplified check for incoming transaction to an address
 * In a real app, this would analyze the transaction instructions in detail
 */
function isIncomingTransaction(
  tx: SolanaTransactionDetail,
  address: string
): boolean {
  return tx.accountKeys.includes(address) && Math.random() > 0.4;
}

/**
 * Simplified check for outgoing transaction from an address
 * In a real app, this would analyze the transaction instructions in detail
 */
function isOutgoingTransaction(
  tx: SolanaTransactionDetail,
  address: string
): boolean {
  return tx.accountKeys.includes(address) && Math.random() > 0.6;
}

/**
 * Find the sender in a transaction
 */
function findSender(
  tx: SolanaTransactionDetail,
  recipientAddress: string
): string | null {
  // This is a simplified implementation
  // In a real app, we would analyze the transaction instructions in detail
  
  const accounts = tx.accountKeys.filter(account => account !== recipientAddress);
  
  if (accounts.length === 0) return null;
  
  // Just return the first non-recipient account for simplicity
  return accounts[0];
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
 * Helper function to estimate the SOL value of a transaction
 */
function estimateTransactionValue(tx: SolanaTransactionDetail): number {
  // This is a simplified implementation
  // In a real app, we would parse the transaction instructions in detail
  
  // For this demo, we'll just use a random value between 0 and 20 SOL
  return Math.random() * 20;
}