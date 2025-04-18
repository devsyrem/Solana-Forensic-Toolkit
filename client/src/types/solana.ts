// Basic Solana types
export interface SolanaAccount {
  address: string;
  balance: number;
  executable: boolean;
  owner: string | null;
}

export interface SolanaTransaction {
  signature: string;
  blockTime: number | null;
  slot: number;
  err: any;
  memo: string | null;
  fee?: number;
  status: 'success' | 'failed' | 'unknown';
}

export interface SolanaTransactionDetail extends SolanaTransaction {
  instructions: SolanaInstruction[];
  accountKeys: string[];
}

export interface SolanaInstruction {
  programId: string;
  accounts: string[];
  data: string;
}

// Visualization-specific types
export type TransactionType = 'transfer' | 'swap' | 'nft' | 'defi' | 'other';

export interface WalletNode {
  id: string;
  address: string;
  label?: string;
  type: 'wallet' | 'program' | 'contract';
  balance?: number;
  totalVolume?: number;
  transactionCount?: number;
  lastActivity?: Date;
}

export interface TransactionEdge {
  id: string;
  source: string;
  target: string;
  amount?: number;
  type: TransactionType;
  signature: string;
  timestamp: Date;
}

export interface VisualizationGraph {
  nodes: WalletNode[];
  edges: TransactionEdge[];
}

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export interface AmountRange {
  minAmount: number;
  maxAmount: number;
}

export interface VisualizationFilters {
  dateRange: DateRange;
  amountRange: AmountRange;
  transactionTypes: TransactionType[];
  programs: string[];
}

export interface WalletSummary {
  address: string;
  label?: string;
  balance: number;
  transactionCount: number;
  connectedWallets: number;
  lastActivity: Date;
  topInteractions: {
    entity: string;
    type: string;
    count: number;
    icon?: string;
  }[];
  createdAt?: Date;
}

export interface EntityCluster {
  id: string;
  name: string;
  type: 'exchange' | 'related' | 'defi' | 'other';
  walletCount: number;
  description: string;
  wallets: string[];
}

export interface TimelineDataPoint {
  date: Date;
  totalTransactions: number;
  transactionsByType: Record<TransactionType, number>;
}
