import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tag, Database, ExternalLink } from 'lucide-react';

export default function KnownEntityList() {
  // Fetch list of known entities from API
  const knownEntitiesQuery = useQuery({
    queryKey: ['/api/entity-labeling/entities/exchange'],
    queryFn: async () => {
      return apiRequest('/api/entity-labeling/entities/exchange');
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Handle loading state
  if (knownEntitiesQuery.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  // Handle error state
  if (knownEntitiesQuery.error) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <Database className="mx-auto h-8 w-8 mb-2 opacity-20" />
        <p>Error loading known entities</p>
        <p className="text-sm">{(knownEntitiesQuery.error as any)?.message || "Failed to load entities"}</p>
      </div>
    );
  }

  // Handle empty state
  if (!knownEntitiesQuery.data || !Array.isArray(knownEntitiesQuery.data) || knownEntitiesQuery.data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Database className="mx-auto h-12 w-12 mb-4 opacity-20" />
        <p>No known entities found</p>
        <p className="text-sm mt-2">
          You can add entities by searching and labeling wallets
        </p>
      </div>
    );
  }

  // Render entity list
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Known Exchanges and Entities</h3>
      <div className="space-y-2">
        {knownEntitiesQuery.data.map((entity: any) => (
          <div key={entity.id} className="rounded-lg border p-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">{entity.name}</h4>
                <Badge variant={entity.type === "exchange" ? "destructive" : "outline"} className="text-xs">
                  {entity.type}
                </Badge>
              </div>
              
              {entity.website && (
                <a 
                  href={entity.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
            
            {entity.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {entity.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}