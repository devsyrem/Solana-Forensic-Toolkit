import { WalletSummary as WalletSummaryType } from "@/types/solana";
import { shortenAddress, formatSolAmount, formatTimeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Copy, Wallet, Store, ExternalLink, BarChart2, RotateCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface WalletSummaryProps {
  walletSummary: WalletSummaryType | null;
  isLoading: boolean;
}

export default function WalletSummary({ walletSummary, isLoading }: WalletSummaryProps) {
  const copyAddress = () => {
    if (!walletSummary) return;
    
    navigator.clipboard.writeText(walletSummary.address)
      .then(() => {
        // In a real app, this could be a toast notification
        console.log('Address copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy address:', err);
      });
  };

  // Get appropriate icon for interaction type
  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'program':
        return <div className="w-6 h-6 bg-solana-dark-lighter rounded-full flex items-center justify-center text-xs"><Store className="h-3 w-3 text-solana-secondary" /></div>;
      case 'wallet':
        return <div className="w-6 h-6 bg-solana-dark-lighter rounded-full flex items-center justify-center text-xs"><Wallet className="h-3 w-3 text-solana-info" /></div>;
      default:
        return <div className="w-6 h-6 bg-solana-dark-lighter rounded-full flex items-center justify-center text-xs"><ExternalLink className="h-3 w-3 text-solana-warning" /></div>;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-solana-dark-light rounded-lg p-4">
        <div className="flex justify-between items-start mb-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          
          <div>
            <Skeleton className="h-4 w-32 mb-2" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!walletSummary) {
    return (
      <div className="bg-solana-dark-light rounded-lg p-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-medium text-white">Wallet Summary</h3>
        </div>
        
        <div className="flex flex-col items-center justify-center py-8 text-gray-400 text-center">
          <Wallet className="h-12 w-12 mb-2 opacity-40" />
          <p>No wallet data available</p>
          <p className="text-sm">Search for a wallet to see its summary</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-solana-dark-light rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-medium text-white">Wallet Summary</h3>
        <button className="text-gray-400 hover:text-white">
          <RotateCw className="h-4 w-4" />
        </button>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="bg-solana-primary bg-opacity-20 rounded-full p-2">
            <Wallet className="h-5 w-5 text-solana-primary" />
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center">
              <span className="font-mono text-sm text-white truncate">{shortenAddress(walletSummary.address, 6)}</span>
              <button 
                className="ml-1 text-gray-400 hover:text-white"
                onClick={copyAddress}
                aria-label="Copy address"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
            <div className="flex items-center text-xs text-gray-400">
              <span>
                {walletSummary.createdAt 
                  ? `Created: ${new Date(walletSummary.createdAt).toLocaleDateString()}`
                  : `Last active: ${walletSummary.lastActivity ? formatTimeAgo(walletSummary.lastActivity) : 'Unknown'}`
                }
              </span>
              <span className="mx-2">•</span>
              <span className="text-solana-secondary">Active</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-solana-dark rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Total Balance</div>
            <div className="text-white font-medium">{formatSolAmount(walletSummary.balance)} SOL</div>
          </div>
          <div className="bg-solana-dark rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Transactions</div>
            <div className="text-white font-medium">{walletSummary.transactionCount}</div>
          </div>
          <div className="bg-solana-dark rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Connected Wallets</div>
            <div className="text-white font-medium">{walletSummary.connectedWallets}</div>
          </div>
          <div className="bg-solana-dark rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Last Activity</div>
            <div className="text-white font-medium">
              {walletSummary.lastActivity ? formatTimeAgo(walletSummary.lastActivity) : 'Unknown'}
            </div>
          </div>
        </div>
        
        <div>
          <div className="text-xs text-gray-400 mb-2">Top Interactions</div>
          {walletSummary.topInteractions.length > 0 ? (
            <div className="space-y-2">
              {walletSummary.topInteractions.map((interaction, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getInteractionIcon(interaction.type)}
                    <span className="ml-2 text-sm text-white truncate max-w-[120px]">
                      {interaction.entity.length > 10 
                        ? shortenAddress(interaction.entity, 4) 
                        : interaction.entity
                      }
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{interaction.count} txns</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-2 text-gray-400 text-sm">
              No interaction data available
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 bg-solana-dark hover:bg-solana-dark-lighter text-gray-300"
          >
            <BarChart2 className="h-4 w-4 mr-1" /> 
            View Analytics
          </Button>
          <Button 
            size="sm" 
            className="flex-1 bg-solana-primary text-white hover:bg-opacity-90"
          >
            <ExternalLink className="h-4 w-4 mr-1" /> 
            Explorer
          </Button>
        </div>
      </div>
    </div>
  );
}
