import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, Clock, BarChart2, ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ActivityPatternsViewProps {
  address: string;
}

interface ActivityPattern {
  id: number;
  walletId: number;
  pattern: string;
  frequency?: string;
  confidence: number;
  description: string;
  createdAt: string;
}

export default function ActivityPatternsView({ address }: ActivityPatternsViewProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['/api/wallet-analysis/activity-patterns', address],
    queryFn: async () => {
      const response = await fetch(`/api/wallet-analysis/activity-patterns/${address}`);
      if (!response.ok) {
        throw new Error('Failed to fetch activity patterns');
      }
      return response.json() as Promise<ActivityPattern[]>;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <p>Analyzing activity patterns...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error instanceof Error ? error.message : 'Failed to analyze activity patterns'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No distinct activity patterns detected for this wallet. This might be a new wallet or one with limited transaction history.
        </AlertDescription>
      </Alert>
    );
  }

  // Helper function to get icon based on pattern type
  const getPatternIcon = (pattern: string) => {
    if (pattern.includes('daily') || pattern.includes('weekly') || pattern.includes('monthly') || pattern.includes('frequent')) {
      return <Clock className="h-5 w-5" />;
    } else if (pattern.includes('amount') || pattern.includes('large-transfers')) {
      return <BarChart2 className="h-5 w-5" />;
    } else {
      return <ArrowUpDown className="h-5 w-5" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {data.map((pattern) => (
        <Card key={pattern.id} className="overflow-hidden">
          <CardHeader className="bg-muted p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center">
                {getPatternIcon(pattern.pattern)}
                <span className="ml-2">{pattern.pattern.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
              </CardTitle>
              <Badge variant="outline">
                {Math.round(pattern.confidence * 100)}% confidence
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <p>{pattern.description}</p>
            {pattern.frequency && (
              <div className="mt-2">
                <Badge variant="secondary">Frequency: {pattern.frequency}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}