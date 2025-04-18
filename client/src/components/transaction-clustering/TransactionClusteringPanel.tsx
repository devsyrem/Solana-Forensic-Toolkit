import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertTriangle, AlertCircle, Network, Users } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface TransactionCluster {
  id: string;
  transactionCount: number;
  transactionSignatures: string[];
  wallets: string[];
  createdAt: string;
  score: number;
  type: 'normal' | 'unusual' | 'suspicious';
  description: string;
}

interface AssociatedWallet {
  address: string;
  score: number;
  reason: string;
  transactionCount: number;
}

interface Props {
  address: string;
}

export default function TransactionClusteringPanel({ address }: Props) {
  const [activeTab, setActiveTab] = useState<'clusters' | 'associated-wallets'>('clusters');

  const {
    data: clusters,
    isLoading: isClustersLoading,
    error: clustersError,
    refetch: refetchClusters
  } = useQuery<TransactionCluster[]>({
    queryKey: ['/api/transaction-clustering/clusters', address],
    enabled: Boolean(address) && activeTab === 'clusters',
    refetchOnWindowFocus: false
  });

  const {
    data: associatedWallets,
    isLoading: isWalletsLoading,
    error: walletsError,
    refetch: refetchWallets
  } = useQuery<AssociatedWallet[]>({
    queryKey: ['/api/transaction-clustering/associated-wallets', address],
    enabled: Boolean(address) && activeTab === 'associated-wallets',
    refetchOnWindowFocus: false
  });

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === 'clusters') {
      refetchClusters();
    } else if (activeTab === 'associated-wallets') {
      refetchWallets();
    }
  }, [activeTab, refetchClusters, refetchWallets]);

  return (
    <Card className="bg-solana-dark border border-solana-dark-lighter">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Network className="h-5 w-5 text-solana-primary" />
          Transaction Clustering
        </CardTitle>
        <CardDescription className="text-gray-400">
          Group related transactions, identify associated wallets, and flag unusual movements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as 'clusters' | 'associated-wallets')}
          className="space-y-4"
        >
          <TabsList className="bg-solana-dark-lighter">
            <TabsTrigger value="clusters">Transaction Clusters</TabsTrigger>
            <TabsTrigger value="associated-wallets">Associated Wallets</TabsTrigger>
          </TabsList>

          <TabsContent value="clusters" className="space-y-4">
            {isClustersLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full bg-solana-dark-lighter" />
                <Skeleton className="h-24 w-full bg-solana-dark-lighter" />
                <Skeleton className="h-24 w-full bg-solana-dark-lighter" />
              </div>
            ) : clustersError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to load transaction clusters. Please try again.
                </AlertDescription>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchClusters()}
                  className="mt-2"
                >
                  Retry
                </Button>
              </Alert>
            ) : !clusters || clusters.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 mx-auto text-gray-500 mb-3" />
                <p className="text-gray-400">
                  No transaction clusters found for this wallet. 
                  This may be due to limited transaction history or transactions 
                  that don't form recognizable patterns.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {clusters.map((cluster) => (
                  <Card key={cluster.id} className={`
                    border-l-4 
                    ${cluster.type === 'normal' ? 'border-l-green-500' : 
                      cluster.type === 'unusual' ? 'border-l-yellow-500' : 'border-l-red-500'}
                    bg-solana-dark-light hover:bg-solana-dark-lighter transition-colors
                  `}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {cluster.type === 'normal' ? null : 
                            cluster.type === 'unusual' ? 
                              <AlertTriangle className="h-5 w-5 text-yellow-500" /> : 
                              <AlertCircle className="h-5 w-5 text-red-500" />
                          }
                          <span className="font-medium text-white">
                            {cluster.transactionCount} Transactions
                          </span>
                          <Badge variant={
                            cluster.type === 'normal' ? 'outline' : 
                            cluster.type === 'unusual' ? 'secondary' : 'destructive'
                          }>
                            {cluster.type.charAt(0).toUpperCase() + cluster.type.slice(1)}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(cluster.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-300 mb-3">{cluster.description}</p>
                      
                      <div className="flex flex-wrap gap-2 mt-2">
                        <div className="text-xs bg-solana-dark px-2 py-1 rounded text-gray-400">
                          <span className="text-gray-500">Wallets:</span> {cluster.wallets.length}
                        </div>
                        <div className="text-xs bg-solana-dark px-2 py-1 rounded text-gray-400">
                          <span className="text-gray-500">Score:</span> {(cluster.score * 100).toFixed(0)}%
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="associated-wallets" className="space-y-4">
            {isWalletsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full bg-solana-dark-lighter" />
                <Skeleton className="h-20 w-full bg-solana-dark-lighter" />
                <Skeleton className="h-20 w-full bg-solana-dark-lighter" />
              </div>
            ) : walletsError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to load associated wallets. Please try again.
                </AlertDescription>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchWallets()}
                  className="mt-2"
                >
                  Retry
                </Button>
              </Alert>
            ) : !associatedWallets || associatedWallets.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-gray-500 mb-3" />
                <p className="text-gray-400">
                  No associated wallets found for this address.
                  This wallet may have limited transaction history or may not 
                  show clear patterns of interaction with other wallets.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {associatedWallets.map((wallet) => (
                  <Card key={wallet.address} className={`
                    bg-solana-dark-light hover:bg-solana-dark-lighter transition-colors
                    border-l-4 ${wallet.score > 0.7 ? 'border-l-red-500' : 
                      wallet.score > 0.4 ? 'border-l-yellow-500' : 'border-l-green-500'}
                  `}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white truncate max-w-[180px]">
                            {wallet.address.slice(0, 4)}...{wallet.address.slice(-4)}
                          </span>
                          <Badge variant={
                            wallet.score > 0.7 ? 'destructive' : 
                            wallet.score > 0.4 ? 'secondary' : 'outline'
                          }>
                            {wallet.score > 0.7 ? 'High Association' : 
                             wallet.score > 0.4 ? 'Medium Association' : 'Low Association'}
                          </Badge>
                        </div>
                        <div className="text-xs bg-solana-dark px-2 py-1 rounded text-gray-400">
                          <span className="text-gray-500">Transactions:</span> {wallet.transactionCount}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-300 mt-2">{wallet.reason}</p>
                      
                      <div className="mt-3">
                        <div className="w-full bg-solana-dark rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${
                              wallet.score > 0.7 ? 'bg-red-500' : 
                              wallet.score > 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                            }`} 
                            style={{ width: `${wallet.score * 100}%` }}
                          ></div>
                        </div>
                        <div className="text-right text-xs text-gray-400 mt-1">
                          Association Score: {(wallet.score * 100).toFixed(0)}%
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}