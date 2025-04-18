import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, Building, Globe, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AvatarFallback, Avatar } from '@/components/ui/avatar';

interface EntityConnectionsViewProps {
  address: string;
}

interface Entity {
  id: number;
  name: string;
  type: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isPublic: boolean | null;
  createdAt: string;
  website?: string;
  riskLevel?: string;
  verificationStatus?: string;
}

export default function EntityConnectionsView({ address }: EntityConnectionsViewProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['/api/wallet-analysis/entity-connections', address],
    queryFn: async () => {
      const response = await fetch(`/api/wallet-analysis/entity-connections/${address}`);
      if (!response.ok) {
        throw new Error('Failed to fetch entity connections');
      }
      return response.json() as Promise<Entity[]>;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <p>Identifying connected entities...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error instanceof Error ? error.message : 'Failed to identify entity connections'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No known entity connections identified for this wallet. We couldn't match this wallet with any known entities in our database.
        </AlertDescription>
      </Alert>
    );
  }

  // Helper function to get entity icon
  const getEntityIcon = (entity: Entity) => {
    if (entity.type === 'exchange') {
      return <Building />;
    } else if (entity.type === 'protocol') {
      return <Globe />;
    } else {
      // First letters of entity name
      const initials = entity.name
        .split(' ')
        .map(word => word[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
      
      return initials;
    }
  };

  // Helper function for verification status icon
  const getVerificationIcon = (status?: string) => {
    if (status === 'verified') {
      return <ShieldCheck className="h-4 w-4 text-green-500" />;
    } else if (status === 'suspicious') {
      return <ShieldAlert className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {data.map((entity) => (
        <Card key={entity.id} className="overflow-hidden">
          <CardHeader className={`p-4 ${entity.color ? '' : 'bg-muted'}`} style={entity.color ? { backgroundColor: entity.color } : {}}>
            <div className="flex items-center">
              <Avatar className="h-10 w-10 mr-3">
                <AvatarFallback>{typeof getEntityIcon(entity) === 'string' ? getEntityIcon(entity) : 'EN'}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg font-semibold flex items-center">
                  {entity.name}
                  {entity.verificationStatus && (
                    <span className="ml-2">{getVerificationIcon(entity.verificationStatus)}</span>
                  )}
                </CardTitle>
                <Badge variant="outline" className="mt-1">
                  {entity.type.charAt(0).toUpperCase() + entity.type.slice(1)}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {entity.description && <p className="mb-2">{entity.description}</p>}
            <div className="flex flex-wrap gap-2 mt-2">
              {entity.website && (
                <Badge variant="secondary" className="flex items-center">
                  <Globe className="h-3 w-3 mr-1" />
                  <a href={entity.website} target="_blank" rel="noopener noreferrer">
                    Website
                  </a>
                </Badge>
              )}
              {entity.riskLevel && (
                <Badge 
                  variant={
                    entity.riskLevel === 'high' ? 'destructive' : 
                    entity.riskLevel === 'medium' ? 'default' : 
                    'outline'
                  }
                >
                  {entity.riskLevel.charAt(0).toUpperCase() + entity.riskLevel.slice(1)} risk
                </Badge>
              )}
              {entity.isPublic !== null && (
                <Badge variant="secondary">
                  {entity.isPublic ? 'Public entity' : 'Private entity'}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}