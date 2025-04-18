import { Router, Request, Response } from 'express';
import { entityLabelingService } from '../services/entityLabeling';
import { insertEntitySchema } from '@shared/schema';
import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';

const router = Router();

// Helper function to validate Solana addresses
function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get entity information for a known address
 * 
 * @route GET /api/entity-labeling/lookup/:address
 */
router.get('/lookup/:address', async (req: Request, res: Response) => {
  const { address } = req.params;
  
  if (!address || !isValidSolanaAddress(address)) {
    return res.status(400).json({ error: 'Invalid Solana wallet address' });
  }
  
  try {
    const entity = await entityLabelingService.lookupKnownEntity(address);
    
    if (!entity) {
      return res.status(404).json({ 
        message: 'No entity information found for this address',
        address 
      });
    }
    
    return res.json(entity);
  } catch (error) {
    console.error('Error looking up entity:', error);
    return res.status(500).json({ error: 'Failed to look up entity information' });
  }
});

/**
 * Detect exchange patterns for a wallet
 * 
 * @route GET /api/entity-labeling/detect-exchange/:address
 */
router.get('/detect-exchange/:address', async (req: Request, res: Response) => {
  const { address } = req.params;
  
  if (!address || !isValidSolanaAddress(address)) {
    return res.status(400).json({ error: 'Invalid Solana wallet address' });
  }
  
  try {
    const analysis = await entityLabelingService.detectExchangePatterns(address);
    return res.json(analysis);
  } catch (error) {
    console.error('Error detecting exchange patterns:', error);
    return res.status(500).json({ error: 'Failed to analyze wallet behavior' });
  }
});

/**
 * Get entities by type
 * 
 * @route GET /api/entity-labeling/entities/:type
 */
router.get('/entities/:type', async (req: Request, res: Response) => {
  const { type } = req.params;
  const validTypes = ['exchange', 'defi', 'nft', 'project', 'other'];
  
  if (!type || !validTypes.includes(type)) {
    return res.status(400).json({ 
      error: 'Invalid entity type', 
      validTypes 
    });
  }
  
  try {
    const entities = await entityLabelingService.getEntitiesByType(type);
    return res.json(entities);
  } catch (error) {
    console.error(`Error getting entities by type ${type}:`, error);
    return res.status(500).json({ error: 'Failed to get entities' });
  }
});

/**
 * Get entity details with associated wallets
 * 
 * @route GET /api/entity-labeling/entity/:id
 */
router.get('/entity/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid entity ID' });
  }
  
  try {
    const entityDetails = await entityLabelingService.getEntityDetails(id);
    
    if (!entityDetails) {
      return res.status(404).json({ 
        message: 'Entity not found',
        id 
      });
    }
    
    return res.json(entityDetails);
  } catch (error) {
    console.error(`Error getting entity details for ID ${id}:`, error);
    return res.status(500).json({ error: 'Failed to get entity details' });
  }
});

/**
 * Create or update an entity with associated wallets
 * 
 * @route POST /api/entity-labeling/entity
 */
router.post('/entity', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = insertEntitySchema.parse(req.body.entity);
    
    // Validate wallet addresses if provided
    let walletAddresses: string[] = [];
    if (req.body.walletAddresses && Array.isArray(req.body.walletAddresses)) {
      walletAddresses = req.body.walletAddresses.filter((address: string) => isValidSolanaAddress(address));
      
      if (req.body.walletAddresses.length !== walletAddresses.length) {
        return res.status(400).json({ 
          error: 'Some wallet addresses are invalid',
          validAddresses: walletAddresses,
          invalidAddresses: req.body.walletAddresses.filter((address: string) => !isValidSolanaAddress(address))
        });
      }
    }
    
    // Create or update the entity
    const entity = await entityLabelingService.createOrUpdateEntity(validatedData, walletAddresses);
    
    return res.status(201).json(entity);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid entity data', details: error.errors });
    }
    
    console.error('Error creating/updating entity:', error);
    return res.status(500).json({ error: 'Failed to create/update entity' });
  }
});

export default router;