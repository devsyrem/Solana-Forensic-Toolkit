import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { solanaAPI } from "@/lib/solanaAPI";
import { SolanaAccount, SolanaTransaction } from "@/types/solana";
import { isValidSolanaAddress } from "@/lib/utils";

interface UseWalletProps {
  address?: string;
  transactionLimit?: number;
}

interface UseWalletResult {
  wallet: SolanaAccount | null;
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
  } = useQuery({
    queryKey: [`/api/solana/account/${address}`],
    enabled: !!address && isValidAddress,
  });

  // Query for transactions
  const {
    data: initialTransactions,
    isLoading: isLoadingTransactions,
    error: transactionsError,
  } = useQuery({
    queryKey: [`/api/solana/transactions/${address}?limit=${transactionLimit}`],
    enabled: !!address && isValidAddress,
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
