import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { 
  SolanaTransaction, 
  TransactionType, 
  SolanaTransactionDetail 
} from "@/types/solana";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | number, pattern = "MMM d, yyyy"): string {
  return format(date, pattern);
}

export function formatTimeAgo(date: Date | number): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.substring(0, chars)}...${address.substring(address.length - chars)}`;
}

export function formatSolAmount(amount: number): string {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

export function detectTransactionType(tx: SolanaTransactionDetail): TransactionType {
  if (!tx) return 'other';
  
  // Check for program IDs to determine transaction type
  // These are simplified checks - in a production app we would have more comprehensive logic
  const programIds = tx.instructions.map(ix => ix.programId);
  
  const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
  const METAPLEX_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';
  const RAYDIUM_ID = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
  const SERUM_ID = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin';
  const JUPITER_ID = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4';
  
  if (programIds.includes(METAPLEX_ID)) {
    return 'nft';
  } else if (programIds.includes(RAYDIUM_ID) || programIds.includes(SERUM_ID) || programIds.includes(JUPITER_ID)) {
    return 'swap';
  } else if (programIds.includes(TOKEN_PROGRAM_ID)) {
    return 'transfer';
  } else if (programIds.some(id => id.toLowerCase().includes('pool') || id.toLowerCase().includes('stake'))) {
    return 'defi';
  }
  
  return 'other';
}

export function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

export function rgbaToHex(rgba: string): string {
  const rgbaRegex = /rgba?\((\d+), *(\d+), *(\d+)(?:, *(\d+(?:\.\d+)?))?\)/;
  const match = rgba.match(rgbaRegex);
  
  if (!match) {
    return rgba;
  }
  
  const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
  const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
  const b = parseInt(match[3], 10).toString(16).padStart(2, '0');
  
  return `#${r}${g}${b}`;
}

// Custom class for Solana colors to use across the application
export const solanaColors = {
  primary: '#9945FF',
  secondary: '#14F195',
  dark: '#1E1E2E',
  darkLight: '#292A3B',
  darkLighter: '#383A59',
  light: '#F1F3F5',
  error: '#FF5353',
  warning: '#FFB800',
  info: '#00C2FF',
};

// Tailwind CSS custom styles for the application
export const tailwindStyles = {
  // Button variants
  button: {
    primary: "bg-solana-primary hover:bg-opacity-90 text-white",
    secondary: "bg-solana-secondary hover:bg-opacity-90 text-solana-dark",
    outline: "bg-transparent border border-solana-primary text-solana-primary hover:bg-solana-primary hover:bg-opacity-10",
    dark: "bg-solana-dark-light hover:bg-solana-dark-lighter text-gray-300",
  },
  
  // Input variants
  input: {
    default: "bg-solana-dark border border-solana-dark-lighter rounded-md py-2 px-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-solana-primary focus:border-solana-primary",
  },
};

/**
 * Generate a Solscan URL for a Solana address (wallet or transaction)
 * @param address Solana wallet address or transaction signature
 * @param type Type of entity ('address' for wallet or 'tx' for transaction)
 * @returns URL to the Solscan page
 */
export function getSolscanUrl(address: string, type: 'address' | 'tx' = 'address'): string {
  return `https://solscan.io/${type}/${address}`;
}

/**
 * Opens the Solscan page for a Solana address in a new tab
 * @param address Solana wallet address or transaction signature
 * @param type Type of entity ('address' for wallet or 'tx' for transaction)
 */
export function openInSolscan(address: string, type: 'address' | 'tx' = 'address'): void {
  const url = getSolscanUrl(address, type);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Filter transactions to only show interactions with a specific wallet
 * @param transactions List of transactions
 * @param walletAddress Wallet address to filter by
 * @returns Filtered list of transactions
 */
export function filterTransactionsByWallet(transactions: any[], walletAddress: string): any[] {
  if (!transactions || !walletAddress) return [];
  
  return transactions.filter(tx => {
    // Check if the transaction involves the specified wallet
    if (tx.fromAddress === walletAddress || tx.toAddress === walletAddress) {
      return true;
    }
    
    // For transactions with multiple accounts, check if the wallet is involved
    if (tx.accounts && Array.isArray(tx.accounts)) {
      return tx.accounts.includes(walletAddress);
    }
    
    return false;
  });
}
