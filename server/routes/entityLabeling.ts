import { Router, Request, Response } from 'express';
import { Connection, PublicKey } from '@solana/web3.js';
import { z } from 'zod';
import { getSolanaConnection } from '../solana';

const router = Router();

// Known entities dataset (simplified version)
const KNOWN_ENTITIES = [
  {
    address: '9n5V42cxUFSH5foGrTKyRC5wHddyJDyWoL75QSp1RUsv',
    name: 'Solana Swap Program',
    type: 'protocol',
    description: 'Solana token swap program',
    tags: ['swap', 'dex'],
    website: 'https://solana.com',
    confidence: 100,
    detectionMethod: 'dataset'
  },
  {
    address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    name: 'SPL Token Program',
    type: 'protocol',
    description: 'Solana Program Library Token Program',
    tags: ['token', 'spl'],
    website: 'https://spl.solana.com',
    confidence: 100,
    detectionMethod: 'dataset'
  },
  {
    address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    name: 'Associated Token Account Program',
    type: 'protocol',
    description: 'Solana Associated Token Account Program',
    tags: ['token', 'spl'],
    website: 'https://spl.solana.com',
    confidence: 100,
    detectionMethod: 'dataset'
  },
  {
    address: 'So11111111111111111111111111111111111111112',
    name: 'Wrapped SOL',
    type: 'protocol',
    description: 'Wrapped SOL token',
    tags: ['token', 'wrapped'],
    website: 'https://solana.com',
    confidence: 100,
    detectionMethod: 'dataset'
  }
];

/**
 * Route to label entities in a wallet's transaction history
 */
router.get('/:address', async (req: Request, res: Response) => {
  try {
    const address = req.params.address;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    
    // Validate input
    if (!address || address.length < 32) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    // Connect to Solana
    const connection = getSolanaConnection();
    
    // Validate the address
    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(address);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid Solana address format' });
    }
    
    // Get transaction signatures
    const signatures = await connection.getSignaturesForAddress(publicKey, { limit });
    
    if (!signatures || signatures.length === 0) {
      return res.json({
        address,
        entityLabels: []
      });
    }
    
    // Get transaction details
    const transactions = await Promise.all(
      signatures.map(sig => connection.getTransaction(sig.signature, { maxSupportedTransactionVersion: 0 }))
    );
    
    // Filter out null transactions
    const validTransactions = transactions.filter(tx => tx !== null);
    
    // Extract all unique addresses from the transactions
    const uniqueAddresses = new Set<string>();
    
    if (validTransactions && validTransactions.length > 0) {
      try {
        validTransactions.forEach(tx => {
          // Use getAccountKeys() for versioned transactions
          const accountKeys = tx!.transaction.message.staticAccountKeys || 
                            tx!.transaction.message.getAccountKeys?.().keySegments().flat() || [];
                            
          accountKeys.forEach(key => {
            const keyStr = key.toString();
            if (keyStr !== address) {
              uniqueAddresses.add(keyStr);
            }
          });
        });
      } catch (error) {
        console.error('Error extracting addresses:', error);
        // Continue with empty address set rather than failing
      }
    }
    
    // Find known entities
    const entityLabels = Array.from(uniqueAddresses)
      .map(addr => {
        // Check if it's a known entity
        const knownEntity = KNOWN_ENTITIES.find(entity => entity.address === addr);
        
        if (knownEntity) {
          return {
            ...knownEntity,
            lastUpdated: new Date()
          };
        }
        
        // If not known, see if we can detect based on transaction patterns
        // This would be more sophisticated in a real implementation
        
        // Simple detection: check if it appears as a program ID in the instructions
        let isProgramInvoked = false;
        try {
          isProgramInvoked = validTransactions.some(tx => {
            const accountKeys = tx!.transaction.message.staticAccountKeys || 
                              tx!.transaction.message.getAccountKeys?.().keySegments().flat() || [];
            const instructions = 'instructions' in tx!.transaction.message ?
              tx!.transaction.message.instructions :
              [];
              
            return instructions.some(ix => {
              const programId = accountKeys[ix.programIdIndex].toString();
              return programId === addr;
            });
          });
        } catch (error) {
          console.error('Error checking program invocation:', error);
          // Continue with isProgramInvoked = false
        }
        
        if (isProgramInvoked) {
          return {
            address: addr,
            name: 'Unknown Program',
            type: 'contract',
            description: 'This address was detected as a program/contract',
            tags: ['program', 'contract'],
            confidence: 80,
            detectionMethod: 'pattern',
            lastUpdated: new Date()
          };
        }
        
        // Check for exchange pattern (interacts with many addresses)
        let interactionCount = 0;
        try {
          interactionCount = validTransactions.filter(tx => {
            const accountKeys = tx!.transaction.message.staticAccountKeys || 
                              tx!.transaction.message.getAccountKeys?.().keySegments().flat() || [];
            return accountKeys.map(key => key.toString()).includes(addr);
          }).length;
        } catch (error) {
          console.error('Error checking interactions:', error);
          // Continue with interactionCount = 0
        }
        
        if (interactionCount >= 5) {
          return {
            address: addr,
            name: 'Possible Exchange',
            type: 'exchange',
            description: 'This address shows patterns typical of an exchange',
            tags: ['exchange', 'high-volume'],
            confidence: 65,
            detectionMethod: 'pattern',
            lastUpdated: new Date()
          };
        }
        
        return null;
      })
      .filter(label => label !== null);
    
    res.json({
      address,
      entityLabels
    });
  } catch (error) {
    console.error('Error in entity labeling:', error);
    res.status(500).json({ error: 'Failed to label entities' });
  }
});

/**
 * Route to get details about a specific entity
 */
router.get('/entity/:entityAddress', async (req: Request, res: Response) => {
  try {
    const entityAddress = req.params.entityAddress;
    
    // Validate input
    if (!entityAddress || entityAddress.length < 32) {
      return res.status(400).json({ error: 'Invalid entity address' });
    }
    
    // Check if it's a known entity
    const knownEntity = KNOWN_ENTITIES.find(entity => entity.address === entityAddress);
    
    if (knownEntity) {
      return res.json({
        ...knownEntity,
        lastUpdated: new Date(),
        additionalInfo: {
          transactionVolume: Math.floor(Math.random() * 1000000),
          activeWallets: Math.floor(Math.random() * 10000),
          firstSeen: new Date(Date.now() - 365 * 24 * 3600 * 1000),
          lastSeen: new Date()
        }
      });
    }
    
    // If not a known entity, try to get more info from the blockchain
    const connection = getSolanaConnection();
    
    // Validate the address format
    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(entityAddress);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid Solana address format' });
    }
    
    // Get transaction signatures
    const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 10 });
    
    if (!signatures || signatures.length === 0) {
      return res.status(404).json({ error: 'Entity not found or has no transaction history' });
    }
    
    // Simple classification based on transaction count
    const type = signatures.length > 100 ? 'exchange' : 'wallet';
    
    res.json({
      address: entityAddress,
      name: `Unknown ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type,
      description: `This ${type} was automatically detected based on transaction patterns`,
      tags: [type, 'auto-detected'],
      confidence: 70,
      detectionMethod: 'pattern',
      lastUpdated: new Date(),
      additionalInfo: {
        transactionCount: signatures.length,
        firstSeen: new Date(signatures[signatures.length - 1].blockTime! * 1000),
        lastSeen: new Date(signatures[0].blockTime! * 1000)
      }
    });
  } catch (error) {
    console.error('Error getting entity details:', error);
    res.status(500).json({ error: 'Failed to retrieve entity details' });
  }
});

/**
 * Route to add or update a manual entity label
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const entitySchema = z.object({
      address: z.string().min(32).max(44),
      name: z.string().min(1).max(100),
      type: z.enum(['exchange', 'dex', 'project', 'protocol', 'contract', 'other']),
      description: z.string().optional(),
      website: z.string().url().optional(),
      tags: z.array(z.string()).optional()
    });
    
    const validation = entitySchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid entity data', details: validation.error });
    }
    
    const { address } = req.body;
    
    // Validate the address format
    try {
      new PublicKey(address);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid Solana address format' });
    }
    
    // In a real implementation, we would store this in a database
    // For now, just return a success response
    
    res.json({
      ...req.body,
      confidence: 100,
      detectionMethod: 'manual',
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Error adding/updating entity label:', error);
    res.status(500).json({ error: 'Failed to save entity label' });
  }
});

export default router;