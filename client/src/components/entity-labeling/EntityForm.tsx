import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

// Form validation schema
const formSchema = z.object({
  name: z.string().min(2, { message: "Entity name must be at least 2 characters" }),
  type: z.string().min(1, { message: "Please select an entity type" }),
  description: z.string().optional(),
  website: z.string().url({ message: "Please enter a valid URL" }).optional().or(z.literal('')),
  address: z.string().min(30, { message: "Please enter a valid Solana address" }),
  riskLevel: z.enum(["low", "medium", "high"]).optional(),
  verificationStatus: z.enum(["verified", "unverified"]).optional(),
});

interface EntityFormProps {
  address?: string;
  suggestedType?: string;
}

export default function EntityForm({ address = '', suggestedType = 'exchange' }: EntityFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Initialize form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      type: suggestedType || 'exchange',
      description: '',
      website: '',
      address: address,
      riskLevel: 'low',
      verificationStatus: 'unverified',
    },
  });

  // Mutation for creating a new entity
  const createEntityMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      return apiRequest('/api/entity-labeling/entity', {
        method: 'POST',
        data: values,
      });
    },
    onSuccess: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/entity-labeling/entities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/entity-labeling/lookup', address] });
      
      // Show success message
      toast({
        title: "Entity created successfully",
        description: "The entity has been added to the database",
        variant: "default",
      });
      
      // Reset form
      form.reset({
        name: '',
        type: suggestedType || 'exchange',
        description: '',
        website: '',
        address: address,
        riskLevel: 'low',
        verificationStatus: 'unverified',
      });
    },
    onError: (error: any) => {
      // Show error message
      toast({
        title: "Failed to create entity",
        description: error.message || "An error occurred while creating the entity",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createEntityMutation.mutate(values);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Create New Entity</h3>
      </div>
      
      {createEntityMutation.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : createEntityMutation.isSuccess ? (
        <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30 text-green-800 dark:text-green-400">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Entity successfully created and added to the database
          </AlertDescription>
        </Alert>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Binance, Solana Foundation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entity Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select entity type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="exchange">Exchange</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                        <SelectItem value="foundation">Foundation</SelectItem>
                        <SelectItem value="validator">Validator</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of this entity" 
                      className="resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Provide any additional information about this entity
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wallet Address</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    Primary Solana wallet address for this entity
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="riskLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk Level</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select risk level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="verificationStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select verification status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="unverified">Unverified</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex justify-end">
              <Button type="submit">Create Entity</Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}