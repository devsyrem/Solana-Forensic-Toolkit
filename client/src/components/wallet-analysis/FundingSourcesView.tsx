import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, AlertCircle, Loader2 } from 'lucide-react';

interface FundingSourcesViewProps {
  address: string;
}

interface FundingSource {
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

export default function FundingSourcesView({ address }: FundingSourcesViewProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['/api/wallet-analysis/funding-sources', address],
    queryFn: async () => {
      const response = await fetch(`/api/wallet-analysis/funding-sources/${address}`);
      if (!response.ok) {
        throw new Error('Failed to fetch funding sources');
      }
      return response.json() as Promise<FundingSource[]>;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <p>Loading funding sources...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error instanceof Error ? error.message : 'Failed to load funding sources'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No funding sources found for this wallet. This might be a newly created wallet or one with no incoming transactions.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Funding Sources</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>First Transaction</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Transactions</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((source) => (
              <TableRow key={source.id}>
                <TableCell className="font-mono">
                  {source.sourceAddress || `Source ID: ${source.sourceWalletId}`}
                </TableCell>
                <TableCell>
                  {new Date(source.firstTransactionDate).toLocaleDateString()}
                </TableCell>
                <TableCell>{source.totalAmount.toFixed(4)} SOL</TableCell>
                <TableCell>{source.transactionCount}</TableCell>
                <TableCell>
                  <Badge variant={source.isDirectSource ? "default" : "outline"}>
                    {source.isDirectSource ? "Direct" : "Indirect"}
                  </Badge>
                </TableCell>
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
  );
}