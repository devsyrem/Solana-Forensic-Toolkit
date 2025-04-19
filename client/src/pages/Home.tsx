import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Home() {
  const [walletAddress, setWalletAddress] = useState("");
  const [error, setError] = useState("");

  const handleWalletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      setError("Please enter a wallet address");
      return;
    }

    // Basic validation for Solana address (base58, around 44 characters)
    const isValidAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress);
    if (!isValidAddress) {
      setError("Please enter a valid Solana wallet address");
      return;
    }

    setError("");
    // Navigate to the visualization page with the wallet address
    window.location.href = `/visualization/${walletAddress}`;
  };

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="text-center py-16 px-4">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-solana-primary to-solana-secondary bg-clip-text text-transparent">
          Visualize Solana Transaction Flows
        </h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-10">
          A user-friendly tool for exploring and understanding transaction patterns on the Solana blockchain. No technical knowledge required.
        </p>
        <div className="max-w-md mx-auto">
          <form onSubmit={handleWalletSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Enter a Solana wallet address"
                className="bg-solana-dark border border-solana-dark-lighter rounded-md py-3 pl-10 pr-4 text-white placeholder-gray-500 w-full"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            {error && <p className="text-solana-error text-sm">{error}</p>}
            <Button 
              type="submit" 
              className="w-full bg-solana-primary hover:bg-opacity-90 text-white font-medium py-3 rounded-md transition"
            >
              Visualize Transactions
            </Button>
          </form>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12">
        <h2 className="text-3xl font-bold text-center mb-12">What You Can Do With SolFlow</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
          <div className="bg-solana-dark-light rounded-lg p-6">
            <div className="w-12 h-12 bg-solana-primary bg-opacity-20 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-solana-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Interactive Flow Charts</h3>
            <p className="text-gray-300">
              Visualize connections between wallets with interactive diagrams that make transaction flows easy to understand.
            </p>
          </div>
          
          <div className="bg-solana-dark-light rounded-lg p-6">
            <div className="w-12 h-12 bg-solana-secondary bg-opacity-20 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-solana-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Advanced Filtering</h3>
            <p className="text-gray-300">
              Filter transactions by date, amount, and type to focus on the data that matters most to you.
            </p>
          </div>
          
          <div className="bg-solana-dark-light rounded-lg p-6">
            <div className="w-12 h-12 bg-solana-info bg-opacity-20 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-solana-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Save & Share</h3>
            <p className="text-gray-300">
              Save your visualization snapshots and share them with others for collaborative analysis.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 bg-solana-dark-light rounded-lg p-8">
        <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
        <div className="max-w-3xl mx-auto">
          <ol className="relative border-l border-gray-700">
            <li className="mb-10 ml-6">
              <span className="absolute flex items-center justify-center w-8 h-8 bg-solana-primary rounded-full -left-4">
                <span className="text-white font-bold">1</span>
              </span>
              <h3 className="text-xl font-semibold text-white mb-2">Enter a Wallet Address</h3>
              <p className="text-gray-300">
                Start by entering any Solana wallet address or name you want to analyze.
              </p>
            </li>
            <li className="mb-10 ml-6">
              <span className="absolute flex items-center justify-center w-8 h-8 bg-solana-primary rounded-full -left-4">
                <span className="text-white font-bold">2</span>
              </span>
              <h3 className="text-xl font-semibold text-white mb-2">Apply Filters</h3>
              <p className="text-gray-300">
                Refine your visualization with filters for date ranges, transaction amounts, and types.
              </p>
            </li>
            <li className="mb-10 ml-6">
              <span className="absolute flex items-center justify-center w-8 h-8 bg-solana-primary rounded-full -left-4">
                <span className="text-white font-bold">3</span>
              </span>
              <h3 className="text-xl font-semibold text-white mb-2">Explore Connections</h3>
              <p className="text-gray-300">
                Interact with the visualization to discover patterns and connections between wallets.
              </p>
            </li>
            <li className="ml-6">
              <span className="absolute flex items-center justify-center w-8 h-8 bg-solana-primary rounded-full -left-4">
                <span className="text-white font-bold">4</span>
              </span>
              <h3 className="text-xl font-semibold text-white mb-2">Gain Insights</h3>
              <p className="text-gray-300">
                Understand transaction flows, identify critical paths, and detect unusual patterns.
              </p>
            </li>
          </ol>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center py-12">
        <h2 className="text-3xl font-bold mb-6">Ready to Explore Solana Transactions?</h2>
        <Button 
          className="bg-solana-secondary text-solana-dark hover:bg-opacity-90 font-bold py-3 px-8 rounded-md text-lg transition"
          onClick={() => window.location.href = "/visualization"}
        >
          Start Visualizing
        </Button>
      </section>
    </div>
  );
}
