import { 
  SolanaAccount, 
  SolanaTransaction, 
  SolanaTransactionDetail 
} from "@/types/solana";

class SolanaAPI {
  private baseUrl: string = "/api/solana";

  async getAccount(address: string): Promise<SolanaAccount> {
    try {
      const response = await fetch(`${this.baseUrl}/account/${address}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch account");
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error fetching Solana account:", error);
      throw error;
    }
  }

  async getTransactions(
    address: string,
    limit: number = 20,
    before?: string
  ): Promise<SolanaTransaction[]> {
    try {
      const params = new URLSearchParams();
      params.append("limit", limit.toString());
      if (before) params.append("before", before);
      
      const response = await fetch(
        `${this.baseUrl}/transactions/${address}?${params.toString()}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch transactions");
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error fetching Solana transactions:", error);
      throw error;
    }
  }

  async getTransactionDetail(signature: string): Promise<SolanaTransactionDetail> {
    try {
      const response = await fetch(`${this.baseUrl}/transaction/${signature}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch transaction detail");
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error fetching transaction detail:", error);
      throw error;
    }
  }

  async getMultipleTransactionDetails(
    signatures: string[]
  ): Promise<SolanaTransactionDetail[]> {
    try {
      const promises = signatures.map(sig => this.getTransactionDetail(sig));
      return await Promise.all(promises);
    } catch (error) {
      console.error("Error fetching multiple transaction details:", error);
      throw error;
    }
  }
}

// Export a singleton instance
export const solanaAPI = new SolanaAPI();
