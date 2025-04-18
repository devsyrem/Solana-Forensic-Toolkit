import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, AlertCircle, Coins, GitCommit, Network, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FundingSourcesView from './FundingSourcesView';
import ActivityPatternsView from './ActivityPatternsView';
import EntityConnectionsView from './EntityConnectionsView';
import FundOriginsView from './FundOriginsView';

export type WalletAnalysisProps = {
  initialAddress?: string;
};

export default function WalletAnalysisPanel({ initialAddress = '' }: WalletAnalysisProps) {
  const [walletAddress, setWalletAddress] = useState(initialAddress);
  const [activeAddress, setActiveAddress] = useState(initialAddress);
  const [activeTab, setActiveTab] = useState('funding-sources');
  const { toast } = useToast();

  // Query to check wallet validity and basic info
  const { data: walletInfo, isLoading: isWalletLoading, isError: isWalletError } = 
    useQuery({
      queryKey: ['/api/solana/account', activeAddress],
      queryFn: async () => {
        if (!activeAddress) return null;
        const response = await fetch(`/api/solana/account/${activeAddress}`);
        if (!response.ok) {
          throw new Error('Failed to fetch wallet data');
        }
        return response.json();
      },
      enabled: !!activeAddress,
    });

  const handleSubmit = () => {
    if (!walletAddress) {
      toast({
        title: 'Enter an address',
        description: 'Please enter a Solana wallet address to analyze.',
        variant: 'destructive',
      });
      return;
    }

    setActiveAddress(walletAddress);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Wallet Analysis</CardTitle>
          <CardDescription>
            Analyze Solana wallet transactions, funding sources, patterns, and connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Enter Solana wallet address"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="w-full"
              />
            </div>
            <Button onClick={handleSubmit} disabled={isWalletLoading}>
              {isWalletLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Analyze Wallet'
              )}
            </Button>
          </div>

          {isWalletError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to fetch wallet data. Please check the address and try again.
              </AlertDescription>
            </Alert>
          )}

          {walletInfo && (
            <div className="mb-6">
              <Alert className="bg-muted">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <AlertTitle className="mb-2">Wallet Address</AlertTitle>
                    <AlertDescription className="font-mono break-all">
                      {walletInfo.address}
                    </AlertDescription>
                  </div>
                  <div>
                    <AlertTitle className="mb-2">Balance</AlertTitle>
                    <AlertDescription className="text-lg font-semibold">
                      {walletInfo.balance.toFixed(4)} SOL
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            </div>
          )}

          {walletInfo && (
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
                <TabsTrigger value="funding-sources" className="flex items-center">
                  <Coins className="mr-2 h-4 w-4" />
                  <span className="hidden md:inline">Funding Sources</span>
                  <span className="md:hidden">Sources</span>
                </TabsTrigger>
                <TabsTrigger value="activity-patterns" className="flex items-center">
                  <GitCommit className="mr-2 h-4 w-4" />
                  <span className="hidden md:inline">Activity Patterns</span>
                  <span className="md:hidden">Patterns</span>
                </TabsTrigger>
                <TabsTrigger value="entity-connections" className="flex items-center">
                  <Network className="mr-2 h-4 w-4" />
                  <span className="hidden md:inline">Entity Connections</span>
                  <span className="md:hidden">Entities</span>
                </TabsTrigger>
                <TabsTrigger value="fund-origins" className="flex items-center">
                  <Share2 className="mr-2 h-4 w-4" />
                  <span className="hidden md:inline">Fund Origins</span>
                  <span className="md:hidden">Origins</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="funding-sources" className="mt-4">
                {activeAddress && <FundingSourcesView address={activeAddress} />}
              </TabsContent>
              
              <TabsContent value="activity-patterns" className="mt-4">
                {activeAddress && <ActivityPatternsView address={activeAddress} />}
              </TabsContent>
              
              <TabsContent value="entity-connections" className="mt-4">
                {activeAddress && <EntityConnectionsView address={activeAddress} />}
              </TabsContent>
              
              <TabsContent value="fund-origins" className="mt-4">
                {activeAddress && <FundOriginsView address={activeAddress} />}
              </TabsContent>
            </Tabs>
          )}

          {activeAddress && !walletInfo && !isWalletError && !isWalletLoading && (
            <div className="text-center py-10">
              <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Fetching wallet information...</p>
            </div>
          )}

          {!activeAddress && (
            <div className="text-center py-10">
              <p className="text-muted-foreground">Enter a Solana wallet address to begin analysis</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}