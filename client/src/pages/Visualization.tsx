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
import TeamCollaboration from "@/components/collaboration/TeamCollaboration";
import VisualizationAnnotation from "@/components/collaboration/VisualizationAnnotation";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Users, MessageSquare, Share2 } from "lucide-react";

export default function Visualization() {
  const { walletAddress } = useParams<{ walletAddress?: string }>();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showTutorial, setShowTutorial] = useState(false);
  const [address, setAddress] = useState(walletAddress || "");
  const [selectedNode, setSelectedNode] = useState<WalletNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<TransactionEdge | null>(null);
  const [showOnlyInteractionsWithWallet, setShowOnlyInteractionsWithWallet] = useState<string | null>(null);
  const [visualizationId, setVisualizationId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("visualization");
  const [selectedTransactionSignature, setSelectedTransactionSignature] = useState<string | undefined>(undefined);
  const [collaborators, setCollaborators] = useState<Array<{id: number, username: string}>>([]);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
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
      setLocation(`/rpc-visualization/${address}`);
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
  
  // Connect to WebSocket for real-time collaboration
  useEffect(() => {
    if (!visualizationId) return;
    
    // Set up WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log("WebSocket connection established");
      // Join the visualization collaborative session
      socket.send(JSON.stringify({
        type: "join-visualization",
        visualizationId: visualizationId,
        userId: 1, // This would be the actual user ID from auth
        username: "Current User" // This would be the actual username from auth
      }));
      
      setWsConnection(socket);
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle different message types
        if (data.type === "active-users") {
          setCollaborators(data.users);
          toast({
            title: "Collaboration active",
            description: `${data.users.length} other users are viewing this visualization`,
          });
        }
        
        if (data.type === "user-joined") {
          setCollaborators((prev) => [...prev, data.user]);
          toast({
            title: "User joined",
            description: `${data.user.username} has joined the visualization`,
          });
        }
        
        if (data.type === "user-left") {
          setCollaborators((prev) => 
            prev.filter(user => user.id !== data.userId)
          );
          toast({
            title: "User left",
            description: `A collaborator has left the visualization`,
          });
        }
        
        if (data.type === "new-annotation") {
          toast({
            title: "New annotation",
            description: "A collaborator added a new annotation",
          });
          // The VisualizationAnnotation component will handle refreshing annotations
        }
        
        if (data.type === "cursor-update") {
          // Update cursor positions (could be implemented with a cursor overlay)
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
    
    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      toast({
        variant: "destructive",
        title: "Connection error",
        description: "Failed to connect to collaboration server",
      });
    };
    
    socket.onclose = () => {
      console.log("WebSocket connection closed");
      setWsConnection(null);
    };
    
    // Clean up on unmount
    return () => {
      socket.close();
    };
  }, [visualizationId, toast]);

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

  // Function to simulate saving a visualization (for demo purposes)
  const saveVisualization = () => {
    // This would talk to the backend in a real implementation
    setVisualizationId(1);
    toast({
      title: "Visualization saved",
      description: "Your visualization has been saved successfully",
    });
  };
  
  return (
    <div>
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Transaction Flow Visualization</h2>
          <p className="text-gray-400 mt-1">Visualize and analyze transaction flows between wallets on Solana</p>
        </div>
        
        <div className="flex items-center gap-3">
          {visualizationId && (
            <div className="flex items-center bg-solana-dark-light rounded-full px-3 py-1.5">
              <span className="inline-flex items-center mr-1.5">
                <Users size={16} className="mr-1 text-green-400" />
                <span className="text-sm text-green-400">{collaborators.length}</span>
              </span>
              <span className="text-xs text-gray-400">
                {collaborators.length === 0 
                  ? "No collaborators" 
                  : collaborators.length === 1 
                    ? "1 person collaborating" 
                    : `${collaborators.length} people collaborating`}
              </span>
            </div>
          )}
          
          <Button 
            size="sm" 
            variant="outline"
            onClick={saveVisualization}
            className="flex items-center gap-1.5"
          >
            <Share2 size={14} />
            {visualizationId ? "Share" : "Save & Share"}
          </Button>
          
          <TutorialPrompt onStartTutorial={() => setShowTutorial(true)} />
        </div>
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
              {/* Collaboration Tabs */}
              <Tabs defaultValue="visualization" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-solana-dark-light mb-4">
                  <TabsTrigger value="visualization" className="data-[state=active]:bg-solana-primary">
                    Visualization
                  </TabsTrigger>
                  <TabsTrigger value="annotations" className="data-[state=active]:bg-solana-primary">
                    <MessageSquare className="h-4 w-4 mr-1.5" />
                    Annotations
                  </TabsTrigger>
                  <TabsTrigger value="collaboration" className="data-[state=active]:bg-solana-primary">
                    <Users className="h-4 w-4 mr-1.5" />
                    Team
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="visualization" className="m-0 p-0">
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
                        svgRef={svgRef}
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
                </TabsContent>
                
                <TabsContent value="annotations" className="m-0">
                  <div className="bg-solana-dark-light rounded-lg p-6">
                    {visualizationId ? (
                      <VisualizationAnnotation 
                        visualizationId={visualizationId}
                        selectedNodeAddress={selectedNode?.address}
                        selectedTransactionSignature={selectedEdge?.signature}
                        svgRef={svgRef}
                      />
                    ) : (
                      <div className="text-center py-12">
                        <MessageSquare className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">Save Visualization First</h3>
                        <p className="text-gray-400 mb-4">
                          You need to save your visualization before adding annotations.
                        </p>
                        <Button onClick={saveVisualization}>
                          Save Visualization
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="collaboration" className="m-0">
                  <div className="bg-solana-dark-light rounded-lg p-6">
                    {visualizationId ? (
                      <TeamCollaboration 
                        visualizationId={visualizationId}
                        collaborators={collaborators}
                      />
                    ) : (
                      <div className="text-center py-12">
                        <Users className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">Save Visualization First</h3>
                        <p className="text-gray-400 mb-4">
                          You need to save your visualization before sharing it with your team.
                        </p>
                        <Button onClick={saveVisualization}>
                          Save Visualization
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
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
