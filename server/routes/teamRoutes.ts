import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { nanoid } from "nanoid";
import { insertTeamSchema, insertTeamMemberSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Validate user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
};

/**
 * Get all teams for the authenticated user
 */
router.get("/", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId as number;
    const teams = await storage.getUserTeams(userId);
    return res.json(teams);
  } catch (error) {
    console.error("Error fetching teams:", error);
    return res.status(500).json({ message: "Failed to fetch teams" });
  }
});

/**
 * Create a new team
 */
router.post("/", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId as number;
    
    // Validate request body
    const teamData = insertTeamSchema.safeParse({
      ...req.body,
      ownerId: userId
    });
    
    if (!teamData.success) {
      return res.status(400).json({ 
        message: "Invalid team data", 
        errors: teamData.error.format() 
      });
    }
    
    // Create the team
    const team = await storage.createTeam(teamData.data);
    
    // Add the creator as team owner
    await storage.addTeamMember({
      teamId: team.id,
      userId,
      role: "owner",
      invitedBy: userId,
      status: "active"
    });
    
    return res.status(201).json(team);
  } catch (error) {
    console.error("Error creating team:", error);
    return res.status(500).json({ message: "Failed to create team" });
  }
});

/**
 * Get a specific team by ID
 */
router.get("/:teamId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId as number;
    const teamId = parseInt(req.params.teamId);
    
    if (isNaN(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }
    
    // Get the team
    const team = await storage.getTeam(teamId);
    
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    // Check if user is a member
    const isMember = await storage.isTeamMember(teamId, userId);
    
    if (!isMember) {
      return res.status(403).json({ message: "Not authorized to view this team" });
    }
    
    return res.json(team);
  } catch (error) {
    console.error("Error fetching team:", error);
    return res.status(500).json({ message: "Failed to fetch team" });
  }
});

/**
 * Update a team
 */
router.patch("/:teamId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId as number;
    const teamId = parseInt(req.params.teamId);
    
    if (isNaN(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }
    
    // Get the team
    const team = await storage.getTeam(teamId);
    
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    // Check if user is team owner or admin
    const member = await storage.getTeamMember(teamId, userId);
    
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      return res.status(403).json({ message: "Not authorized to update this team" });
    }
    
    // Validate request body
    const updateSchema = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      avatarUrl: z.string().optional(),
    });
    
    const updateData = updateSchema.safeParse(req.body);
    
    if (!updateData.success) {
      return res.status(400).json({ 
        message: "Invalid update data", 
        errors: updateData.error.format() 
      });
    }
    
    // Update the team
    const updatedTeam = await storage.updateTeam(teamId, updateData.data);
    
    return res.json(updatedTeam);
  } catch (error) {
    console.error("Error updating team:", error);
    return res.status(500).json({ message: "Failed to update team" });
  }
});

/**
 * Get team members
 */
router.get("/:teamId/members", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId as number;
    const teamId = parseInt(req.params.teamId);
    
    if (isNaN(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }
    
    // Check if user is a member
    const isMember = await storage.isTeamMember(teamId, userId);
    
    if (!isMember) {
      return res.status(403).json({ message: "Not authorized to view team members" });
    }
    
    const members = await storage.getTeamMembers(teamId);
    
    return res.json(members);
  } catch (error) {
    console.error("Error fetching team members:", error);
    return res.status(500).json({ message: "Failed to fetch team members" });
  }
});

/**
 * Add a member to a team
 */
router.post("/:teamId/members", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId as number;
    const teamId = parseInt(req.params.teamId);
    
    if (isNaN(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }
    
    // Check if user is team owner or admin
    const member = await storage.getTeamMember(teamId, userId);
    
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      return res.status(403).json({ message: "Not authorized to add members to this team" });
    }
    
    // Validate request body
    const inviteSchema = z.object({
      email: z.string().email(),
      role: z.enum(["admin", "editor", "viewer"]),
    });
    
    const inviteData = inviteSchema.safeParse(req.body);
    
    if (!inviteData.success) {
      return res.status(400).json({ 
        message: "Invalid invite data", 
        errors: inviteData.error.format() 
      });
    }
    
    // Check if user exists
    const user = await storage.getUserByEmail(inviteData.data.email);
    
    if (!user) {
      // In a real app, this would send an invitation email
      return res.status(404).json({ 
        message: "User not found. An invitation will be sent to this email address." 
      });
    }
    
    // Check if user is already a member
    const existingMember = await storage.getTeamMember(teamId, user.id);
    
    if (existingMember) {
      return res.status(400).json({ message: "User is already a member of this team" });
    }
    
    // Add the member
    const newMember = await storage.addTeamMember({
      teamId,
      userId: user.id,
      role: inviteData.data.role,
      invitedBy: userId,
      status: "active"
    });
    
    return res.status(201).json(newMember);
  } catch (error) {
    console.error("Error adding team member:", error);
    return res.status(500).json({ message: "Failed to add team member" });
  }
});

/**
 * Update a team member's role
 */
router.patch("/:teamId/members/:memberId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId as number;
    const teamId = parseInt(req.params.teamId);
    const memberId = parseInt(req.params.memberId);
    
    if (isNaN(teamId) || isNaN(memberId)) {
      return res.status(400).json({ message: "Invalid team or member ID" });
    }
    
    // Check if user is team owner or admin
    const userMember = await storage.getTeamMember(teamId, userId);
    
    if (!userMember || (userMember.role !== "owner" && userMember.role !== "admin")) {
      return res.status(403).json({ message: "Not authorized to update member roles" });
    }
    
    // Get the member to update
    const memberToUpdate = await storage.getTeamMemberById(memberId);
    
    if (!memberToUpdate || memberToUpdate.teamId !== teamId) {
      return res.status(404).json({ message: "Team member not found" });
    }
    
    // Owners can't have their role changed except by themselves
    if (memberToUpdate.role === "owner" && memberToUpdate.userId !== userId) {
      return res.status(403).json({ message: "Cannot change the role of the team owner" });
    }
    
    // Validate request body
    const updateSchema = z.object({
      role: z.enum(["owner", "admin", "editor", "viewer"]),
    });
    
    const updateData = updateSchema.safeParse(req.body);
    
    if (!updateData.success) {
      return res.status(400).json({ 
        message: "Invalid update data", 
        errors: updateData.error.format() 
      });
    }
    
    // If changing to owner, current user must be the owner
    if (updateData.data.role === "owner" && userMember.role !== "owner") {
      return res.status(403).json({ message: "Only the current owner can transfer ownership" });
    }
    
    // Update the member
    const updatedMember = await storage.updateTeamMember(memberId, updateData.data);
    
    // If transferring ownership, change current owner to admin
    if (updateData.data.role === "owner" && userMember.userId !== memberToUpdate.userId) {
      await storage.updateTeamMember(userMember.id, { role: "admin" });
    }
    
    return res.json(updatedMember);
  } catch (error) {
    console.error("Error updating team member:", error);
    return res.status(500).json({ message: "Failed to update team member" });
  }
});

/**
 * Remove a member from a team
 */
router.delete("/:teamId/members/:memberId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId as number;
    const teamId = parseInt(req.params.teamId);
    const memberId = parseInt(req.params.memberId);
    
    if (isNaN(teamId) || isNaN(memberId)) {
      return res.status(400).json({ message: "Invalid team or member ID" });
    }
    
    // Check if user is team owner or admin, or is removing themselves
    const userMember = await storage.getTeamMember(teamId, userId);
    const memberToRemove = await storage.getTeamMemberById(memberId);
    
    if (!memberToRemove || memberToRemove.teamId !== teamId) {
      return res.status(404).json({ message: "Team member not found" });
    }
    
    const isRemovingSelf = memberToRemove.userId === userId;
    const canRemoveOthers = userMember && (userMember.role === "owner" || userMember.role === "admin");
    
    if (!isRemovingSelf && !canRemoveOthers) {
      return res.status(403).json({ message: "Not authorized to remove members from this team" });
    }
    
    // Cannot remove the owner
    if (memberToRemove.role === "owner" && !isRemovingSelf) {
      return res.status(403).json({ message: "Cannot remove the team owner" });
    }
    
    // Remove the member
    await storage.removeTeamMember(memberId);
    
    return res.status(204).send();
  } catch (error) {
    console.error("Error removing team member:", error);
    return res.status(500).json({ message: "Failed to remove team member" });
  }
});

/**
 * Get team visualizations
 */
router.get("/:teamId/visualizations", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId as number;
    const teamId = parseInt(req.params.teamId);
    
    if (isNaN(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }
    
    // Check if user is a member
    const isMember = await storage.isTeamMember(teamId, userId);
    
    if (!isMember) {
      return res.status(403).json({ message: "Not authorized to view team visualizations" });
    }
    
    const visualizations = await storage.getTeamVisualizations(teamId);
    
    return res.json(visualizations);
  } catch (error) {
    console.error("Error fetching team visualizations:", error);
    return res.status(500).json({ message: "Failed to fetch team visualizations" });
  }
});

/**
 * Share a visualization with a team
 */
router.post("/:teamId/visualizations", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId as number;
    const teamId = parseInt(req.params.teamId);
    
    if (isNaN(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }
    
    // Check if user is a member
    const isMember = await storage.isTeamMember(teamId, userId);
    
    if (!isMember) {
      return res.status(403).json({ message: "Not authorized to share visualizations with this team" });
    }
    
    // Validate request body
    const shareSchema = z.object({
      visualizationId: z.number(),
      pinned: z.boolean().optional(),
    });
    
    const shareData = shareSchema.safeParse(req.body);
    
    if (!shareData.success) {
      return res.status(400).json({ 
        message: "Invalid share data", 
        errors: shareData.error.format() 
      });
    }
    
    // Check if visualization exists and user has access
    const visualization = await storage.getVisualization(shareData.data.visualizationId);
    
    if (!visualization) {
      return res.status(404).json({ message: "Visualization not found" });
    }
    
    // Check if user owns the visualization or if it's shared with them
    if (visualization.userId !== userId && !visualization.shared) {
      return res.status(403).json({ message: "Not authorized to share this visualization" });
    }
    
    // Check if already shared with the team
    const existing = await storage.getTeamVisualization(teamId, shareData.data.visualizationId);
    
    if (existing) {
      return res.status(400).json({ message: "Visualization already shared with this team" });
    }
    
    // Share the visualization
    const teamVisualization = await storage.addTeamVisualization({
      teamId,
      visualizationId: shareData.data.visualizationId,
      addedById: userId,
      pinned: shareData.data.pinned || false
    });
    
    return res.status(201).json(teamVisualization);
  } catch (error) {
    console.error("Error sharing visualization:", error);
    return res.status(500).json({ message: "Failed to share visualization" });
  }
});

/**
 * Unshare a visualization with a team
 */
router.delete("/:teamId/visualizations/:visualizationId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId as number;
    const teamId = parseInt(req.params.teamId);
    const visualizationId = parseInt(req.params.visualizationId);
    
    if (isNaN(teamId) || isNaN(visualizationId)) {
      return res.status(400).json({ message: "Invalid team or visualization ID" });
    }
    
    // Check if user is a team owner, admin, or the one who shared it
    const userMember = await storage.getTeamMember(teamId, userId);
    
    if (!userMember) {
      return res.status(403).json({ message: "Not authorized to unshare visualizations" });
    }
    
    const teamVisualization = await storage.getTeamVisualization(teamId, visualizationId);
    
    if (!teamVisualization) {
      return res.status(404).json({ message: "Shared visualization not found" });
    }
    
    // Check authorization
    const isAuthorized = userMember.role === "owner" || 
                         userMember.role === "admin" || 
                         teamVisualization.addedById === userId;
    
    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to unshare this visualization" });
    }
    
    // Unshare the visualization
    await storage.removeTeamVisualization(teamId, visualizationId);
    
    return res.status(204).send();
  } catch (error) {
    console.error("Error unsharing visualization:", error);
    return res.status(500).json({ message: "Failed to unshare visualization" });
  }
});

export default router;