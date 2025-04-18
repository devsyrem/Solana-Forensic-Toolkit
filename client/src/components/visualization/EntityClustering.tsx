import { useState } from "react";
import { EntityCluster } from "@/types/solana";
import { Button } from "@/components/ui/button";
import { HelpCircle, Building, UserPlus, DollarSign, Eye, List } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

interface EntityClusteringProps {
  entityClusters: EntityCluster[];
  isLoading: boolean;
  onClusterSelect: (cluster: EntityCluster) => void;
}

export default function EntityClustering({ 
  entityClusters, 
  isLoading,
  onClusterSelect 
}: EntityClusteringProps) {
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);

  const getClusterIcon = (type: string) => {
    switch (type) {
      case 'exchange':
        return <Building className="h-4 w-4 text-solana-primary" />;
      case 'related':
        return <UserPlus className="h-4 w-4 text-solana-warning" />;
      case 'defi':
        return <DollarSign className="h-4 w-4 text-solana-info" />;
      default:
        return <Building className="h-4 w-4 text-gray-400" />;
    }
  };

  const getClusterColor = (type: string) => {
    switch (type) {
      case 'exchange':
        return 'bg-solana-primary text-solana-primary';
      case 'related':
        return 'bg-solana-warning text-solana-warning';
      case 'defi':
        return 'bg-solana-info text-solana-info';
      default:
        return 'bg-gray-500 text-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-solana-dark-light rounded-lg p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
          <Skeleton className="h-6 w-6 rounded" />
        </div>
        
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-solana-dark-light rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
          <h3 className="font-medium text-white">Entity Clustering</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-gray-400 hover:text-white" />
              </TooltipTrigger>
              <TooltipContent className="bg-solana-dark-lighter text-gray-300 text-xs max-w-xs">
                Entity clustering identifies related addresses that likely belong to the same entity based on transaction patterns.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <button className="text-gray-400 hover:text-white">
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>
      
      {entityClusters.length === 0 ? (
        <div className="bg-solana-dark rounded-lg p-6 text-center">
          <Building className="h-12 w-12 text-gray-500 mx-auto mb-2 opacity-30" />
          <p className="text-gray-300 mb-1">No entity clusters detected</p>
          <p className="text-xs text-gray-400">
            Clusters will appear when multiple related wallets are identified
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entityClusters.map((cluster, index) => (
            <div 
              key={index} 
              className="bg-solana-dark rounded-lg p-3"
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <div className={`w-6 h-6 ${getClusterColor(cluster.type)} bg-opacity-20 rounded-full flex items-center justify-center text-xs mr-2`}>
                    {getClusterIcon(cluster.type)}
                  </div>
                  <span className="text-sm font-medium text-white">{cluster.name}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 ${getClusterColor(cluster.type)} bg-opacity-20 rounded-full`}>
                  {cluster.walletCount} wallets
                </span>
              </div>
              <div className="text-xs text-gray-400 mb-2">{cluster.description}</div>
              
              {/* Show wallets if expanded */}
              {expandedCluster === cluster.id && (
                <div className="mb-3 pl-2 border-l-2 border-solana-dark-lighter">
                  <div className="text-xs text-gray-400 mb-1">Included addresses:</div>
                  <div className="space-y-1 max-h-20 overflow-y-auto pr-2 text-xs">
                    {cluster.wallets.slice(0, 5).map((wallet, i) => (
                      <div key={i} className="text-gray-300 font-mono">
                        {wallet.slice(0, 8)}...{wallet.slice(-4)}
                      </div>
                    ))}
                    {cluster.wallets.length > 5 && (
                      <div className="text-gray-400">
                        +{cluster.wallets.length - 5} more wallets
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-xs text-solana-secondary hover:text-solana-secondary hover:bg-solana-dark-lighter p-0 h-auto"
                  onClick={() => onClusterSelect(cluster)}
                >
                  <Eye className="h-3 w-3 mr-1" /> Show on graph
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-xs text-gray-300 hover:text-white hover:bg-solana-dark-lighter p-0 h-auto"
                  onClick={() => setExpandedCluster(expandedCluster === cluster.id ? null : cluster.id)}
                >
                  <List className="h-3 w-3 mr-1" /> 
                  {expandedCluster === cluster.id ? "Hide" : "View"} addresses
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
