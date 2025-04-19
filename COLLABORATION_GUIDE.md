# SolFlow: Collaborative Analysis Guide

This guide provides detailed information about SolFlow's collaborative features, which enable teams to work together on blockchain transaction analysis in real-time.

## Overview of Collaborative Features

SolFlow offers a comprehensive suite of collaboration tools designed specifically for blockchain analysis:

1. **Team Management**: Create and manage teams with customizable roles and permissions
2. **Shared Visualizations**: Share transaction visualizations with team members
3. **Real-time Collaboration**: See team members' presence and activities in real-time
4. **Annotations**: Add comments and notes to specific elements in visualizations
5. **Discussion Threads**: Engage in threaded discussions about findings

## Team Management

### Creating Teams

Teams in SolFlow provide a way to organize collaborators working on related analyses:

1. Navigate to the "Team" tab in any visualization
2. Click "Create New Team"
3. Provide a team name and optional description
4. Submit the form to create your team

Once created, you'll become the team admin automatically.

### Team Roles and Permissions

SolFlow offers three role levels with different capabilities:

1. **Admin**:
   - Full control over team settings
   - Add/remove team members
   - Modify member roles
   - Share/unshare visualizations
   - Delete team visualizations
   - Edit/delete any team member's annotations

2. **Member**:
   - Create new visualizations for the team
   - Edit shared visualizations
   - Add annotations to any team visualization
   - Edit/delete their own annotations
   - View team members and their activities

3. **Viewer**:
   - View shared visualizations
   - Add annotations to visualizations
   - Edit/delete their own annotations
   - Cannot modify visualizations or team settings

### Inviting Team Members

To add members to your team:

1. Navigate to the "Team" tab
2. Select your team from the dropdown if you have multiple teams
3. Click the "Invite" button
4. Enter the email address of the person you want to invite
5. Select the appropriate role (Admin, Member, or Viewer)
6. Click "Send Invitation"

The invited user will receive an email notification with instructions to join the team. If they don't have an account yet, they'll be prompted to create one.

### Managing Team Members

As a team admin, you can manage your team members:

1. Navigate to the "Team" tab
2. View the list of current team members
3. Change member roles using the dropdown in each member's row
4. Remove members by clicking the "Remove" action in the member options

## Sharing Visualizations

### Sharing with a Team

To share a visualization with your team:

1. Create or open an existing visualization
2. Click the "Save & Share" button if the visualization isn't saved yet
3. Navigate to the "Team" tab
4. Select the team you want to share with
5. Click "Share with Team"

The visualization will now be accessible to all team members based on their roles.

### Accessing Shared Visualizations

Team members can access shared visualizations through:

1. Their dashboard, which shows both personal and team visualizations
2. The team visualization list in the "Team" section
3. Direct links shared by team members

### Managing Shared Visualizations

Team admins can manage shared visualizations:

1. Navigate to the "Team" tab
2. Click "Manage Visualizations" to see all team visualizations
3. Remove sharing by clicking the "Unshare" button next to a visualization

## Real-time Collaboration

SolFlow enables real-time collaboration through WebSocket connections:

### User Presence

When multiple users view the same visualization:

1. A presence indicator appears showing who's currently viewing
2. The number of active collaborators is displayed in the header
3. User information appears when hovering over the presence indicator

This helps team members know who else is working on the same visualization simultaneously.

### Live Updates

Real-time updates ensure everyone sees the latest changes:

1. **Visualization Changes**: Updates to filters, layouts, or focus areas
2. **Annotations**: New annotations appear instantly for all viewers
3. **Comments**: New comments and replies are immediately visible

### Resolving Conflicts

When multiple users make changes simultaneously:

1. The last change typically takes precedence
2. Users are notified when their changes conflict with others
3. The system provides options to merge changes or keep one version

## Annotations and Comments

### Adding Annotations

Annotations can be added to different elements:

1. **Visualization Annotations**: General notes about the entire visualization
2. **Wallet Annotations**: Notes attached to specific wallet nodes
3. **Transaction Annotations**: Notes attached to specific transactions

To add an annotation:

1. Navigate to the "Annotations" tab
2. Select the element type (visualization, wallet, transaction)
3. Enter your annotation text
4. Click "Add Annotation"

### Viewing Annotations

Annotations can be viewed in several ways:

1. In the "Annotations" tab, filtered by element type
2. As visual indicators on the graph visualization
3. In a consolidated timeline view showing all annotations

### Replying to Annotations

To engage in discussions about specific findings:

1. Navigate to an existing annotation
2. Click the "Reply" button
3. Enter your response
4. Click "Send" to add your reply

Replies are threaded under the original annotation, creating a structured discussion.

### Editing and Deleting Annotations

To modify your annotations:

1. Locate the annotation you want to edit
2. Click the "Edit" button (pencil icon)
3. Make your changes
4. Click "Save Changes"

To delete an annotation:

1. Locate the annotation you want to remove
2. Click the "Delete" button (trash icon)
3. Confirm the deletion

Note: Team admins can edit or delete any annotation, while regular members can only modify their own.

## Advanced Collaboration Features

### Highlighting Elements

To draw attention to specific elements:

1. Select a wallet node or transaction edge
2. Click "Highlight" in the annotation options
3. Add a note explaining what to focus on
4. All team members will see the highlighted element

### Saved Views

Create and share specific views of a visualization:

1. Configure the visualization with specific filters, layout, and focus
2. Click "Save View" in the visualization options
3. Name the view and add a description
4. Team members can then load this exact view

### Export and Share Findings

Export your collaborative analysis for external sharing:

1. Navigate to the visualization you want to export
2. Click "Export" and select the desired format (PDF, PNG, SVG)
3. Choose whether to include annotations and comments
4. Download the exported file or share the download link

### Scheduled Snapshots

For ongoing monitoring, set up scheduled snapshots:

1. Configure a visualization with the desired parameters
2. Click "Schedule Snapshots" in the visualization options
3. Set frequency (daily, weekly, monthly)
4. Team members will receive notifications when new snapshots are available

## Best Practices for Collaborative Analysis

### Establish Clear Roles

- Designate a lead analyst for each investigation
- Assign specific areas of focus to different team members
- Document role assignments in the visualization description

### Create Standardized Workflows

- Develop standard procedures for common analysis tasks
- Document these workflows for team reference
- Use consistent tagging and annotation conventions

### Communication Guidelines

- Be specific when referencing elements ("Wallet ABC123" instead of "this wallet")
- Include timestamps for time-sensitive observations
- Use clear, descriptive titles for annotations
- Mention team members using @username when requesting input

### Documentation

- Regularly export findings for permanent documentation
- Maintain a summary of key discoveries in the visualization description
- Create designated "summary" annotations for major findings

## Troubleshooting Collaboration Issues

### Real-time Updates Not Working

If you're not seeing real-time updates:

1. Check your internet connection
2. Refresh the page to reconnect the WebSocket
3. Verify that you have the appropriate permissions
4. Check if other real-time features (like presence indicators) are working

### Missing Team Members

If invited team members don't appear:

1. Verify that the invitation was sent to the correct email
2. Ask the invitee to check their spam folder
3. Re-send the invitation if necessary
4. Check if the user has registered with a different email

### Annotation Visibility Issues

If annotations aren't visible to all team members:

1. Verify the visualization is properly shared with the team
2. Check that all users have at least "Viewer" permissions
3. Try applying annotation filters to see if they appear
4. Refresh the page to update the annotation data

### Permission Conflicts

If permission issues arise:

1. Contact the team admin to verify your assigned role
2. Check if the visualization is properly shared with your team
3. Verify that your account is properly linked to your team profile
4. Log out and log back in to refresh your session permissions

## Advanced Administration

### Team Analytics

Team admins have access to collaboration analytics:

1. Navigate to the "Team" tab
2. Click "Team Analytics"
3. View metrics on member activity, visualization usage, and collaboration patterns

### Custom Permission Templates

For teams with specific workflows:

1. Navigate to team settings as an admin
2. Click "Permission Templates"
3. Create custom role templates with specific permission sets
4. Apply these templates when adding new members

### Integration with External Tools

SolFlow supports integration with other tools:

1. Export findings to common formats (CSV, JSON, PDF)
2. Use webhooks to notify external systems of new annotations
3. Access the API to pull visualization data into custom dashboards

---

The collaborative features in SolFlow transform blockchain analysis from an individual effort into a powerful team activity, enabling more comprehensive investigations and knowledge sharing among team members.