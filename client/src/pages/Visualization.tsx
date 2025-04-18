import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useWallet } from "@/hooks/useWallet";
import { useSolanaData } from "@/hooks/useSolanaData";
import { WalletNode, TransactionEdge, VisualizationFilters, TransactionType } from "@/types/solana";
import FilterSidebar from "@/components/visualization/FilterSidebar";
import FlowVisualization from "@/components/visualization/FlowVisualization";
import TransactionTimeline from "@/components/visualization/TransactionTimeline";
import WalletSummary from "@/components/visualization/WalletSummary";
import EntityClustering from "@/components/visualization/EntityClustering";
import TutorialPrompt from "@/components/visualization/TutorialPrompt";
import TutorialPopup from "@/components/visualization/TutorialPopup";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function Visualization() {
  const { walletAddress } = useParams<{ walletAddress?: string }>();
  const [, setLocation] = useLocation();
  const [showTutorial, setShowTutorial] = useState(false);
  const [address, setAddress] = useState(walletAddress || "");
  const [selectedNode, setSelectedNode] = useState<WalletNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<TransactionEdge | null>(null);
  const [showOnlyInteractionsWithWallet, setShowOnlyInteractionsWithWallet] = useState<string | null>(null);
  const initialFilters: VisualizationFilters = {
    dateRange: { startDate: null, endDate: null },
    amountRange: { minAmount: 0.05, maxAmount: 100 },
    transactionTypes: ["transfer", "swap", "nft"] as Array<"transfer" | "swap" | "nft" | "defi" | "other">,
    programs: ["tokenProgram", "serum", "metaplex"]
  };
  const [filters, setFilters] = useState<VisualizationFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<VisualizationFilters>(initialFilters);

  // Get wallet data
  const { 
    wallet, 
    transactions, 
    isLoading: isLoadingWallet, 
    error: walletError,
    isValidAddress 
  } = useWallet({ address });

  // Get visualization data
  const {
    graph,
    walletSummary,
    entityClusters,
    timelineData,
    isLoading: isLoadingData,
    error: dataError
  } = useSolanaData({ 
    address, 
    filterWalletAddress: showOnlyInteractionsWithWallet,
    filters: appliedFilters 
  });

  const isLoading = isLoadingWallet || isLoadingData;
  const error = walletError || dataError;

  // Update URL when address changes
  useEffect(() => {
    if (address && isValidAddress && address !== walletAddress) {
      setLocation(`/visualization/${address}`);
    }
  }, [address, isValidAddress, walletAddress, setLocation]);

  // Show first-time user tutorial
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem("hasSeenTutorial");
    if (!hasSeenTutorial && address) {
      setTimeout(() => {
        setShowTutorial(true);
      }, 1500);
    }
  }, [address]);

  const handleWalletChange = (newAddress: string) => {
    setAddress(newAddress);
  };

  const handleFiltersChange = (newFilters: VisualizationFilters) => {
    setFilters(newFilters);
  };

  const handleFilterApply = () => {
    setAppliedFilters(filters);
  };

  const handleFilterReset = () => {
    const resetFilters: VisualizationFilters = {
      dateRange: { startDate: null, endDate: null },
      amountRange: { minAmount: 0.05, maxAmount: 100 },
      transactionTypes: ["transfer", "swap", "nft"] as Array<"transfer" | "swap" | "nft" | "defi" | "other">,
      programs: ["tokenProgram", "serum", "metaplex"]
    };
    setFilters(resetFilters);
    setAppliedFilters(resetFilters);
  };

  const handleNodeClick = (node: WalletNode) => {
    setSelectedNode(node);
    
    // Toggle filtering to only show interactions with this wallet
    toggleWalletFiltering(node.address);
    
    // When clicking on a node, a user can open it in Solscan.io (handled in FlowVisualization)
    // The View in Solscan button is already implemented in FlowVisualization
  };

  const handleEdgeClick = (edge: TransactionEdge) => {
    setSelectedEdge(edge);
  };
  
  // Toggle filtering to only show interactions with a specific wallet
  const toggleWalletFiltering = (walletAddress: string | null) => {
    if (showOnlyInteractionsWithWallet === walletAddress) {
      // If already filtering by this wallet, clear the filter
      setShowOnlyInteractionsWithWallet(null);
    } else {
      // Otherwise, set the filter to show only interactions with this wallet
      setShowOnlyInteractionsWithWallet(walletAddress);
    }
  };

  const handleTutorialStart = () => {
    setShowTutorial(false);
    // In a real app, we would start an interactive tutorial here
    localStorage.setItem("hasSeenTutorial", "true");
  };

  const handleTutorialDismiss = () => {
    setShowTutorial(false);
    localStorage.setItem("hasSeenTutorial", "true");
  };

  return (
    <div>
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Transaction Flow Visualization</h2>
          <p className="text-gray-400 mt-1">Visualize and analyze transaction flows between wallets on Solana</p>
        </div>
        
        <TutorialPrompt onStartTutorial={() => setShowTutorial(true)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left sidebar with filters */}
        <FilterSidebar
          walletAddress={address}
          onWalletChange={handleWalletChange}
          onFiltersChange={handleFiltersChange}
          onFilterApply={handleFilterApply}
          onFilterReset={handleFilterReset}
        />

        {/* Main visualization area */}
        <div className="lg:col-span-3 space-y-6">
          {!address ? (
            <div className="bg-solana-dark-light rounded-lg p-8 text-center">
              <h3 className="text-xl font-medium text-white mb-4">Enter a Wallet Address to Get Started</h3>
              <p className="text-gray-300 mb-4">
                Use the search box on the left to enter a Solana wallet address and visualize its transaction flows.
              </p>
              <p className="text-gray-400 text-sm">
                Need help? Check out our <a href="/help" className="text-solana-secondary hover:underline">tutorials</a> or try a sample wallet.
              </p>
            </div>
          ) : error ? (
            <Alert variant="destructive" className="bg-solana-dark-light border-solana-error">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error.message || "Failed to load wallet data. Please check the wallet address and try again."}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Flow Visualization */}
              <div className="bg-solana-dark-light rounded-lg p-4 relative min-h-[480px]">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center space-y-4 h-[400px]">
                    <div className="w-12 h-12 rounded-full border-4 border-solana-primary border-t-transparent animate-spin"></div>
                    <p className="text-gray-300">Loading visualization data...</p>
                  </div>
                ) : graph.nodes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center space-y-4 h-[400px]">
                    <AlertCircle className="h-12 w-12 text-solana-warning" />
                    <p className="text-gray-300">No transaction data found for this wallet or with the current filters.</p>
                  </div>
                ) : (
                  <FlowVisualization 
                    graph={graph} 
                    onNodeClick={handleNodeClick} 
                    onEdgeClick={handleEdgeClick} 
                    selectedNode={selectedNode}
                    selectedEdge={selectedEdge}
                    filteredWalletAddress={showOnlyInteractionsWithWallet}
                  />
                )}
              </div>

              {/* Transaction Timeline */}
              <TransactionTimeline 
                timelineData={timelineData} 
                isLoading={isLoading} 
              />

              {/* Wallet Summary and Entity Clustering cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <WalletSummary 
                  walletSummary={walletSummary} 
                  isLoading={isLoading} 
                />
                <EntityClustering 
                  entityClusters={entityClusters} 
                  isLoading={isLoading}
                  onClusterSelect={(cluster) => {
                    // In a real app, we would highlight the cluster in the visualization
                    console.log('Cluster selected:', cluster);
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tutorial Popup */}
      {showTutorial && (
        <TutorialPopup 
          onStartTutorial={handleTutorialStart} 
          onDismiss={handleTutorialDismiss}
        />
      )}
    </div>
  );
}
