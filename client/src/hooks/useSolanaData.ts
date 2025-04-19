import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { solanaAPI } from "@/lib/solanaAPI";
import { detectTransactionType } from "@/lib/utils";
import { 
  SolanaTransactionDetail, 
  WalletNode, 
  TransactionEdge, 
  VisualizationGraph,
  WalletSummary,
  EntityCluster,
  TimelineDataPoint
} from "@/types/solana";

interface UseSolanaDataProps {
  address?: string;
  transactionLimit?: number;
  filterWalletAddress?: string | null;
  filters?: {
    startDate?: Date;
    endDate?: Date;
    minAmount?: number;
    maxAmount?: number;
    transactionTypes?: string[];
    programs?: string[];
  };
}

interface UseSolanaDataResult {
  graph: VisualizationGraph;
  walletSummary: WalletSummary | null;
  entityClusters: EntityCluster[];
  timelineData: TimelineDataPoint[];
  isLoading: boolean;
  error: Error | null;
  processedSignatures: Set<string>;
}

export function useSolanaData({
  address = "",
  transactionLimit = 50,
  filterWalletAddress = null,
  filters = {}
}: UseSolanaDataProps = {}): UseSolanaDataResult {
  const [graph, setGraph] = useState<VisualizationGraph>({ nodes: [], edges: [] });
  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(null);
  const [entityClusters, setEntityClusters] = useState<EntityCluster[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineDataPoint[]>([]);
  const [processedSignatures, setProcessedSignatures] = useState<Set<string>>(new Set());

  // Query for account info
  const {
    data: wallet = { balance: 0 },
    isLoading: isLoadingWallet,
    error: walletError,
  } = useQuery<{ balance: number }>({
    queryKey: [`/api/solana/account/${address}`],
    enabled: !!address,
  });

  // Query for transactions
  const {
    data: transactions = [],
    isLoading: isLoadingTransactions,
    error: transactionsError,
  } = useQuery<any[]>({
    queryKey: [`/api/solana/transactions/${address}?limit=${transactionLimit}`],
    enabled: !!address,
  });

  // Fetch transaction details when we have transaction signatures
  const {
    data: transactionDetails = [],
    isLoading: isLoadingDetails,
    error: detailsError,
  } = useQuery<any[]>({
    queryKey: [`/api/solana/transaction/details/${address}`],
    enabled: !!transactions && transactions.length > 0,
    queryFn: async () => {
      try {
        // Filter out transactions we've already processed
        const newTransactions = transactions.filter(
          tx => !processedSignatures.has(tx.signature)
        );
        
        if (newTransactions.length === 0) return [];
        
        // Get transaction details for new transactions
        const details = await Promise.all(
          newTransactions.map(async (tx) => {
            try {
              return await solanaAPI.getTransactionDetail(tx.signature);
            } catch (error) {
              console.error(`Error fetching details for transaction ${tx.signature}:`, error);
              return null; // Return null for failed transactions
            }
          })
        );
        
        // Filter out null results from failed transactions
        const validDetails = details.filter(detail => detail !== null);
        
        // Update processed signatures (even for failed transactions to avoid retrying)
        const newSignatures = new Set(processedSignatures);
        newTransactions.forEach(tx => newSignatures.add(tx.signature));
        setProcessedSignatures(newSignatures);
        
        return validDetails;
      } catch (error) {
        console.error("Error fetching transaction details:", error);
        return []; // Return empty array in case of error
      }
    }
  });

  // Process transaction details to build graph and other visualizations
  useEffect(() => {
    if (!wallet || !transactionDetails || transactionDetails.length === 0) return;

    const mainAddress = address;
    
    // Build nodes and edges for graph
    const nodes = new Map<string, WalletNode>();
    const edges: TransactionEdge[] = [];
    
    // Add main wallet as a node
    nodes.set(mainAddress, {
      id: mainAddress,
      address: mainAddress,
      type: 'wallet',
      balance: wallet.balance,
      totalVolume: 0,
      transactionCount: 0,
      lastActivity: new Date(),
    });
    
    // Track wallet interactions for summary
    const interactions = new Map<string, { count: number, lastActivity: Date, type: string }>();
    
    // Track transaction dates for timeline
    const txDates = new Map<string, { total: number, byType: Record<string, number> }>();
    
    // Process each transaction
    transactionDetails.forEach(tx => {
      if (!tx) return;
      
      const txType = detectTransactionType(tx);
      const timestamp = tx.blockTime ? new Date(tx.blockTime * 1000) : new Date();
      
      // Apply filters
      if (filters.startDate && timestamp < filters.startDate) return;
      if (filters.endDate && timestamp > filters.endDate) return;
      if (filters.transactionTypes && !filters.transactionTypes.includes(txType)) return;
      
      // Check for program filters
      if (filters.programs && filters.programs.length > 0) {
        const txPrograms = tx.instructions.map((ix: any) => ix.programId);
        const hasMatchingProgram = txPrograms.some((prog: string) => 
          filters.programs?.includes(prog)
        );
        if (!hasMatchingProgram) return;
      }
      
      // Update timeline data
      const dateKey = timestamp.toDateString();
      const dateData = txDates.get(dateKey) || { total: 0, byType: {} };
      dateData.total++;
      dateData.byType[txType] = (dateData.byType[txType] || 0) + 1;
      txDates.set(dateKey, dateData);
      
      // Process account keys to create nodes and edges
      tx.accountKeys.forEach((account: string) => {
        if (account === mainAddress) return; // Skip main wallet, already added
        
        if (!nodes.has(account)) {
          // Determine if this is a program or wallet
          const isProgramAccount = tx.instructions.some((ix: any) => ix.programId === account);
          
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
        const edgeId = `${mainAddress}-${account}-${tx.signature}`;
        edges.push({
          id: edgeId,
          source: mainAddress,
          target: account,
          type: txType,
          signature: tx.signature,
          timestamp: timestamp,
        });
        
        // Update interactions for wallet summary
        if (!interactions.has(account)) {
          interactions.set(account, { 
            count: 1, 
            lastActivity: timestamp,
            type: nodes.get(account)?.type || 'wallet'
          });
        } else {
          const interaction = interactions.get(account)!;
          interaction.count++;
          interaction.lastActivity = new Date(Math.max(
            interaction.lastActivity.getTime(),
            timestamp.getTime()
          ));
          interactions.set(account, interaction);
        }
      });
    });
    
    // Build wallet summary
    if (wallet) {
      // Sort interactions by count
      const topInteractions = Array.from(interactions.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([address, data]) => ({
          entity: address,
          count: data.count,
          type: data.type,
          icon: data.type === 'program' ? 'code' : 'wallet'
        }));
      
      const lastActivity = transactions && transactions.length > 0 && transactions[0].blockTime
        ? new Date(transactions[0].blockTime * 1000)
        : new Date();
      
      setWalletSummary({
        address: mainAddress,
        balance: wallet.balance,
        transactionCount: transactions?.length || 0,
        connectedWallets: interactions.size,
        lastActivity,
        topInteractions
      });
    }
    
    // Build timeline data
    const timeline: TimelineDataPoint[] = Array.from(txDates.entries())
      .map(([dateStr, data]) => ({
        date: new Date(dateStr),
        totalTransactions: data.total,
        transactionsByType: data.byType as Record<any, number>
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    
    setTimelineData(timeline);
    
    // Build entity clusters
    // This is a simple implementation - in a real app, we would use more sophisticated clustering algorithms
    const exchangeAddresses = new Set<string>();
    const defiAddresses = new Set<string>();
    const relatedAddresses = new Set<string>();
    
    // Find exchange and DeFi addresses based on transaction patterns
    interactions.forEach((data, address) => {
      const node = nodes.get(address);
      if (!node) return;
      
      if (node.type === 'program') {
        // Check if this might be a DeFi program
        if (address.toLowerCase().includes('swap') || 
            address.toLowerCase().includes('pool') || 
            address.toLowerCase().includes('stake')) {
          defiAddresses.add(address);
        }
      } else {
        // Check if this might be an exchange
        if (data.count > 10) {
          exchangeAddresses.add(address);
        } else if (data.count > 3) {
          relatedAddresses.add(address);
        }
      }
    });
    
    const clusters: EntityCluster[] = [];
    
    if (exchangeAddresses.size > 0) {
      clusters.push({
        id: 'exchange-cluster',
        name: 'Exchange Cluster',
        type: 'exchange',
        walletCount: exchangeAddresses.size,
        description: 'Likely associated with a centralized exchange',
        wallets: Array.from(exchangeAddresses)
      });
    }
    
    if (relatedAddresses.size > 0) {
      clusters.push({
        id: 'related-wallets',
        name: 'Related Wallets',
        type: 'related',
        walletCount: relatedAddresses.size,
        description: 'Likely controlled by the same entity',
        wallets: Array.from(relatedAddresses)
      });
    }
    
    if (defiAddresses.size > 0) {
      clusters.push({
        id: 'defi-interaction',
        name: 'DeFi Interaction',
        type: 'defi',
        walletCount: defiAddresses.size,
        description: 'Protocols this wallet interacts with',
        wallets: Array.from(defiAddresses)
      });
    }
    
    setEntityClusters(clusters);
    
    // Filter nodes and edges if filterWalletAddress is provided
    let filteredNodes = Array.from(nodes.values());
    let filteredEdges = edges;
    
    if (filterWalletAddress) {
      // Only show nodes that are either the main wallet, the filtered wallet, or connected to the filtered wallet
      filteredEdges = edges.filter(edge => 
        edge.source === filterWalletAddress || edge.target === filterWalletAddress
      );
      
      // Get all addresses that are directly connected to the filtered wallet
      const connectedAddresses = new Set<string>();
      connectedAddresses.add(mainAddress); // Always include main wallet
      connectedAddresses.add(filterWalletAddress); // Always include the filtered wallet
      
      // Add all addresses that have a direct connection with the filtered wallet
      filteredEdges.forEach(edge => {
        connectedAddresses.add(edge.source);
        connectedAddresses.add(edge.target);
      });
      
      // Filter nodes to only include those that are connected to the filtered wallet
      filteredNodes = filteredNodes.filter(node => connectedAddresses.has(node.address));
    }
    
    // Update graph with filtered nodes and edges
    setGraph({
      nodes: filteredNodes,
      edges: filteredEdges
    });
    
  }, [address, wallet, transactionDetails, filters, filterWalletAddress]);

  return {
    graph,
    walletSummary,
    entityClusters,
    timelineData,
    isLoading: isLoadingWallet || isLoadingTransactions || isLoadingDetails,
    error: (walletError || transactionsError || detailsError) as Error | null,
    processedSignatures
  };
}
