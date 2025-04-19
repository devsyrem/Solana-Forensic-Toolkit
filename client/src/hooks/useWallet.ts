import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { solanaAPI } from "@/lib/solanaAPI";
import type { SolanaTransaction } from "@/types/solana";
import { isValidSolanaAddress } from "@/lib/utils";

// Define a more specific type for the wallet data
interface WalletAccount {
  address: string;
  balance: number;
  [key: string]: any;
}

interface UseWalletProps {
  address?: string;
  transactionLimit?: number;
}

interface UseWalletResult {
  wallet: WalletAccount | null;
  transactions: SolanaTransaction[];
  isLoading: boolean;
  error: Error | null;
  fetchMore: () => Promise<void>;
  hasMore: boolean;
  isValidAddress: boolean;
}

export function useWallet({ 
  address = "", 
  transactionLimit = 20 
}: UseWalletProps = {}): UseWalletResult {
  const [transactions, setTransactions] = useState<SolanaTransaction[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const isValidAddress = isValidSolanaAddress(address);

  // Query for account info
  const {
    data: wallet,
    isLoading: isLoadingWallet,
    error: walletError,
  } = useQuery<WalletAccount>({
    queryKey: [`/api/solana/account/${address}`],
    enabled: !!address && isValidAddress,
    retry: 2,
    retryDelay: 1000
  });

  // Query for transactions
  const {
    data: initialTransactions,
    isLoading: isLoadingTransactions,
    error: transactionsError,
  } = useQuery<SolanaTransaction[]>({
    queryKey: [`/api/solana/transactions/${address}?limit=${transactionLimit}`],
    enabled: !!address && isValidAddress,
    retry: 2,
    retryDelay: 1000
  });

  // Update transactions when initial data is loaded
  useEffect(() => {
    if (initialTransactions) {
      setTransactions(initialTransactions);
      setHasMore(initialTransactions.length === transactionLimit);
    }
  }, [initialTransactions, transactionLimit]);

  // Function to fetch more transactions
  const fetchMore = async () => {
    if (!address || transactions.length === 0) return;
    
    const lastSignature = transactions[transactions.length - 1].signature;
    
    try {
      const nextTransactions = await solanaAPI.getTransactions(
        address,
        transactionLimit,
        lastSignature
      );
      
      if (nextTransactions.length === 0) {
        setHasMore(false);
        return;
      }
      
      setTransactions([...transactions, ...nextTransactions]);
      setHasMore(nextTransactions.length === transactionLimit);
    } catch (error) {
      console.error("Error fetching more transactions:", error);
    }
  };

  return {
    wallet: wallet || null,
    transactions,
    isLoading: isLoadingWallet || isLoadingTransactions,
    error: (walletError || transactionsError) as Error | null,
    fetchMore,
    hasMore,
    isValidAddress,
  };
}
