import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  PlusCircle,
  Edit2,
  Trash2,
  X,
  Check,
  MapPin,
  ArrowRight,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";

type NodeAnnotation = {
  id: number;
  content: string;
  userId: number;
  username: string;
  visualizationId: number;
  createdAt: string;
  updatedAt?: string;
  position: { x: number; y: number };
  referencedNodeAddress?: string;
  referencedTransactionSignature?: string;
  profilePicture?: string;
  resolved: boolean;
  replies?: NodeAnnotation[];
};

type AnnotationProps = {
  visualizationId: number;
  selectedNodeAddress?: string;
  selectedTransactionSignature?: string;
  svgRef: React.RefObject<SVGSVGElement>;
};

export default function VisualizationAnnotation({
  visualizationId,
  selectedNodeAddress,
  selectedTransactionSignature,
  svgRef,
}: AnnotationProps) {
  const [annotations, setAnnotations] = useState<NodeAnnotation[]>([]);
  const [newAnnotation, setNewAnnotation] = useState("");
  const [editingAnnotation, setEditingAnnotation] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [annotationPosition, setAnnotationPosition] = useState<{ x: number; y: number } | null>(null);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock annotations
  const mockAnnotations: NodeAnnotation[] = [
    {
      id: 1,
      content: "This wallet seems to be connected to a major exchange. The transaction pattern matches with their hot wallet behavior.",
      userId: 1,
      username: "alex_blockchain",
      visualizationId: 1,
      createdAt: "2024-04-01T14:30:00Z",
      position: { x: 150, y: 200 },
      referencedNodeAddress: "8zJ9SBGqpvRMCYhQ5JSbixvYywX2VxvkVyNr4itZMpGh",
      profilePicture: "/avatars/alex.png",
      resolved: false,
      replies: [
        {
          id: 4,
          content: "I agree, it matches the pattern we've seen with Binance hot wallets.",
          userId: 2,
          username: "sara_analyst",
          visualizationId: 1,
          createdAt: "2024-04-01T15:45:00Z",
          position: { x: 150, y: 200 },
          referencedNodeAddress: "8zJ9SBGqpvRMCYhQ5JSbixvYywX2VxvkVyNr4itZMpGh",
          profilePicture: "/avatars/sara.png",
          resolved: false,
        },
      ],
    },
    {
      id: 2,
      content: "This transaction is unusually large and doesn't match the typical pattern for this wallet. Flagging for review.",
      userId: 3,
      username: "mike_researcher",
      visualizationId: 1,
      createdAt: "2024-04-02T09:15:00Z",
      position: { x: 300, y: 250 },
      referencedTransactionSignature: "4XE9kWpXB3RW9cQSXQ2LWmkA9Z1Y5Z9d8RNZ6vVF2tM5tG6Md7RXsVxTxnwgdk2UGtMuYHHZHP4Qu8H8HCEjYV2X",
      profilePicture: "/avatars/mike.png",
      resolved: true,
    },
    {
      id: 3,
      content: "This cluster of wallets appears to be related to a DeFi protocol. Note the recurring interaction with the same program addresses.",
      userId: 2,
      username: "sara_analyst",
      visualizationId: 1,
      createdAt: "2024-04-03T11:20:00Z",
      position: { x: 450, y: 150 },
      referencedNodeAddress: "3Jq6YQVLb5woahzJgGJQXnY8Ekc8oVDA8HK4eP4UxbdE",
      profilePicture: "/avatars/sara.png",
      resolved: false,
    },
  ];

  // In a real implementation, this would be fetched from the API
  /*
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/visualizations', visualizationId, 'annotations'],
    enabled: !!visualizationId,
  });

  useEffect(() => {
    if (data) {
      setAnnotations(data);
    }
  }, [data]);

  const createAnnotationMutation = useMutation({
    mutationFn: async (annotation: { 
      content: string; 
      visualizationId: number; 
      position: { x: number; y: number }; 
      referencedNodeAddress?: string;
      referencedTransactionSignature?: string;
    }) => {
      return apiRequest('/api/annotations', {
        method: 'POST',
        body: JSON.stringify(annotation),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/visualizations', visualizationId, 'annotations'] });
      setNewAnnotation("");
      setShowAnnotationModal(false);
      toast({
        title: "Annotation added",
        description: "Your annotation has been added to the visualization",
      });
    },
  });

  const updateAnnotationMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      return apiRequest(`/api/annotations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/visualizations', visualizationId, 'annotations'] });
      setEditingAnnotation(null);
      toast({
        title: "Annotation updated",
        description: "Your annotation has been updated",
      });
    },
  });

  const deleteAnnotationMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/annotations/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/visualizations', visualizationId, 'annotations'] });
      toast({
        title: "Annotation deleted",
        description: "Your annotation has been deleted",
      });
    },
  });

  const resolveAnnotationMutation = useMutation({
    mutationFn: async ({ id, resolved }: { id: number; resolved: boolean }) => {
      return apiRequest(`/api/annotations/${id}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ resolved }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/visualizations', visualizationId, 'annotations'] });
      toast({
        title: "Annotation updated",
        description: "Annotation status has been updated",
      });
    },
  });
  */

  useEffect(() => {
    // For prototype: Just use mock annotations
    setAnnotations(mockAnnotations);
  }, []);

  // Used in the actual integration - captures click position on the SVG for creating annotations
  const handleAnnotationPlacement = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    
    const svgRect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - svgRect.left;
    const y = e.clientY - svgRect.top;
    
    setAnnotationPosition({ x, y });
    setShowAnnotationModal(true);
  };

  // For prototype: Adding a new annotation
  const addAnnotation = () => {
    if (!newAnnotation.trim()) return;
    
    const newId = Math.max(0, ...annotations.map(a => a.id)) + 1;
    const position = annotationPosition || { x: 300, y: 300 }; // Default position
    
    const newAnnotationObj: NodeAnnotation = {
      id: newId,
      content: newAnnotation,
      userId: 1, // Mock current user
      username: "current_user",
      visualizationId,
      createdAt: new Date().toISOString(),
      position,
      referencedNodeAddress: selectedNodeAddress,
      referencedTransactionSignature: selectedTransactionSignature,
      profilePicture: "/avatars/user.png",
      resolved: false,
    };
    
    setAnnotations([...annotations, newAnnotationObj]);
    setNewAnnotation("");
    setShowAnnotationModal(false);
    
    toast({
      title: "Annotation added",
      description: "Your annotation has been added to the visualization",
    });
  };

  // For prototype: Updating an annotation
  const updateAnnotation = (id: number) => {
    if (!editContent.trim()) return;
    
    const updatedAnnotations = annotations.map(annotation => 
      annotation.id === id 
        ? { 
            ...annotation, 
            content: editContent, 
            updatedAt: new Date().toISOString() 
          } 
        : annotation
    );
    
    setAnnotations(updatedAnnotations);
    setEditingAnnotation(null);
    
    toast({
      title: "Annotation updated",
      description: "Your annotation has been updated",
    });
  };

  // For prototype: Deleting an annotation
  const deleteAnnotation = (id: number) => {
    const updatedAnnotations = annotations.filter(annotation => annotation.id !== id);
    setAnnotations(updatedAnnotations);
    
    toast({
      title: "Annotation deleted",
      description: "Your annotation has been deleted",
    });
  };

  // For prototype: Resolving/unresolving an annotation
  const toggleResolveAnnotation = (id: number, resolved: boolean) => {
    const updatedAnnotations = annotations.map(annotation => 
      annotation.id === id 
        ? { ...annotation, resolved } 
        : annotation
    );
    
    setAnnotations(updatedAnnotations);
    
    toast({
      title: "Annotation updated",
      description: `Annotation marked as ${resolved ? 'resolved' : 'unresolved'}`,
    });
  };

  // Format timestamp to relative time (e.g., "5 minutes ago")
  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return "unknown time";
    }
  };

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <>
      {/* Annotation markers on visualization nodes */}
      {annotations.map((annotation) => (
        <Popover key={annotation.id}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="absolute rounded-full w-6 h-6 p-1 bg-solana-secondary text-white hover:bg-solana-secondary-light"
              style={{
                left: `${annotation.position.x}px`,
                top: `${annotation.position.y}px`,
                transform: "translate(-50%, -50%)",
                zIndex: 100,
              }}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="bg-solana-dark-light border-solana-dark-lighter w-72">
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    {annotation.profilePicture ? (
                      <AvatarImage src={annotation.profilePicture} alt={annotation.username} />
                    ) : (
                      <AvatarFallback>{getInitials(annotation.username)}</AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium text-white">{annotation.username}</div>
                    <div className="text-xs text-gray-400">{formatTime(annotation.createdAt)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {annotation.resolved && (
                    <Badge className="bg-green-600 text-[10px]">Resolved</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-gray-400 hover:text-white"
                    onClick={() => toggleResolveAnnotation(annotation.id, !annotation.resolved)}
                  >
                    {annotation.resolved ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
              
              {editingAnnotation === annotation.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="bg-solana-dark border-solana-dark-lighter text-white min-h-[80px] text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setEditingAnnotation(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-solana-primary hover:bg-solana-primary-dark"
                      onClick={() => updateAnnotation(annotation.id)}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-sm text-gray-300">
                    {annotation.content}
                  </div>
                  
                  {(annotation.referencedNodeAddress || annotation.referencedTransactionSignature) && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <MapPin className="h-3 w-3" />
                      {annotation.referencedNodeAddress ? (
                        <span>Wallet: {annotation.referencedNodeAddress.slice(0, 4)}...{annotation.referencedNodeAddress.slice(-4)}</span>
                      ) : (
                        <span>Transaction: {annotation.referencedTransactionSignature.slice(0, 4)}...{annotation.referencedTransactionSignature.slice(-4)}</span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px] text-gray-400 hover:text-white"
                      onClick={() => {
                        setEditingAnnotation(annotation.id);
                        setEditContent(annotation.content);
                      }}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px] text-gray-400 hover:text-white"
                      onClick={() => deleteAnnotation(annotation.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </>
              )}
              
              {/* Replies */}
              {annotation.replies && annotation.replies.length > 0 && (
                <div className="mt-3 pt-3 border-t border-solana-dark space-y-3">
                  {annotation.replies.map((reply) => (
                    <div key={reply.id} className="pl-3 border-l-2 border-solana-dark">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            {reply.profilePicture ? (
                              <AvatarImage src={reply.profilePicture} alt={reply.username} />
                            ) : (
                              <AvatarFallback className="text-[8px]">{getInitials(reply.username)}</AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <div className="text-xs font-medium text-white">{reply.username}</div>
                            <div className="text-[10px] text-gray-400">{formatTime(reply.createdAt)}</div>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-300 mt-1">
                        {reply.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Reply input */}
              <div className="mt-2 pt-2 border-t border-solana-dark">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Reply to this annotation..."
                    className="w-full bg-solana-dark border-solana-dark-lighter text-white text-xs rounded-md py-1 px-2"
                  />
                  <Button
                    size="sm"
                    className="absolute right-1 top-1 h-5 px-2 bg-solana-primary hover:bg-solana-primary-dark text-white text-[10px]"
                  >
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      ))}
      
      {/* Add annotation button */}
      <Button
        className="fixed bottom-4 right-4 bg-solana-primary hover:bg-solana-primary-dark text-white z-10"
        onClick={() => setShowAnnotationModal(true)}
      >
        <PlusCircle className="h-4 w-4 mr-2" />
        Add Annotation
      </Button>
      
      {/* Add annotation modal */}
      {showAnnotationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-solana-dark-light rounded-lg p-4 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">Add Annotation</h3>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white"
                onClick={() => setShowAnnotationModal(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Comment</label>
                <Textarea
                  value={newAnnotation}
                  onChange={(e) => setNewAnnotation(e.target.value)}
                  placeholder="Add your annotation here..."
                  className="bg-solana-dark border-solana-dark-lighter text-white min-h-[100px]"
                />
              </div>
              
              {(selectedNodeAddress || selectedTransactionSignature) && (
                <div className="bg-solana-dark p-2 rounded-md">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <MapPin className="h-4 w-4 text-solana-secondary" />
                    {selectedNodeAddress ? (
                      <span>Referencing wallet: {selectedNodeAddress.slice(0, 6)}...{selectedNodeAddress.slice(-6)}</span>
                    ) : (
                      <span>Referencing transaction: {selectedTransactionSignature.slice(0, 6)}...{selectedTransactionSignature.slice(-6)}</span>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAnnotationModal(false)}
                  className="border-solana-dark-lighter text-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={addAnnotation}
                  disabled={!newAnnotation.trim()}
                  className="bg-solana-primary text-white hover:bg-solana-primary-dark"
                >
                  Add Annotation
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}