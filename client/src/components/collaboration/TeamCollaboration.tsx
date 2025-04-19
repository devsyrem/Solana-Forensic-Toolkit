import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { AlertCircle, Users, UserPlus, MoreHorizontal, UserCheck, UserMinus, RefreshCw, Send } from "lucide-react";

interface TeamMember {
  id: number;
  userId: number;
  teamId: number;
  role: "admin" | "member" | "viewer";
  username: string;
  email: string;
  profilePicture?: string;
  addedAt: string;
  lastActive?: string;
}

interface Team {
  id: number;
  name: string;
  description?: string;
  createdById: number;
  createdAt: string;
  memberCount: number;
}

interface TeamCollaborationProps {
  visualizationId: number;
  collaborators: Array<{id: number, username: string}>;
}

export default function TeamCollaboration({ visualizationId, collaborators }: TeamCollaborationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  
  // Get user's teams
  const { data: teams, isLoading: isLoadingTeams, error: teamsError } = useQuery({
    queryKey: ['/api/teams'],
    enabled: true,
  });
  
  // Get team members for selected team
  const { data: teamMembers, isLoading: isLoadingMembers, error: membersError } = useQuery({
    queryKey: ['/api/teams', selectedTeamId, 'members'],
    enabled: !!selectedTeamId,
  });
  
  // Get teams that have access to this visualization
  const { data: visualizationTeams, isLoading: isLoadingVisualizationTeams } = useQuery({
    queryKey: ['/api/visualizations', visualizationId, 'teams'],
    enabled: !!visualizationId,
  });
  
  // Share visualization with team
  const shareVisualizationMutation = useMutation({
    mutationFn: async (teamId: number) => {
      return apiRequest(`/api/teams/${teamId}/visualizations/${visualizationId}`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: "Visualization shared",
        description: "The visualization has been shared with the selected team",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/visualizations', visualizationId, 'teams'] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to share",
        description: "Could not share the visualization with the team",
      });
    },
  });
  
  // Create new team
  const createTeamMutation = useMutation({
    mutationFn: async (team: { name: string, description?: string }) => {
      return apiRequest('/api/teams', {
        method: 'POST',
        body: JSON.stringify(team),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Team created",
        description: "Your new team has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      setSelectedTeamId(data.id);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to create team",
        description: "Could not create the team. Please try again.",
      });
    },
  });
  
  // Invite team member
  const inviteTeamMemberMutation = useMutation({
    mutationFn: async ({ teamId, email, role }: { teamId: number, email: string, role: string }) => {
      return apiRequest(`/api/teams/${teamId}/members/invite`, {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: "The invitation has been sent to the user",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/teams', selectedTeamId, 'members'] });
      setShowInviteDialog(false);
      setInviteEmail("");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to invite",
        description: "Could not send the invitation. Please check the email address.",
      });
    },
  });
  
  // Change team member role
  const updateTeamMemberRoleMutation = useMutation({
    mutationFn: async ({ teamId, memberId, role }: { teamId: number, memberId: number, role: string }) => {
      return apiRequest(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Role updated",
        description: "The team member's role has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/teams', selectedTeamId, 'members'] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to update role",
        description: "Could not update the team member's role",
      });
    },
  });
  
  // Remove team member
  const removeTeamMemberMutation = useMutation({
    mutationFn: async ({ teamId, memberId }: { teamId: number, memberId: number }) => {
      return apiRequest(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Member removed",
        description: "The team member has been removed from the team",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/teams', selectedTeamId, 'members'] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to remove member",
        description: "Could not remove the team member from the team",
      });
    },
  });
  
  // Create a new team
  const handleCreateTeam = (name: string, description?: string) => {
    createTeamMutation.mutate({ name, description });
  };
  
  // Share visualization with team
  const handleShareWithTeam = (teamId: number) => {
    shareVisualizationMutation.mutate(teamId);
  };
  
  // Invite a new team member
  const handleInviteMember = () => {
    if (!selectedTeamId || !inviteEmail) return;
    
    inviteTeamMemberMutation.mutate({
      teamId: selectedTeamId,
      email: inviteEmail,
      role: inviteRole,
    });
  };
  
  // Update team member role
  const handleUpdateMemberRole = (memberId: number, role: "admin" | "member" | "viewer") => {
    if (!selectedTeamId) return;
    
    updateTeamMemberRoleMutation.mutate({
      teamId: selectedTeamId,
      memberId,
      role,
    });
  };
  
  // Remove team member
  const handleRemoveMember = (memberId: number) => {
    if (!selectedTeamId) return;
    
    removeTeamMemberMutation.mutate({
      teamId: selectedTeamId,
      memberId,
    });
  };
  
  // Set the first team as selected by default
  useEffect(() => {
    if (teams && teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);
  
  // For demo/UI purposes only (no backend)
  // In real implementation, we would get this from the backend
  const demoTeams = [
    { id: 1, name: "Blockchain Research Team", description: "Analyzing transactions and tracking fund flows", createdById: 1, createdAt: "2023-09-01", memberCount: 5 },
    { id: 2, name: "Forensics Unit", description: "Investigating suspicious wallet activities", createdById: 1, createdAt: "2023-10-15", memberCount: 3 },
  ];
  
  const demoTeamMembers = [
    { id: 1, userId: 1, teamId: 1, role: "admin", username: "alex_johnson", email: "alex@example.com", addedAt: "2023-09-01", lastActive: "2023-12-15" },
    { id: 2, userId: 2, teamId: 1, role: "member", username: "sarah_chen", email: "sarah@example.com", addedAt: "2023-09-02", lastActive: "2023-12-10" },
    { id: 3, userId: 3, teamId: 1, role: "viewer", username: "mike_brown", email: "mike@example.com", addedAt: "2023-09-05", lastActive: "2023-11-20" },
  ];
  
  // Use demo data for the UI
  const displayTeams = teams || demoTeams;
  const displayMembers = teamMembers || demoTeamMembers;
  const selectedTeam = displayTeams.find(team => team.id === selectedTeamId);
  
  const isTeamMember = (teamId: number): boolean => {
    // Mock implementation
    return true;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h3 className="text-xl font-semibold text-white">Team Collaboration</h3>
          <p className="text-gray-400 text-sm">Manage team access and collaborate on this visualization</p>
        </div>
        
        {collaborators.length > 0 && (
          <div className="flex items-center bg-solana-dark rounded-full px-3 py-1.5 mt-2 md:mt-0">
            <span className="inline-flex items-center mr-1.5">
              <UserCheck size={16} className="mr-1 text-green-400" />
              <span className="text-sm text-green-400">{collaborators.length}</span>
            </span>
            <span className="text-xs text-gray-400">
              {collaborators.length === 1 
                ? "1 person viewing now" 
                : `${collaborators.length} people viewing now`}
            </span>
          </div>
        )}
      </div>
      
      {/* Team Selection and Creation */}
      <Card className="bg-solana-dark border-none">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Your Teams</CardTitle>
          <CardDescription>Select a team to manage or create a new one</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={selectedTeamId?.toString() || ""} onValueChange={(value) => setSelectedTeamId(parseInt(value))}>
              <SelectTrigger className="w-full md:w-[280px]">
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Your Teams</SelectLabel>
                  {displayTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Users size={14} />
                  <span>Create New Team</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create a new team</DialogTitle>
                  <DialogDescription>
                    Create a team to collaborate on visualizations
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="name" className="text-right">
                      Name
                    </label>
                    <Input
                      id="name"
                      className="col-span-3"
                      placeholder="Team name"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="description" className="text-right">
                      Description
                    </label>
                    <Input
                      id="description"
                      className="col-span-3"
                      placeholder="Optional description"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={() => handleCreateTeam("New Research Team", "A team for collaborative transaction analysis")}>
                    Create Team
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t border-gray-800 pt-4">
          <p className="text-sm text-gray-400">
            Teams let you collaborate with others on visualizations
          </p>
          {selectedTeam && (
            <Button 
              variant="default" 
              onClick={() => handleShareWithTeam(selectedTeam.id)}
              className="bg-solana-primary hover:bg-solana-primary-dark"
            >
              Share with Team
            </Button>
          )}
        </CardFooter>
      </Card>
      
      {/* Team Members Management */}
      {selectedTeam && (
        <Card className="bg-solana-dark border-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-medium">{selectedTeam.name} Members</CardTitle>
              <CardDescription>{selectedTeam.description}</CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowInviteDialog(true)}
              className="flex items-center gap-2"
            >
              <UserPlus size={14} />
              <span>Invite</span>
            </Button>
          </CardHeader>
          <CardContent>
            {displayMembers.length > 0 ? (
              <Table>
                <TableCaption>List of team members</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden md:table-cell">Last Active</TableHead>
                    <TableHead className="hidden md:table-cell">Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {member.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{member.username}</div>
                            <div className="text-xs text-gray-400">{member.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          member.role === "admin" ? "default" :
                          member.role === "member" ? "outline" : "secondary"
                        }>
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {member.lastActive ? new Date(member.lastActive).toLocaleDateString() : "Never"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {new Date(member.addedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => {}}>View Profile</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.id, "admin")}>
                              Make Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.id, "member")}>
                              Make Member
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.id, "viewer")}>
                              Make Viewer
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-solana-error"
                            >
                              Remove from Team
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6">
                <Users className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                <h4 className="text-lg font-medium text-white mb-2">No team members yet</h4>
                <p className="text-gray-400 mb-4">
                  Invite team members to collaborate on visualizations
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setShowInviteDialog(true)}
                  className="flex items-center gap-2"
                >
                  <UserPlus size={14} />
                  <span>Invite Members</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Invite Member Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
            <DialogDescription>
              Send an invitation to collaborate on this visualization
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="email" className="text-right">
                Email
              </label>
              <Input
                id="email"
                className="col-span-3"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="role" className="text-right">
                Role
              </label>
              <Select value={inviteRole} onValueChange={(value: "admin" | "member" | "viewer") => setInviteRole(value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={handleInviteMember}
              disabled={!inviteEmail}
              className="bg-solana-primary hover:bg-solana-primary-dark flex gap-1.5 items-center"
            >
              <Send size={14} />
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}