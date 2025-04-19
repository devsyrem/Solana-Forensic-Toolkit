import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Share2, UserPlus, MessageSquare, ExternalLink, Copy, Eye, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type TeamMember = {
  id: number;
  username: string;
  profilePicture?: string;
  role: "owner" | "admin" | "editor" | "viewer";
  status: "active" | "invited" | "inactive";
  joinedAt: string;
};

type Team = {
  id: number;
  name: string;
  description?: string;
  avatarUrl?: string;
  memberCount: number;
  visualizationCount: number;
  ownerId: number;
  role?: "owner" | "admin" | "editor" | "viewer";
  createdAt: string;
};

export default function TeamCollaboration({ visualizationId }: { visualizationId?: number }) {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // For prototyping: Mock data for teams
  const mockTeams: Team[] = [
    {
      id: 1, 
      name: "Blockchain Research Team", 
      description: "Team analyzing Solana transaction patterns for research purposes",
      memberCount: 5,
      visualizationCount: 8,
      ownerId: 1,
      role: "owner",
      createdAt: "2023-11-15T12:00:00Z"
    },
    {
      id: 2, 
      name: "Compliance Group", 
      description: "Tracking and monitoring suspicious activities",
      memberCount: 3,
      visualizationCount: 12,
      ownerId: 2,
      role: "editor",
      createdAt: "2023-12-05T16:30:00Z"
    }
  ];

  // For prototyping: Mock data for team members
  const mockMembers: TeamMember[] = [
    { id: 1, username: "alex_blockchain", profilePicture: "/avatars/alex.png", role: "owner", status: "active", joinedAt: "2023-11-15T12:00:00Z" },
    { id: 2, username: "sara_analyst", profilePicture: "/avatars/sara.png", role: "admin", status: "active", joinedAt: "2023-11-16T09:45:00Z" },
    { id: 3, username: "mike_researcher", profilePicture: "/avatars/mike.png", role: "editor", status: "active", joinedAt: "2023-11-20T14:30:00Z" },
    { id: 4, username: "jane_compliance", profilePicture: "/avatars/jane.png", role: "viewer", status: "active", joinedAt: "2023-12-01T11:15:00Z" },
    { id: 5, username: "david_crypto", profilePicture: "/avatars/david.png", role: "viewer", status: "invited", joinedAt: "2024-01-05T16:20:00Z" }
  ];

  // For prototype: Mock share with team
  const shareWithTeam = (teamId: number) => {
    toast({
      title: "Visualization shared",
      description: `Visualization has been shared with ${mockTeams.find(t => t.id === teamId)?.name}`,
    });
  };

  // For prototype: Mock invite user
  const inviteUser = (email: string, role: string = "viewer") => {
    if (!email.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Invitation sent",
      description: `Invitation has been sent to ${email}`,
    });
    
    setInviteEmail("");
    setShowInviteDialog(false);
  };

  // For prototype: Mock copy share link
  const copyShareLink = () => {
    navigator.clipboard.writeText(`https://app.example.com/shared/visualization/${visualizationId}`);
    toast({
      title: "Link copied",
      description: "Share link has been copied to clipboard",
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner": return "bg-purple-500";
      case "admin": return "bg-blue-500";
      case "editor": return "bg-green-500";
      case "viewer": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <Card className="bg-solana-dark-light border-solana-dark-lighter">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-solana-info" />
            <CardTitle className="text-white text-lg">Team Collaboration</CardTitle>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-solana-secondary border-solana-secondary hover:bg-solana-secondary hover:bg-opacity-10">
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-solana-dark-light border-solana-dark-lighter text-white">
              <DialogHeader>
                <DialogTitle>Share Visualization</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Share this visualization with your team or generate a public link.
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="teams">
                <TabsList className="grid grid-cols-2 bg-solana-dark">
                  <TabsTrigger value="teams" className="data-[state=active]:bg-solana-primary data-[state=active]:text-white">Teams</TabsTrigger>
                  <TabsTrigger value="public" className="data-[state=active]:bg-solana-primary data-[state=active]:text-white">Public Link</TabsTrigger>
                </TabsList>
                
                <TabsContent value="teams" className="mt-4 space-y-4">
                  <div className="text-sm text-gray-300 mb-2">
                    Select a team to share this visualization with:
                  </div>
                  
                  <ScrollArea className="h-[200px] rounded-md border border-solana-dark-lighter p-2">
                    {mockTeams.map((team) => (
                      <div 
                        key={team.id}
                        className="flex items-center justify-between p-2 mb-2 rounded-md hover:bg-solana-dark cursor-pointer"
                        onClick={() => setSelectedTeam(team)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {team.avatarUrl ? (
                              <AvatarImage src={team.avatarUrl} alt={team.name} />
                            ) : (
                              <AvatarFallback className="bg-solana-secondary text-white">
                                {team.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <div className="font-medium">{team.name}</div>
                            <div className="text-xs text-gray-400">{team.memberCount} members • {team.visualizationCount} visualizations</div>
                          </div>
                        </div>
                        <Badge className={`${team.id === selectedTeam?.id ? 'bg-solana-primary' : 'bg-solana-dark'}`}>
                          {team.id === selectedTeam?.id ? 'Selected' : team.role}
                        </Badge>
                      </div>
                    ))}
                  </ScrollArea>
                  
                  {selectedTeam && (
                    <div className="bg-solana-dark p-3 rounded-md">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm font-medium">{selectedTeam.name}</div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => setShowInviteDialog(true)}
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Invite
                        </Button>
                      </div>
                      
                      <ScrollArea className="h-[100px]">
                        {mockMembers.map((member) => (
                          <div key={member.id} className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                {member.profilePicture ? (
                                  <AvatarImage src={member.profilePicture} alt={member.username} />
                                ) : (
                                  <AvatarFallback className="text-[10px]">
                                    {member.username.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <span className="text-xs">{member.username}</span>
                            </div>
                            <Badge className={`text-[10px] ${getRoleBadgeColor(member.role)}`}>
                              {member.role}
                            </Badge>
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="public" className="mt-4 space-y-4">
                  <div className="text-sm text-gray-300 mb-2">
                    Create a public link that anyone can view:
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Input
                      readOnly
                      value={`https://app.example.com/shared/visualization/${visualizationId || '12345'}`}
                      className="bg-solana-dark border-solana-dark-lighter text-gray-400"
                    />
                    <Button onClick={copyShareLink} variant="outline" size="icon" className="h-9 w-9">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="bg-solana-dark p-3 rounded-md flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Eye className="h-4 w-4" />
                      <span>Anyone with the link can view</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => {
                        toast({
                          title: "Link status updated",
                          description: "Public link has been enabled",
                        });
                      }}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Enabled
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSelectedTeam(null)}
                  className="border-solana-dark-lighter text-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => selectedTeam && shareWithTeam(selectedTeam.id)}
                  disabled={!selectedTeam}
                  className="bg-solana-primary text-white hover:bg-solana-primary-dark"
                >
                  Share with Team
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription className="text-gray-400">
          Collaborate with your team on this transaction flow analysis
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Active team section */}
        <div className="rounded-lg bg-solana-dark p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-solana-secondary text-white">BR</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium text-white">Blockchain Research Team</div>
                <div className="text-xs text-gray-400">5 members collaborating</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-gray-400 hover:text-white">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex -space-x-2 mb-2">
            <Avatar className="h-6 w-6 border-2 border-solana-dark">
              <AvatarFallback className="bg-blue-500 text-white text-[10px]">AL</AvatarFallback>
            </Avatar>
            <Avatar className="h-6 w-6 border-2 border-solana-dark">
              <AvatarFallback className="bg-purple-500 text-white text-[10px]">SA</AvatarFallback>
            </Avatar>
            <Avatar className="h-6 w-6 border-2 border-solana-dark">
              <AvatarFallback className="bg-green-500 text-white text-[10px]">MR</AvatarFallback>
            </Avatar>
            <Avatar className="h-6 w-6 border-2 border-solana-dark">
              <AvatarFallback className="bg-yellow-500 text-white text-[10px]">JC</AvatarFallback>
            </Avatar>
            <Avatar className="h-6 w-6 border-2 border-solana-dark">
              <AvatarFallback className="bg-pink-500 text-white text-[10px]">+1</AvatarFallback>
            </Avatar>
          </div>
          
          <div className="text-xs text-gray-400">
            Last activity: 2 hours ago
          </div>
        </div>
        
        {/* Comments section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-solana-info" />
            <h4 className="text-sm font-medium text-white">Recent Comments</h4>
          </div>
          
          <ScrollArea className="h-[180px] rounded-lg bg-solana-dark p-3">
            <div className="space-y-3">
              {/* Comment 1 */}
              <div className="rounded bg-solana-dark-lighter p-2">
                <div className="flex items-center gap-2 mb-1">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="bg-blue-500 text-white text-[10px]">SA</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-white">sara_analyst</span>
                  <span className="text-[10px] text-gray-400">2 hours ago</span>
                </div>
                <p className="text-xs text-gray-300">
                  I've identified this cluster as related to DEX liquidity pools. The transaction pattern suggests automated market making activity.
                </p>
                <div className="flex justify-end mt-1">
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-gray-400 hover:text-white">
                    Reply
                  </Button>
                </div>
              </div>
              
              {/* Comment 2 */}
              <div className="rounded bg-solana-dark-lighter p-2">
                <div className="flex items-center gap-2 mb-1">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="bg-green-500 text-white text-[10px]">MR</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-white">mike_researcher</span>
                  <span className="text-[10px] text-gray-400">4 hours ago</span>
                </div>
                <p className="text-xs text-gray-300">
                  Check out the wallet ending in ...X8j2. It seems to be a hot wallet for an exchange based on the transaction volume and patterns.
                </p>
                <div className="flex justify-end mt-1">
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-gray-400 hover:text-white">
                    Reply
                  </Button>
                </div>
              </div>
              
              {/* Comment 3 */}
              <div className="rounded bg-solana-dark-lighter p-2">
                <div className="flex items-center gap-2 mb-1">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="bg-purple-500 text-white text-[10px]">AL</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-white">alex_blockchain</span>
                  <span className="text-[10px] text-gray-400">yesterday</span>
                </div>
                <p className="text-xs text-gray-300">
                  I've added annotations to the critical path. The largest transaction looks like an OTC trade between two institutional wallets.
                </p>
                <div className="flex justify-end mt-1">
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-gray-400 hover:text-white">
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </CardContent>
      
      <CardFooter>
        <div className="w-full">
          <div className="relative">
            <Input
              className="bg-solana-dark border-solana-dark-lighter pr-20 text-white"
              placeholder="Add a comment..."
            />
            <Button
              className="absolute right-1 top-1 h-7 bg-solana-primary hover:bg-solana-primary-dark text-white"
              size="sm"
            >
              Comment
            </Button>
          </div>
        </div>
      </CardFooter>
      
      {/* Invite dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="bg-solana-dark-light border-solana-dark-lighter text-white">
          <DialogHeader>
            <DialogTitle>Invite to Team</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedTeam ? `Invite a new member to ${selectedTeam.name}` : 'Invite a new team member'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Email address</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="bg-solana-dark border-solana-dark-lighter text-white"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Role</label>
              <div className="grid grid-cols-4 gap-2">
                {["viewer", "editor", "admin", "owner"].map((role) => (
                  <Button
                    key={role}
                    variant="outline"
                    size="sm"
                    className={`border-solana-dark-lighter capitalize ${role === 'viewer' ? 'bg-solana-secondary bg-opacity-20 border-solana-secondary' : ''}`}
                  >
                    {role}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInviteDialog(false)}
              className="border-solana-dark-lighter text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={() => inviteUser(inviteEmail)}
              disabled={!inviteEmail.trim()}
              className="bg-solana-primary text-white hover:bg-solana-primary-dark"
            >
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}