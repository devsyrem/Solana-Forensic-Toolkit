import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Activity, Tag, Database, Users, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import KnownEntityList from './KnownEntityList';
import EntityForm from './EntityForm';

interface EntityLabelingPanelProps {
  address?: string;
  onEntityDetected?: (entityInfo: any) => void;
}

export default function EntityLabelingPanel({ address, onEntityDetected }: EntityLabelingPanelProps) {
  const [searchAddress, setSearchAddress] = useState(address || '');
  const { toast } = useToast();

  // Query for looking up known entity for an address
  const entityLookupQuery = useQuery({
    queryKey: ['/api/entity-labeling/lookup', searchAddress],
    queryFn: async () => {
      if (!searchAddress) return null;
      return apiRequest(`/api/entity-labeling/lookup/${searchAddress}`);
    },
    enabled: !!searchAddress && searchAddress.length > 30, // Only run query if address is provided and looks valid
    retry: false,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Query for detection of exchange patterns
  const exchangeDetectionQuery = useQuery({
    queryKey: ['/api/entity-labeling/detect-exchange', searchAddress],
    queryFn: async () => {
      if (!searchAddress) return null;
      return apiRequest(`/api/entity-labeling/detect-exchange/${searchAddress}`);
    },
    enabled: !!searchAddress && searchAddress.length > 30 && !entityLookupQuery.data,
    retry: false,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchAddress && searchAddress.length > 30) {
      entityLookupQuery.refetch();
      exchangeDetectionQuery.refetch();
    } else {
      toast({
        title: "Invalid address",
        description: "Please enter a valid Solana wallet address",
        variant: "destructive"
      });
    }
  };

  // Show loading state
  const isLoading = entityLookupQuery.isLoading || exchangeDetectionQuery.isLoading;
  
  // Show entity info when available
  const hasKnownEntity = entityLookupQuery.data && !entityLookupQuery.data.error;
  
  // Format confidence score as percentage
  const formatConfidence = (score: number) => {
    return `${Math.round(score * 100)}%`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" /> Entity & Exchange Labeling
        </CardTitle>
        <CardDescription>
          Identify known entities and detect exchange patterns for Solana wallets
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="lookup" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="lookup">Known Entities</TabsTrigger>
            <TabsTrigger value="detection">Pattern Detection</TabsTrigger>
            <TabsTrigger value="new">Add Entity</TabsTrigger>
          </TabsList>
          
          {/* Search form shown on all tabs */}
          <div className="mt-4 mb-4">
            <form onSubmit={handleSearch} className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="wallet-address">Wallet Address</Label>
                <Input 
                  id="wallet-address"
                  placeholder="Enter a Solana wallet address..." 
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Searching..." : "Search"}
              </Button>
            </form>
          </div>
          
          <TabsContent value="lookup">
            {entityLookupQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : hasKnownEntity ? (
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    {entityLookupQuery.data.name}
                    <Badge variant={entityLookupQuery.data.type === "exchange" ? "destructive" : "outline"}>
                      {entityLookupQuery.data.type}
                    </Badge>
                  </h3>
                  
                  <div className="mt-2 space-y-2 text-sm">
                    {entityLookupQuery.data.description && (
                      <p className="text-muted-foreground">{entityLookupQuery.data.description}</p>
                    )}
                    
                    {entityLookupQuery.data.website && (
                      <p className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        <a 
                          href={entityLookupQuery.data.website} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-500 hover:underline"
                        >
                          {entityLookupQuery.data.website}
                        </a>
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 pt-2">
                      {entityLookupQuery.data.riskLevel && (
                        <Badge 
                          variant={
                            entityLookupQuery.data.riskLevel === "high" ? "destructive" : 
                            entityLookupQuery.data.riskLevel === "medium" ? "default" : 
                            "outline"
                          }
                        >
                          Risk: {entityLookupQuery.data.riskLevel}
                        </Badge>
                      )}
                      
                      {entityLookupQuery.data.verificationStatus && (
                        <Badge variant="secondary">
                          {entityLookupQuery.data.verificationStatus}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => entityLookupQuery.refetch()}
                >
                  Refresh
                </Button>
              </div>
            ) : searchAddress ? (
              <div className="rounded-lg border p-4 text-center space-y-4">
                <p className="text-muted-foreground">No known entity found for this address</p>
                <div className="flex justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      // Switch to detection tab
                      const detectionTab = document.querySelector('[data-state="inactive"][value="detection"]') as HTMLElement;
                      if (detectionTab) detectionTab.click();
                    }}
                  >
                    Try Pattern Detection
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-4 opacity-20" />
                <p>Enter a wallet address to look up known entities</p>
                <p className="text-sm mt-2">
                  Our database includes major exchanges, DeFi protocols, and other important Solana entities
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="detection">
            {exchangeDetectionQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-[300px] w-full" />
              </div>
            ) : exchangeDetectionQuery.data && !exchangeDetectionQuery.data.error ? (
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    Pattern Analysis Results
                    {exchangeDetectionQuery.data.isExchange && (
                      <Badge variant="destructive">Likely Exchange</Badge>
                    )}
                  </h3>
                  
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Confidence Score:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-40 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500" 
                            style={{ width: `${exchangeDetectionQuery.data.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {formatConfidence(exchangeDetectionQuery.data.confidence)}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Recommended Type</h4>
                      <Badge variant="outline" className="text-xs">
                        {exchangeDetectionQuery.data.recommendedType}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(exchangeDetectionQuery.data.patterns).map(([patternType, patternData]: [string, any]) => (
                        <div key={patternType} className="rounded border p-3">
                          <h4 className="text-sm font-medium capitalize mb-2 flex items-center gap-1">
                            <Activity className="h-4 w-4" />
                            {patternType} Pattern
                          </h4>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500" 
                                style={{ width: `${patternData.score * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium min-w-[40px] text-right">
                              {formatConfidence(patternData.score)}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {Object.entries(patternData.indicators).map(([indicator, score]: [string, any]) => (
                              <div key={indicator} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground capitalize">{indicator}:</span>
                                <span>{formatConfidence(score)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {exchangeDetectionQuery.data.isExchange && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This wallet shows strong exchange-like behavior patterns.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => exchangeDetectionQuery.refetch()}
                  >
                    Refresh Analysis
                  </Button>
                </div>
              </div>
            ) : searchAddress ? (
              <div className="rounded-lg border p-4 text-center space-y-2">
                <p className="text-muted-foreground">Enter a wallet address and click "Search" to analyze transaction patterns</p>
                {exchangeDetectionQuery.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Error analyzing wallet: {(exchangeDetectionQuery.error as any)?.message || "Failed to analyze patterns"}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="mx-auto h-12 w-12 mb-4 opacity-20" />
                <p>Enter a wallet address to detect exchange patterns</p>
                <p className="text-sm mt-2">
                  Our algorithms analyze transaction patterns to identify exchange-related behavior
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="new">
            <EntityForm 
              address={searchAddress} 
              suggestedType={
                exchangeDetectionQuery.data?.recommendedType || 
                (entityLookupQuery.data?.type || "")
              }
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}