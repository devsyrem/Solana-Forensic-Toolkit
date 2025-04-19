import { useState, useEffect, useRef, RefObject } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, MessageSquare, Edit, Trash2, Reply, SendHorizontal, PenSquare, MoreHorizontal } from "lucide-react";

interface Comment {
  id: number;
  visualizationId: number;
  userId: number;
  username: string;
  content: string;
  referencedNodeAddress?: string;
  referencedTransactionSignature?: string;
  createdAt: string;
  updatedAt?: string;
  parentId?: number;
  replies?: Comment[];
}

interface VisualizationAnnotationProps {
  visualizationId: number;
  selectedNodeAddress?: string;
  selectedTransactionSignature?: string;
  svgRef?: RefObject<SVGSVGElement>;
}

export default function VisualizationAnnotation({ 
  visualizationId, 
  selectedNodeAddress, 
  selectedTransactionSignature,
  svgRef
}: VisualizationAnnotationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState<number | null>(null);
  
  // Get annotations for the visualization
  const { data: annotations, isLoading: isLoadingAnnotations } = useQuery({
    queryKey: ['/api/visualizations', visualizationId, 'annotations'],
    enabled: !!visualizationId,
  });
  
  // Create a new annotation
  const createAnnotationMutation = useMutation({
    mutationFn: async (annotation: {
      content: string;
      referencedNodeAddress?: string;
      referencedTransactionSignature?: string;
    }) => {
      return apiRequest(`/api/visualizations/${visualizationId}/annotations`, {
        method: 'POST',
        body: JSON.stringify(annotation),
      });
    },
    onSuccess: () => {
      toast({
        title: "Annotation created",
        description: "Your annotation has been added",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/visualizations', visualizationId, 'annotations'] });
      setCommentText("");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to add annotation",
        description: "Could not add your annotation. Please try again.",
      });
    },
  });
  
  // Reply to an annotation
  const replyToAnnotationMutation = useMutation({
    mutationFn: async ({ annotationId, content }: { annotationId: number, content: string }) => {
      return apiRequest(`/api/annotations/${annotationId}/replies`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Reply added",
        description: "Your reply has been added to the annotation",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/visualizations', visualizationId, 'annotations'] });
      setReplyingTo(null);
      setReplyText("");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to add reply",
        description: "Could not add your reply. Please try again.",
      });
    },
  });
  
  // Edit an annotation
  const editAnnotationMutation = useMutation({
    mutationFn: async ({ annotationId, content }: { annotationId: number, content: string }) => {
      return apiRequest(`/api/annotations/${annotationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Annotation updated",
        description: "Your annotation has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/visualizations', visualizationId, 'annotations'] });
      setEditingCommentId(null);
      setEditText("");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to update annotation",
        description: "Could not update your annotation. Please try again.",
      });
    },
  });
  
  // Delete an annotation
  const deleteAnnotationMutation = useMutation({
    mutationFn: async (annotationId: number) => {
      return apiRequest(`/api/annotations/${annotationId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Annotation deleted",
        description: "The annotation has been deleted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/visualizations', visualizationId, 'annotations'] });
      setShowConfirmDelete(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to delete annotation",
        description: "Could not delete the annotation. Please try again.",
      });
    },
  });
  
  // Handle adding a new annotation
  const handleAddAnnotation = () => {
    if (!commentText.trim()) return;
    
    const annotation: {
      content: string;
      referencedNodeAddress?: string;
      referencedTransactionSignature?: string;
    } = {
      content: commentText,
    };
    
    if (selectedNodeAddress) {
      annotation.referencedNodeAddress = selectedNodeAddress;
    }
    
    if (selectedTransactionSignature) {
      annotation.referencedTransactionSignature = selectedTransactionSignature;
    }
    
    createAnnotationMutation.mutate(annotation);
  };
  
  // Handle replying to an annotation
  const handleReply = (annotationId: number) => {
    if (!replyText.trim()) return;
    
    replyToAnnotationMutation.mutate({
      annotationId,
      content: replyText,
    });
  };
  
  // Handle editing an annotation
  const handleEdit = (annotation: Comment) => {
    setEditingCommentId(annotation.id);
    setEditText(annotation.content);
  };
  
  // Handle saving edited annotation
  const handleSaveEdit = (annotationId: number) => {
    if (!editText.trim()) return;
    
    editAnnotationMutation.mutate({
      annotationId,
      content: editText,
    });
  };
  
  // Handle deleting an annotation
  const handleDelete = (annotationId: number) => {
    deleteAnnotationMutation.mutate(annotationId);
  };
  
  // Filter annotations based on the active tab
  const getFilteredAnnotations = () => {
    if (!annotations) return [];
    
    if (activeTab === "all") {
      return annotations;
    } else if (activeTab === "wallet") {
      return annotations.filter((annotation: Comment) => 
        annotation.referencedNodeAddress === selectedNodeAddress
      );
    } else if (activeTab === "transaction") {
      return annotations.filter((annotation: Comment) => 
        annotation.referencedTransactionSignature === selectedTransactionSignature
      );
    }
    
    return annotations;
  };
  
  // Get the target element label
  const getTargetLabel = (annotation: Comment) => {
    if (annotation.referencedNodeAddress) {
      return `Wallet: ${formatAddress(annotation.referencedNodeAddress)}`;
    } else if (annotation.referencedTransactionSignature) {
      return `Transaction: ${formatAddress(annotation.referencedTransactionSignature)}`;
    } else {
      return "Visualization";
    }
  };
  
  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return "";
    if (address.length <= 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
  };
  
  // Highlight the referenced node or transaction in the visualization
  const highlightReference = (annotation: Comment) => {
    if (!svgRef || !svgRef.current) return;
    
    // This would be implemented with D3.js or other visualization library
    // For now, we'll just show a toast message
    if (annotation.referencedNodeAddress) {
      toast({
        title: "Highlighted wallet",
        description: `Focused on wallet ${formatAddress(annotation.referencedNodeAddress)}`,
      });
    } else if (annotation.referencedTransactionSignature) {
      toast({
        title: "Highlighted transaction",
        description: `Focused on transaction ${formatAddress(annotation.referencedTransactionSignature)}`,
      });
    }
  };
  
  // For demo purposes (no backend)
  const demoAnnotations: Comment[] = [
    {
      id: 1,
      visualizationId: 1,
      userId: 1,
      username: "alex_johnson",
      content: "This wallet shows a pattern of splitting funds to multiple addresses before sending to exchanges.",
      referencedNodeAddress: "DvCGv94hfo5JLNynwJmVp7tsgQJJTzR5uSKx8xZkxJQA",
      createdAt: "2023-12-01T10:30:00Z",
      replies: [
        {
          id: 4,
          visualizationId: 1,
          userId: 2,
          username: "sarah_chen",
          content: "Good catch! This is a typical money laundering pattern we've seen before.",
          parentId: 1,
          createdAt: "2023-12-01T11:15:00Z",
        }
      ]
    },
    {
      id: 2,
      visualizationId: 1,
      userId: 3,
      username: "mike_brown",
      content: "This transaction is unusually large compared to the wallet's normal activity.",
      referencedTransactionSignature: "5zrYs6XFQkCFZJxPTMjHzuvp7NWLZMcf1gBAXzXCQiRp4xc1RYFVZHFStXjmiZvU4BWrx",
      createdAt: "2023-12-02T09:45:00Z",
    },
    {
      id: 3,
      visualizationId: 1,
      userId: 2,
      username: "sarah_chen",
      content: "We should investigate all wallets connected to this main cluster.",
      createdAt: "2023-12-03T14:20:00Z",
    }
  ];
  
  // Use demo data for UI
  const displayAnnotations = annotations || demoAnnotations;
  const filteredAnnotations = activeTab === "all" 
    ? displayAnnotations 
    : displayAnnotations.filter((annotation: Comment) => 
        activeTab === "wallet" 
          ? annotation.referencedNodeAddress === selectedNodeAddress
          : annotation.referencedTransactionSignature === selectedTransactionSignature
      );
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h3 className="text-xl font-semibold text-white">Annotations</h3>
          <p className="text-gray-400 text-sm">Add notes and comments to specific elements in the visualization</p>
        </div>
        
        <Badge variant="outline" className="mt-2 md:mt-0">
          {displayAnnotations.length} {displayAnnotations.length === 1 ? "annotation" : "annotations"}
        </Badge>
      </div>
      
      {/* Annotation Tabs */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-solana-dark mb-4">
          <TabsTrigger value="all" className="data-[state=active]:bg-solana-primary">
            All Annotations
          </TabsTrigger>
          <TabsTrigger 
            value="wallet" 
            disabled={!selectedNodeAddress}
            className="data-[state=active]:bg-solana-primary"
          >
            Selected Wallet
          </TabsTrigger>
          <TabsTrigger 
            value="transaction" 
            disabled={!selectedTransactionSignature}
            className="data-[state=active]:bg-solana-primary"
          >
            Selected Transaction
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* New Annotation Form */}
      <Card className="bg-solana-dark border-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Add Annotation</CardTitle>
          <CardDescription>
            {selectedNodeAddress 
              ? `Adding note to wallet: ${formatAddress(selectedNodeAddress)}` 
              : selectedTransactionSignature 
                ? `Adding note to transaction: ${formatAddress(selectedTransactionSignature)}`
                : "Adding note to the entire visualization"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Textarea
              placeholder="Add your annotation or analysis..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button 
            onClick={handleAddAnnotation} 
            disabled={!commentText.trim()}
            className="flex items-center gap-2"
          >
            <PenSquare size={14} />
            <span>Add Annotation</span>
          </Button>
        </CardFooter>
      </Card>
      
      {/* Annotations List */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">
          {activeTab === "all" 
            ? "All Annotations" 
            : activeTab === "wallet" 
              ? `Annotations for ${formatAddress(selectedNodeAddress || "")}` 
              : `Annotations for Transaction ${formatAddress(selectedTransactionSignature || "")}`}
        </h4>
        
        {isLoadingAnnotations ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 rounded-full border-2 border-solana-primary border-t-transparent animate-spin"></div>
          </div>
        ) : filteredAnnotations.length === 0 ? (
          <div className="text-center py-8 bg-solana-dark rounded-lg">
            <MessageSquare className="h-12 w-12 mx-auto text-gray-500 mb-4" />
            <h4 className="text-lg font-medium text-white mb-2">No annotations yet</h4>
            <p className="text-gray-400">
              Be the first to add an annotation to this {
                activeTab === "wallet" ? "wallet" : activeTab === "transaction" ? "transaction" : "visualization"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnnotations.map((annotation: Comment) => (
              <Card key={annotation.id} className="bg-solana-dark border-none">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {annotation.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{annotation.username}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(annotation.createdAt).toLocaleString()}
                          {annotation.updatedAt && " (edited)"}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {(annotation.referencedNodeAddress || annotation.referencedTransactionSignature) && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => highlightReference(annotation)}
                          className="h-8 text-xs"
                        >
                          {getTargetLabel(annotation)}
                        </Button>
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEdit(annotation)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShowConfirmDelete(annotation.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {editingCommentId === annotation.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingCommentId(null)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleSaveEdit(annotation.id)}
                          disabled={!editText.trim()}
                        >
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-200 whitespace-pre-wrap">{annotation.content}</p>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col items-start">
                  {/* Replies */}
                  {annotation.replies && annotation.replies.length > 0 && (
                    <div className="w-full space-y-3 mt-2 mb-4 border-l-2 border-gray-700 pl-4">
                      {annotation.replies.map((reply) => (
                        <div key={reply.id} className="bg-solana-dark-light rounded-md p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback>
                                  {reply.username.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm">{reply.username}</div>
                                <div className="text-xs text-gray-400">
                                  {new Date(reply.createdAt).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-6 w-6 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(reply)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setShowConfirmDelete(reply.id)}>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          {editingCommentId === reply.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="min-h-[60px]"
                              />
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingCommentId(null)}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={() => handleSaveEdit(reply.id)}
                                  disabled={!editText.trim()}
                                >
                                  Save Changes
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-200">{reply.content}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Reply Form */}
                  {replyingTo === annotation.id ? (
                    <div className="w-full space-y-2">
                      <Textarea
                        placeholder="Write your reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="min-h-[80px]"
                      />
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyText("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleReply(annotation.id)}
                          disabled={!replyText.trim()}
                          className="flex items-center gap-1.5"
                        >
                          <SendHorizontal size={12} />
                          Reply
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setReplyingTo(annotation.id)}
                      className="mt-2"
                    >
                      <Reply className="h-4 w-4 mr-2" />
                      Reply
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showConfirmDelete !== null} onOpenChange={() => setShowConfirmDelete(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this annotation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDelete(null)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleDelete(showConfirmDelete!)}
              className="flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              Delete Annotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}