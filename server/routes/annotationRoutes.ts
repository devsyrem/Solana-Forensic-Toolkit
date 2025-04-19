import { Router, Request, Response } from "express";
import { storage } from "../storage";
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
 * Get annotations for a visualization
 */
router.get("/visualization/:visualizationId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId as number;
    const visualizationId = parseInt(req.params.visualizationId);
    
    if (isNaN(visualizationId)) {
      return res.status(400).json({ message: "Invalid visualization ID" });
    }
    
    // Check if visualization exists and user has access
    const visualization = await storage.getVisualization(visualizationId);
    
    if (!visualization) {
      return res.status(404).json({ message: "Visualization not found" });
    }
    
    // Check if user owns the visualization or if it's shared with them
    // or if they are on a team that has access to it
    const hasAccess = visualization.userId === userId || 
                      visualization.shared || 
                      await storage.userHasTeamAccessToVisualization(userId, visualizationId);
    
    if (!hasAccess) {
      return res.status(403).json({ message: "Not authorized to view this visualization's annotations" });
    }
    
    const annotations = await storage.getVisualizationAnnotations(visualizationId);
    
    return res.json(annotations);
  } catch (error) {
    console.error("Error fetching annotations:", error);
    return res.status(500).json({ message: "Failed to fetch annotations" });
  }
});

/**
 * Create a new annotation
 */
router.post("/", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId as number;
    
    // Validate request body
    const annotationSchema = z.object({
      content: z.string().min(1).max(1000),
      visualizationId: z.number(),
      position: z.object({
        x: z.number(),
        y: z.number(),
      }),
      referencedNodeAddress: z.string().optional(),
      referencedTransactionSignature: z.string().optional(),
      parentId: z.number().optional(),
    });
    
    const annotationData = annotationSchema.safeParse(req.body);
    
    if (!annotationData.success) {
      return res.status(400).json({ 
        message: "Invalid annotation data", 
        errors: annotationData.error.format() 
      });
    }
    
    // Check if visualization exists and user has access
    const visualization = await storage.getVisualization(annotationData.data.visualizationId);
    
    if (!visualization) {
      return res.status(404).json({ message: "Visualization not found" });
    }
    
    // Check if user owns the visualization or if they are on a team that has access to it
    const hasAccess = visualization.userId === userId || 
                      await storage.userHasTeamAccessToVisualization(userId, annotationData.data.visualizationId);
    
    if (!hasAccess) {
      return res.status(403).json({ message: "Not authorized to add annotations to this visualization" });
    }
    
    // If it's a reply, check if parent annotation exists
    if (annotationData.data.parentId) {
      const parentAnnotation = await storage.getAnnotation(annotationData.data.parentId);
      
      if (!parentAnnotation || parentAnnotation.visualizationId !== annotationData.data.visualizationId) {
        return res.status(404).json({ message: "Parent annotation not found" });
      }
    }
    
    // Create the annotation
    const annotation = await storage.createAnnotation({
      ...annotationData.data,
      userId,
      resolved: false
    });
    
    return res.status(201).json(annotation);
  } catch (error) {
    console.error("Error creating annotation:", error);
    return res.status(500).json({ message: "Failed to create annotation" });
  }
});

/**
 * Update an annotation
 */
router.patch("/:annotationId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId as number;
    const annotationId = parseInt(req.params.annotationId);
    
    if (isNaN(annotationId)) {
      return res.status(400).json({ message: "Invalid annotation ID" });
    }
    
    // Get the annotation
    const annotation = await storage.getAnnotation(annotationId);
    
    if (!annotation) {
      return res.status(404).json({ message: "Annotation not found" });
    }
    
    // Check if user owns the annotation or has admin access to the visualization
    if (annotation.userId !== userId) {
      const visualization = await storage.getVisualization(annotation.visualizationId);
      
      if (!visualization || visualization.userId !== userId) {
        // Check if user is a team admin with access to the visualization
        const isTeamAdmin = await storage.userIsTeamAdminForVisualization(userId, annotation.visualizationId);
        
        if (!isTeamAdmin) {
          return res.status(403).json({ message: "Not authorized to update this annotation" });
        }
      }
    }
    
    // Validate request body
    const updateSchema = z.object({
      content: z.string().min(1).max(1000).optional(),
      position: z.object({
        x: z.number(),
        y: z.number(),
      }).optional(),
      resolved: z.boolean().optional(),
    });
    
    const updateData = updateSchema.safeParse(req.body);
    
    if (!updateData.success) {
      return res.status(400).json({ 
        message: "Invalid update data", 
        errors: updateData.error.format() 
      });
    }
    
    // Update the annotation
    const updatedAnnotation = await storage.updateAnnotation(annotationId, {
      ...updateData.data,
      updatedAt: new Date()
    });
    
    return res.json(updatedAnnotation);
  } catch (error) {
    console.error("Error updating annotation:", error);
    return res.status(500).json({ message: "Failed to update annotation" });
  }
});

/**
 * Delete an annotation
 */
router.delete("/:annotationId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId as number;
    const annotationId = parseInt(req.params.annotationId);
    
    if (isNaN(annotationId)) {
      return res.status(400).json({ message: "Invalid annotation ID" });
    }
    
    // Get the annotation
    const annotation = await storage.getAnnotation(annotationId);
    
    if (!annotation) {
      return res.status(404).json({ message: "Annotation not found" });
    }
    
    // Check if user owns the annotation or has admin access to the visualization
    if (annotation.userId !== userId) {
      const visualization = await storage.getVisualization(annotation.visualizationId);
      
      if (!visualization || visualization.userId !== userId) {
        // Check if user is a team admin with access to the visualization
        const isTeamAdmin = await storage.userIsTeamAdminForVisualization(userId, annotation.visualizationId);
        
        if (!isTeamAdmin) {
          return res.status(403).json({ message: "Not authorized to delete this annotation" });
        }
      }
    }
    
    // Delete the annotation and its replies
    await storage.deleteAnnotation(annotationId);
    
    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting annotation:", error);
    return res.status(500).json({ message: "Failed to delete annotation" });
  }
});

/**
 * Toggle annotation resolved status
 */
router.patch("/:annotationId/resolve", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId as number;
    const annotationId = parseInt(req.params.annotationId);
    
    if (isNaN(annotationId)) {
      return res.status(400).json({ message: "Invalid annotation ID" });
    }
    
    // Get the annotation
    const annotation = await storage.getAnnotation(annotationId);
    
    if (!annotation) {
      return res.status(404).json({ message: "Annotation not found" });
    }
    
    // Check if user has access to the visualization
    const visualization = await storage.getVisualization(annotation.visualizationId);
    
    if (!visualization) {
      return res.status(404).json({ message: "Visualization not found" });
    }
    
    // Check if user can modify this annotation
    const hasAccess = visualization.userId === userId || 
                     annotation.userId === userId || 
                     await storage.userHasTeamAccessToVisualization(userId, annotation.visualizationId);
    
    if (!hasAccess) {
      return res.status(403).json({ message: "Not authorized to modify this annotation" });
    }
    
    // Validate request body
    const resolveSchema = z.object({
      resolved: z.boolean(),
    });
    
    const resolveData = resolveSchema.safeParse(req.body);
    
    if (!resolveData.success) {
      return res.status(400).json({ 
        message: "Invalid data", 
        errors: resolveData.error.format() 
      });
    }
    
    // Update the annotation
    const updatedAnnotation = await storage.updateAnnotation(annotationId, {
      resolved: resolveData.data.resolved,
      updatedAt: new Date()
    });
    
    return res.json(updatedAnnotation);
  } catch (error) {
    console.error("Error updating annotation:", error);
    return res.status(500).json({ message: "Failed to update annotation" });
  }
});

/**
 * Get annotation replies
 */
router.get("/:annotationId/replies", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId as number;
    const annotationId = parseInt(req.params.annotationId);
    
    if (isNaN(annotationId)) {
      return res.status(400).json({ message: "Invalid annotation ID" });
    }
    
    // Get the annotation
    const annotation = await storage.getAnnotation(annotationId);
    
    if (!annotation) {
      return res.status(404).json({ message: "Annotation not found" });
    }
    
    // Check if user has access to the visualization
    const visualization = await storage.getVisualization(annotation.visualizationId);
    
    if (!visualization) {
      return res.status(404).json({ message: "Visualization not found" });
    }
    
    // Check if user has access
    const hasAccess = visualization.userId === userId || 
                     visualization.shared || 
                     await storage.userHasTeamAccessToVisualization(userId, annotation.visualizationId);
    
    if (!hasAccess) {
      return res.status(403).json({ message: "Not authorized to view this annotation's replies" });
    }
    
    // Get the replies
    const replies = await storage.getAnnotationReplies(annotationId);
    
    return res.json(replies);
  } catch (error) {
    console.error("Error fetching annotation replies:", error);
    return res.status(500).json({ message: "Failed to fetch annotation replies" });
  }
});

export default router;