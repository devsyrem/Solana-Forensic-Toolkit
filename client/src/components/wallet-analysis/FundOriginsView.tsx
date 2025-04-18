import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, ArrowRight } from 'lucide-react';

interface FundOriginsViewProps {
  address: string;
}

interface FundSource {
  id: number;
  sourceWalletId: number;
  sourceAddress?: string;
  firstTransactionSignature: string;
  firstTransactionDate: string;
  lastTransactionDate: string;
  totalAmount: number;
  transactionCount: number;
  isDirectSource: boolean;
  confidence: number;
  path?: string[];
}

export default function FundOriginsView({ address }: FundOriginsViewProps) {
  const [depth, setDepth] = useState(3);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['/api/wallet-analysis/fund-origins', address, depth],
    queryFn: async () => {
      const response = await fetch(`/api/wallet-analysis/fund-origins/${address}?depth=${depth}`);
      if (!response.ok) {
        throw new Error('Failed to trace fund origins');
      }
      return response.json() as Promise<FundSource[]>;
    },
  });

  // Handle depth change
  const handleDepthChange = (newDepth: number[]) => {
    const updatedDepth = newDepth[0];
    setDepth(updatedDepth);
    // No need to manually refetch, the query will refetch automatically when the depth changes
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <p>Tracing fund origins...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error instanceof Error ? error.message : 'Failed to trace fund origins'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No fund origins found for this wallet. This might be a new wallet or one with no incoming transactions.
        </AlertDescription>
      </Alert>
    );
  }

  // Filter for direct and indirect sources
  const directSources = data.filter(source => source.isDirectSource);
  const indirectSources = data.filter(source => !source.isDirectSource);

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <label htmlFor="depth-slider" className="text-sm font-medium">
          Trace Depth: {depth}
        </label>
        <Slider
          id="depth-slider"
          min={1}
          max={5}
          step={1}
          defaultValue={[depth]}
          onValueChange={handleDepthChange}
          className="w-full max-w-xs"
        />
        <p className="text-xs text-muted-foreground">
          Adjust to control how deep in the chain we trace the origin of funds.
        </p>
      </div>

      {directSources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Direct Sources ({directSources.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>First Transaction</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {directSources.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell className="font-mono text-xs break-all">
                      {source.sourceAddress || `Source ID: ${source.sourceWalletId}`}
                    </TableCell>
                    <TableCell>
                      {new Date(source.firstTransactionDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{source.totalAmount.toFixed(4)} SOL</TableCell>
                    <TableCell>{source.transactionCount}</TableCell>
                    <TableCell>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div
                          className="bg-primary h-2.5 rounded-full"
                          style={{ width: `${Math.round(source.confidence * 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(source.confidence * 100)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {indirectSources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Indirect Sources ({indirectSources.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>First Transaction</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {indirectSources.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell className="font-mono text-xs break-all">
                      {source.sourceAddress || `Source ID: ${source.sourceWalletId}`}
                    </TableCell>
                    <TableCell>
                      {source.path ? (
                        <div className="flex items-center flex-wrap gap-1">
                          {source.path.map((address, index) => (
                            <React.Fragment key={index}>
                              <Badge variant="outline" className="text-xs font-mono">
                                {address.slice(0, 4)}...{address.slice(-4)}
                              </Badge>
                              {index < source.path!.length - 1 && (
                                <ArrowRight className="h-3 w-3 mx-0.5" />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Path unknown</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(source.firstTransactionDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{source.totalAmount.toFixed(4)} SOL</TableCell>
                    <TableCell>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div
                          className="bg-primary h-2.5 rounded-full"
                          style={{ width: `${Math.round(source.confidence * 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(source.confidence * 100)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}