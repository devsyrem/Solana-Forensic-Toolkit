import { useState, useRef, useEffect } from "react";
import { useVisualization } from "@/hooks/useVisualization";
import { VisualizationGraph, WalletNode, TransactionEdge } from "@/types/solana";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { shortenAddress, formatSolAmount, formatTimeAgo, openInSolscan } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { HelpCircle, ZoomIn, ZoomOut, Maximize, Download, Share2, Filter as FilterIcon } from "lucide-react";

interface FlowVisualizationProps {
  graph: VisualizationGraph;
  onNodeClick?: (node: WalletNode) => void;
  onEdgeClick?: (edge: TransactionEdge) => void;
  selectedNode?: WalletNode | null;
  selectedEdge?: TransactionEdge | null;
  filteredWalletAddress?: string | null;
}

export default function FlowVisualization({
  graph,
  onNodeClick,
  onEdgeClick,
  selectedNode,
  selectedEdge,
  filteredWalletAddress
}: FlowVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<"force" | "radial" | "hierarchy">("force");
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  const { 
    zoomIn, 
    zoomOut, 
    resetZoom, 
    changeLayout 
  } = useVisualization({
    graph,
    container: containerRef,
    onNodeClick,
    onEdgeClick
  });

  const handleLayoutChange = (newLayout: string) => {
    const validLayout = newLayout as "force" | "radial" | "hierarchy";
    setLayout(validLayout);
    changeLayout(validLayout);
  };

  // Handle export visualization
  const handleExport = () => {
    if (!containerRef.current) return;
    
    try {
      const svg = containerRef.current.querySelector('svg');
      if (!svg) return;
      
      // Clone the SVG to avoid modifying the original
      const svgClone = svg.cloneNode(true) as SVGElement;
      
      // Set white background for better visibility in exported image
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', '100%');
      rect.setAttribute('height', '100%');
      rect.setAttribute('fill', '#1E1E2E');
      svgClone.insertBefore(rect, svgClone.firstChild);
      
      // Serialize SVG
      const serializer = new XMLSerializer();
      let source = serializer.serializeToString(svgClone);
      
      // Add XML declaration
      source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
      
      // Convert SVG to URL data
      const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      // Create download link
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = 'solflow_visualization.svg';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Clean up
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting visualization:', error);
    }
  };

  // Handle share visualization
  const handleShare = () => {
    // In a real app, this would generate a shareable link or open a share dialog
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        alert('Visualization URL copied to clipboard!');
      })
      .catch(err => {
        console.error('Error copying URL:', err);
      });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="font-medium text-white">Flow Visualization</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-gray-400 hover:text-white" />
              </TooltipTrigger>
              <TooltipContent className="bg-solana-dark-lighter text-gray-300 text-xs max-w-xs">
                This visualization shows transaction flows between wallets. Nodes represent wallets or smart contracts, and edges represent transactions.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center space-x-3">
          <div>
            <Select 
              value={layout}
              onValueChange={handleLayoutChange}
            >
              <SelectTrigger className="bg-solana-dark border border-solana-dark-lighter rounded-md py-1 px-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-solana-primary focus:border-solana-primary w-[140px]">
                <SelectValue placeholder="Layout" />
              </SelectTrigger>
              <SelectContent className="bg-solana-dark-lighter border-solana-dark text-white">
                <SelectItem value="force">Force-directed</SelectItem>
                <SelectItem value="radial">Circular</SelectItem>
                <SelectItem value="hierarchy">Hierarchical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex space-x-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="p-1.5 bg-solana-dark hover:bg-solana-dark-lighter text-gray-300 h-8 w-8"
                    onClick={zoomIn}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Zoom In</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="p-1.5 bg-solana-dark hover:bg-solana-dark-lighter text-gray-300 h-8 w-8"
                    onClick={zoomOut}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Zoom Out</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="p-1.5 bg-solana-dark hover:bg-solana-dark-lighter text-gray-300 h-8 w-8"
                    onClick={resetZoom}
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reset View</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="p-1.5 bg-solana-dark hover:bg-solana-dark-lighter text-gray-300 h-8 w-8"
                    onClick={handleExport}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Download Visualization</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="p-1.5 bg-solana-dark hover:bg-solana-dark-lighter text-gray-300 h-8 w-8"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Share Visualization</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
      
      {/* Visualization Canvas */}
      <div className="relative w-full h-[400px]" ref={containerRef}>
        {/* This div will be populated by D3.js visualization in the useVisualization hook */}
        {filteredWalletAddress && (
          <div className="absolute top-2 left-2 bg-solana-dark px-3 py-1 rounded-md flex items-center space-x-2 text-xs">
            <FilterIcon className="h-3 w-3 text-solana-primary" />
            <span className="text-white">Filtering by: {shortenAddress(filteredWalletAddress)}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-5 w-5 p-0 text-gray-400 hover:text-white" 
              onClick={() => onNodeClick && onNodeClick({id: filteredWalletAddress, address: filteredWalletAddress, type: 'wallet'})}
            >
              ×
            </Button>
          </div>
        )}
      </div>

      {/* Visualization Legend */}
      <div className="absolute bottom-2 left-2 bg-solana-dark bg-opacity-80 rounded-md p-2 text-xs">
        <div className="flex items-center mb-1">
          <div className="w-3 h-3 rounded-full bg-solana-primary mr-2"></div>
          <span className="text-gray-300">Main Wallet</span>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-3 h-3 rounded-full bg-solana-secondary mr-2"></div>
          <span className="text-gray-300">Connected Protocol</span>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-3 h-3 rounded-full bg-solana-dark-lighter mr-2"></div>
          <span className="text-gray-300">Other Wallets</span>
        </div>
        <div className="flex items-center">
          <div className="w-6 h-1 bg-solana-error mr-2"></div>
          <span className="text-gray-300">Critical Path</span>
        </div>
      </div>
      
      {/* Node/Edge Details Card */}
      {selectedNode && (
        <div className="absolute right-4 top-12 bg-solana-dark-lighter rounded-md p-3 text-xs shadow-lg border border-solana-dark-light w-48">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium text-white">
              {selectedNode.type === 'program' ? 'Program' : 'Wallet'}
            </span>
            <span className="text-gray-400 text-[10px]">
              {selectedNode.lastActivity ? `Last activity: ${formatTimeAgo(selectedNode.lastActivity)}` : ''}
            </span>
          </div>
          <div className="space-y-1 mb-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Address:</span>
              <span className="text-white font-mono">{shortenAddress(selectedNode.address)}</span>
            </div>
            {selectedNode.balance !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-400">Balance:</span>
                <span className="text-white">{formatSolAmount(selectedNode.balance)} SOL</span>
              </div>
            )}
            {selectedNode.transactionCount !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-400">Transaction Count:</span>
                <span className="text-white">{selectedNode.transactionCount}</span>
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <Button 
              variant={filteredWalletAddress === selectedNode.address ? "default" : "outline"}
              className={filteredWalletAddress === selectedNode.address 
                ? "bg-solana-primary text-white px-2 py-1 rounded text-[10px] flex-1 flex items-center justify-center space-x-1" 
                : "bg-solana-dark hover:bg-solana-dark-light text-gray-300 px-2 py-1 rounded text-[10px] flex-1 flex items-center justify-center space-x-1"
              }
              onClick={() => {
                if (selectedNode && onNodeClick) {
                  // Toggle filtering to only show interactions with this wallet
                  import("@/lib/utils").then(({ filterTransactionsByWallet }) => {
                    // This will be handled by the parent component through the onNodeClick callback
                    onNodeClick(selectedNode);
                  });
                }
              }}
            >
              {filteredWalletAddress === selectedNode.address ? (
                <>
                  <FilterIcon className="h-3 w-3" />
                  <span>Clear Filter</span>
                </>
              ) : (
                <>
                  <FilterIcon className="h-3 w-3" />
                  <span>Filter By Node</span>
                </>
              )}
            </Button>
            <Button 
              className="bg-solana-primary text-white px-2 py-1 rounded text-[10px] flex-1"
              onClick={() => {
                if (selectedNode) {
                  // Open the address in Solscan
                  openInSolscan(selectedNode.address);
                }
              }}
            >
              View in Solscan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
