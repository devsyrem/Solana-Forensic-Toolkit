import { SolanaTransactionDetail, VisualizationGraph, WalletNode, TransactionEdge } from "@/types/solana";
import { detectTransactionType } from "@/lib/utils";
import { clusterTransactions, TransactionCluster } from "./transactionClusteringService";
import { identifyEntities, EntityLabel } from "./entityLabelingService";
import { analyzeWallet, WalletAnalysisResult, FundingSource, ActivityPattern } from "./walletAnalysisService";

export interface TransactionFlowResult {
  // Core visualization data
  graph: VisualizationGraph;
  
  // Analysis results
  walletAnalysis: WalletAnalysisResult;
  entityLabels: EntityLabel[];
  transactionClusters: TransactionCluster[];
  
  // Critical path information
  criticalPaths: {
    description: string;
    edges: string[];
    risk: number;
  }[];
  
  // Timeline and statistics data
  timelineData: Array<{
    date: Date;
    totalTransactions: number;
    transactionsByType: Record<string, number>;
  }>;
  
  // Aggregated metrics
  metrics: {
    totalTransactions: number;
    uniqueAddresses: number;
    totalVolume: number;
    riskScore: number;
    unusualTransactionsCount: number;
  };
}

export interface TransactionFlowFilters {
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  transactionTypes?: string[];
  addressFilter?: string;
  onlyUnusual?: boolean;
  onlyHighValue?: boolean;
  onlyCriticalPaths?: boolean;
  entityTypes?: string[];
}

/**
 * Main service function to generate transaction flow visualization and analysis data
 */
export function generateTransactionFlow(
  transactions: SolanaTransactionDetail[],
  mainWalletAddress: string,
  filters: TransactionFlowFilters = {}
): TransactionFlowResult {
  // Apply filters to transactions
  const filteredTransactions = applyFilters(transactions, filters);
  
  if (filteredTransactions.length === 0) {
    return createEmptyResult();
  }
  
  // Generate the core visualization graph
  const graph = buildTransactionGraph(filteredTransactions, mainWalletAddress);
  
  // Run wallet analysis
  const walletAnalysis = analyzeWallet(filteredTransactions, mainWalletAddress);
  
  // Run entity labeling
  const entityLabels = identifyEntities(filteredTransactions, mainWalletAddress);
  
  // Run transaction clustering
  const clusteringResult = clusterTransactions(filteredTransactions, mainWalletAddress);
  
  // Identify critical transaction paths
  const criticalPaths = identifyCriticalPaths(
    filteredTransactions, 
    mainWalletAddress, 
    walletAnalysis, 
    clusteringResult.unusualTransactions
  );
  
  // Generate timeline data
  const timelineData = generateTimelineData(filteredTransactions);
  
  // Calculate aggregated metrics
  const metrics = calculateMetrics(
    filteredTransactions, 
    graph, 
    walletAnalysis, 
    clusteringResult
  );
  
  return {
    graph,
    walletAnalysis,
    entityLabels,
    transactionClusters: clusteringResult.clusters,
    criticalPaths,
    timelineData,
    metrics
  };
}

/**
 * Apply filters to transactions
 */
function applyFilters(
  transactions: SolanaTransactionDetail[],
  filters: TransactionFlowFilters
): SolanaTransactionDetail[] {
  if (!transactions || transactions.length === 0) return [];
  
  return transactions.filter(tx => {
    // Date filters
    if (filters.startDate && tx.blockTime) {
      const txDate = new Date(tx.blockTime * 1000);
      if (txDate < filters.startDate) return false;
    }
    
    if (filters.endDate && tx.blockTime) {
      const txDate = new Date(tx.blockTime * 1000);
      if (txDate > filters.endDate) return false;
    }
    
    // Amount filters
    const amount = estimateTransactionValue(tx);
    if (filters.minAmount !== undefined && amount < filters.minAmount) return false;
    if (filters.maxAmount !== undefined && amount > filters.maxAmount) return false;
    
    // Transaction type filters
    if (filters.transactionTypes && filters.transactionTypes.length > 0) {
      const txType = detectTransactionType(tx);
      if (!filters.transactionTypes.includes(txType)) return false;
    }
    
    // Address filter
    if (filters.addressFilter) {
      const hasAddress = tx.accountKeys.some(address => 
        address.toLowerCase().includes(filters.addressFilter!.toLowerCase())
      );
      if (!hasAddress) return false;
    }
    
    return true;
  });
}

/**
 * Build the transaction visualization graph
 */
function buildTransactionGraph(
  transactions: SolanaTransactionDetail[],
  mainWalletAddress: string
): VisualizationGraph {
  const nodes = new Map<string, WalletNode>();
  const edges: TransactionEdge[] = [];
  
  // Add main wallet as a node
  nodes.set(mainWalletAddress, {
    id: mainWalletAddress,
    address: mainWalletAddress,
    type: 'wallet',
    balance: 0, // Will be updated if available
    totalVolume: 0,
    transactionCount: 0,
    lastActivity: new Date(),
  });
  
  // Process each transaction
  transactions.forEach(tx => {
    if (!tx) return;
    
    const txType = detectTransactionType(tx);
    const timestamp = tx.blockTime ? new Date(tx.blockTime * 1000) : new Date();
    
    // Process account keys to create nodes and edges
    tx.accountKeys.forEach(account => {
      if (account === mainWalletAddress) return; // Skip main wallet, already added
      
      if (!nodes.has(account)) {
        // Determine if this is a program or wallet
        const isProgramAccount = tx.instructions.some(ix => 
          ix.programId === account
        );
        
        nodes.set(account, {
          id: account,
          address: account,
          type: isProgramAccount ? 'program' : 'wallet',
          transactionCount: 1,
          lastActivity: timestamp,
        });
      } else {
        // Update existing node
        const node = nodes.get(account)!;
        node.transactionCount = (node.transactionCount || 0) + 1;
        node.lastActivity = new Date(Math.max(
          node.lastActivity?.getTime() || 0,
          timestamp.getTime()
        ));
        nodes.set(account, node);
      }
      
      // Create edge between main wallet and this account
      const edgeId = `${mainWalletAddress}-${account}-${tx.signature}`;
      edges.push({
        id: edgeId,
        source: mainWalletAddress,
        target: account,
        type: txType,
        signature: tx.signature,
        timestamp: timestamp,
      });
    });
  });
  
  return {
    nodes: Array.from(nodes.values()),
    edges
  };
}

/**
 * Identify critical transaction paths
 */
function identifyCriticalPaths(
  transactions: SolanaTransactionDetail[],
  mainWalletAddress: string,
  walletAnalysis: WalletAnalysisResult,
  unusualTransactions: string[]
): { description: string; edges: string[]; risk: number }[] {
  const criticalPaths: { description: string; edges: string[]; risk: number }[] = [];
  
  // 1. High-value funding sources
  const highValueSources = walletAnalysis.fundingSources
    .filter(source => source.totalAmount > 50) // Over 50 SOL
    .slice(0, 3); // Top 3 high value sources
  
  if (highValueSources.length > 0) {
    const sourceAddresses = highValueSources.map(source => source.address);
    const relevantEdges = transactions
      .filter(tx => 
        tx.accountKeys.some(addr => sourceAddresses.includes(addr))
      )
      .map(tx => tx.signature);
    
    if (relevantEdges.length > 0) {
      criticalPaths.push({
        description: `High-value funding source${highValueSources.length > 1 ? 's' : ''}`,
        edges: relevantEdges,
        risk: 30
      });
    }
  }
  
  // 2. Unusual transaction patterns
  if (unusualTransactions.length > 0) {
    criticalPaths.push({
      description: 'Unusual transaction pattern detected',
      edges: unusualTransactions.slice(0, 10), // Limit to 10 edges
      risk: 70
    });
  }
  
  // 3. Find potential mixing patterns (funds moving through multiple wallets)
  const mixingPatterns = walletAnalysis.activityPatterns
    .filter(pattern => 
      pattern.type === 'behavior' && 
      pattern.name.includes('Dispersion') &&
      pattern.risk > 60
    );
  
  if (mixingPatterns.length > 0) {
    criticalPaths.push({
      description: 'Potential mixing pattern detected',
      edges: mixingPatterns[0].examples,
      risk: 80
    });
  }
  
  return criticalPaths;
}

/**
 * Generate transaction timeline data
 */
function generateTimelineData(
  transactions: SolanaTransactionDetail[]
): Array<{ date: Date; totalTransactions: number; transactionsByType: Record<string, number> }> {
  if (transactions.length === 0) return [];
  
  // Group transactions by day
  const txsByDay = new Map<string, {
    date: Date;
    transactions: SolanaTransactionDetail[];
    typeCount: Record<string, number>;
  }>();
  
  transactions.forEach(tx => {
    if (!tx.blockTime) return;
    
    const date = new Date(tx.blockTime * 1000);
    const dayKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    
    if (!txsByDay.has(dayKey)) {
      txsByDay.set(dayKey, {
        date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        transactions: [],
        typeCount: {}
      });
    }
    
    const dayData = txsByDay.get(dayKey)!;
    dayData.transactions.push(tx);
    
    const txType = detectTransactionType(tx);
    dayData.typeCount[txType] = (dayData.typeCount[txType] || 0) + 1;
  });
  
  // Convert map to array and sort by date
  return Array.from(txsByDay.values())
    .map(({ date, transactions, typeCount }) => ({
      date,
      totalTransactions: transactions.length,
      transactionsByType: typeCount
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Calculate aggregated metrics
 */
function calculateMetrics(
  transactions: SolanaTransactionDetail[],
  graph: VisualizationGraph,
  walletAnalysis: WalletAnalysisResult,
  clusteringResult: { 
    clusters: TransactionCluster[]; 
    unusualTransactions: string[]; 
    highValueTransactions: string[];
  }
): {
  totalTransactions: number;
  uniqueAddresses: number;
  totalVolume: number;
  riskScore: number;
  unusualTransactionsCount: number;
} {
  return {
    totalTransactions: transactions.length,
    uniqueAddresses: graph.nodes.length,
    totalVolume: walletAnalysis.totalInflow + walletAnalysis.totalOutflow,
    riskScore: walletAnalysis.riskScore,
    unusualTransactionsCount: clusteringResult.unusualTransactions.length
  };
}

/**
 * Create an empty result when there are no transactions
 */
function createEmptyResult(): TransactionFlowResult {
  return {
    graph: { nodes: [], edges: [] },
    walletAnalysis: {
      fundingSources: [],
      activityPatterns: [],
      totalInflow: 0,
      totalOutflow: 0,
      riskScore: 0,
      analysisTimestamp: Date.now()
    },
    entityLabels: [],
    transactionClusters: [],
    criticalPaths: [],
    timelineData: [],
    metrics: {
      totalTransactions: 0,
      uniqueAddresses: 0,
      totalVolume: 0,
      riskScore: 0,
      unusualTransactionsCount: 0
    }
  };
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