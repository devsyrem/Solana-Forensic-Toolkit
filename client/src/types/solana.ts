// Solana transaction related types
export interface SolanaInstruction {
  programId: string;
  accounts: string[];
  data: string;
}

export interface SolanaTransactionDetail {
  signature: string;
  blockTime?: number;
  slot?: number;
  accountKeys: string[];
  instructions: SolanaInstruction[];
  logMessages?: string[];
}

export interface SolanaTransaction {
  id: string;
  signature: string;
  blockTime: number;
  fromAddress: string;
  toAddress: string;
  amount: number;
  status: 'success' | 'error';
  type: TransactionType;
  timestamp: Date;
  blockHeight?: number;
  fee?: number;
  accounts?: string[];
}

export type TransactionType = 'transfer' | 'swap' | 'nft' | 'defi' | 'other';

// Graph visualization types
export interface WalletNode {
  id: string;
  address: string;
  type: 'wallet' | 'program' | 'contract';
  label?: string;
  balance?: number;
  totalVolume?: number;
  transactionCount?: number;
  lastActivity?: Date;
  riskScore?: number;
  subtype?: string;
}

export interface TransactionEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  signature: string;
  timestamp: Date;
  value?: number;
  successful?: boolean;
  isUnusual?: boolean;
  isHighValue?: boolean;
}

export interface VisualizationGraph {
  nodes: WalletNode[];
  edges: TransactionEdge[];
}

// Data filter types
export interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

export interface AmountRange {
  minAmount?: number;
  maxAmount?: number;
}

export interface TransactionFilters extends DateRange, AmountRange {
  transactionTypes?: string[];
  addressFilter?: string;
  onlyUnusual?: boolean;
  onlyHighValue?: boolean;
  onlyCriticalPaths?: boolean;
}

export interface VisualizationFilters extends TransactionFilters {
  selectedWallet?: string;
  showOnlyEntityLabels?: boolean;
  highlightCriticalPaths?: boolean;
}

// Wallet and entity types
export interface WalletSummary {
  address: string;
  balance: number;
  transactionCount: number;
  lastActivity: Date;
  transactionVolume: number;
  risk: number;
  label?: string;
  type?: string;
}

export interface EntityCluster {
  id: string;
  name: string;
  type: 'exchange' | 'dex' | 'project' | 'wallet' | 'unknown';
  addresses: string[];
  totalVolume: number;
  transactionCount: number;
  description?: string;
  confidence: number;
}

// Timeline data
export interface TimelineDataPoint {
  date: Date;
  totalTransactions: number;
  transactionsByType: Record<TransactionType, number>;
  volume: number;
}