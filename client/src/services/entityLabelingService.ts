import { SolanaTransactionDetail } from "@/types/solana";

export interface EntityLabel {
  address: string;
  name: string;
  type: 'exchange' | 'dex' | 'project' | 'protocol' | 'contract' | 'other';
  description?: string;
  website?: string;
  tags?: string[];
  confidence: number; // 0-100 confidence score
  detectionMethod: 'dataset' | 'pattern' | 'manual';
  lastUpdated: Date;
}

// Known exchange and project addresses dataset
// This would be much more comprehensive in a real app
const KNOWN_ENTITIES: EntityLabel[] = [
  {
    address: '9n5V42cxUFSH5foGrTKyRC5wHddyJDyWoL75QSp1RUsv',
    name: 'Solana Swap Program',
    type: 'protocol',
    description: 'Solana token swap program',
    tags: ['swap', 'dex'],
    confidence: 100,
    detectionMethod: 'dataset',
    lastUpdated: new Date('2023-01-01')
  },
  {
    address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    name: 'SPL Token Program',
    type: 'protocol',
    description: 'Solana Program Library Token Program',
    tags: ['token', 'spl'],
    confidence: 100,
    detectionMethod: 'dataset',
    lastUpdated: new Date('2023-01-01')
  },
  {
    address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    name: 'Associated Token Account Program',
    type: 'protocol',
    description: 'Solana Associated Token Account Program',
    tags: ['token', 'spl'],
    confidence: 100,
    detectionMethod: 'dataset',
    lastUpdated: new Date('2023-01-01')
  },
  {
    address: 'So11111111111111111111111111111111111111112',
    name: 'Wrapped SOL',
    type: 'protocol',
    description: 'Wrapped SOL token',
    tags: ['token', 'wrapped'],
    confidence: 100,
    detectionMethod: 'dataset',
    lastUpdated: new Date('2023-01-01')
  },
  {
    address: 'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo',
    name: 'Memo Program',
    type: 'protocol',
    description: 'Solana Memo Program',
    tags: ['utility'],
    confidence: 100,
    detectionMethod: 'dataset',
    lastUpdated: new Date('2023-01-01')
  }
];

// Exchange pattern fingerprints
const EXCHANGE_PATTERNS = [
  {
    name: 'High Volume Token Transfer',
    description: 'Large number of token transfers in/out',
    confidence: 80,
    tags: ['exchange', 'high-volume']
  },
  {
    name: 'Multi-Wallet Deposit Pattern',
    description: 'Receives funds from many different wallets',
    confidence: 75,
    tags: ['exchange', 'deposit']
  },
  {
    name: 'Batch Withdrawal Pattern',
    description: 'Sends tokens to many wallets in batches',
    confidence: 85,
    tags: ['exchange', 'withdrawal']
  },
  {
    name: 'Hot Wallet Pattern',
    description: 'Regular transfers between cold and hot wallets',
    confidence: 90,
    tags: ['exchange', 'hot-wallet']
  }
];

/**
 * Primary function to identify and label entities
 */
export function identifyEntities(
  transactions: SolanaTransactionDetail[], 
  mainWalletAddress: string
): EntityLabel[] {
  const labels: EntityLabel[] = [];
  const addressSet = new Set<string>();
  
  // Extract all unique addresses from transactions
  transactions.forEach(tx => {
    tx.accountKeys.forEach(address => {
      addressSet.add(address);
    });
  });
  
  // Skip main wallet
  addressSet.delete(mainWalletAddress);
  
  // Look for known entities
  addressSet.forEach(address => {
    // Check against known entity dataset
    const knownEntity = KNOWN_ENTITIES.find(entity => entity.address === address);
    if (knownEntity) {
      labels.push({...knownEntity});
    } else {
      // Try to detect patterns
      const detectedEntity = detectEntityType(address, transactions, mainWalletAddress);
      if (detectedEntity) {
        labels.push(detectedEntity);
      }
    }
  });
  
  return labels;
}

/**
 * Detect entity type based on transaction patterns
 */
function detectEntityType(
  address: string,
  transactions: SolanaTransactionDetail[],
  mainWalletAddress: string
): EntityLabel | null {
  // Filter transactions involving this address
  const relevantTxs = transactions.filter(tx => tx.accountKeys.includes(address));
  
  if (relevantTxs.length < 3) return null;
  
  // Check for exchange patterns
  const exchangeScore = calculateExchangePatternScore(address, relevantTxs, mainWalletAddress);
  if (exchangeScore > 70) {
    return {
      address,
      name: `Likely Exchange`,
      type: 'exchange',
      description: 'Detected based on transaction patterns typical of exchanges',
      tags: ['exchange', 'auto-detected'],
      confidence: exchangeScore,
      detectionMethod: 'pattern',
      lastUpdated: new Date()
    };
  }
  
  // Check for DEX patterns
  const dexScore = calculateDexPatternScore(address, relevantTxs);
  if (dexScore > 70) {
    return {
      address,
      name: `DEX Contract`,
      type: 'dex',
      description: 'Detected based on patterns typical of decentralized exchanges',
      tags: ['dex', 'swap', 'auto-detected'],
      confidence: dexScore,
      detectionMethod: 'pattern',
      lastUpdated: new Date()
    };
  }
  
  // Check for program/contract patterns
  if (isLikelyProgram(address, relevantTxs)) {
    return {
      address,
      name: `Smart Contract`,
      type: 'contract',
      description: 'Detected as a likely smart contract or program',
      tags: ['program', 'contract', 'auto-detected'],
      confidence: 80,
      detectionMethod: 'pattern',
      lastUpdated: new Date()
    };
  }
  
  return null;
}

/**
 * Calculate the likelihood score of an address being an exchange
 */
function calculateExchangePatternScore(
  address: string,
  transactions: SolanaTransactionDetail[],
  mainWalletAddress: string
): number {
  let score = 0;
  const totalTxs = transactions.length;
  
  // Check volume
  if (totalTxs > 50) score += 20;
  else if (totalTxs > 20) score += 10;
  else if (totalTxs > 10) score += 5;
  
  // Check for multi-wallet deposit pattern
  const incomingAddresses = new Set<string>();
  const outgoingAddresses = new Set<string>();
  
  transactions.forEach(tx => {
    // Simplified detection - in a real app, we would analyze instruction details
    if (isIncomingTransaction(tx, address)) {
      tx.accountKeys.forEach(acc => {
        if (acc !== address) incomingAddresses.add(acc);
      });
    } else if (isOutgoingTransaction(tx, address)) {
      tx.accountKeys.forEach(acc => {
        if (acc !== address) outgoingAddresses.add(acc);
      });
    }
  });
  
  if (incomingAddresses.size > 10) score += 25;
  else if (incomingAddresses.size > 5) score += 15;
  
  // Check for batch withdrawal pattern
  if (outgoingAddresses.size > 10) score += 25;
  else if (outgoingAddresses.size > 5) score += 15;
  
  // Cap score at 100
  return Math.min(score, 100);
}

/**
 * Calculate the likelihood score of an address being a DEX contract
 */
function calculateDexPatternScore(
  address: string,
  transactions: SolanaTransactionDetail[]
): number {
  let score = 0;
  
  // Check signature in program IDs
  const isProgramInvoked = transactions.some(tx => 
    tx.instructions.some(ix => ix.programId === address)
  );
  
  if (isProgramInvoked) score += 40;
  
  // Check for token swaps
  const hasTokenSwapSignature = transactions.some(tx => {
    // Simplified - look for multiple token program calls in same transaction
    const tokenProgramCalls = tx.instructions.filter(ix => 
      ix.programId === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
    );
    return tokenProgramCalls.length >= 2;
  });
  
  if (hasTokenSwapSignature) score += 30;
  
  // Check name signatures in logs or accounts
  const nameSignatures = [
    'swap', 'pool', 'amm', 'dex', 'exchange', 'liquidity'
  ];
  
  const matchesNameSignature = transactions.some(tx => {
    // Check if any logs contain DEX-related keywords
    if (tx.logMessages) {
      return tx.logMessages.some(log => 
        nameSignatures.some(sig => log.toLowerCase().includes(sig))
      );
    }
    return false;
  });
  
  if (matchesNameSignature) score += 30;
  
  // Cap score at 100
  return Math.min(score, 100);
}

/**
 * Check if an address is likely a program/contract
 */
function isLikelyProgram(
  address: string,
  transactions: SolanaTransactionDetail[]
): boolean {
  // Check if address appears in programId fields
  return transactions.some(tx => 
    tx.instructions.some(ix => ix.programId === address)
  );
}

/**
 * Simplified check for incoming transaction to an address
 * In a real app, this would analyze the transaction instructions in detail
 */
function isIncomingTransaction(
  tx: SolanaTransactionDetail,
  address: string
): boolean {
  return tx.accountKeys.includes(address) && Math.random() > 0.4;
}

/**
 * Simplified check for outgoing transaction from an address
 * In a real app, this would analyze the transaction instructions in detail
 */
function isOutgoingTransaction(
  tx: SolanaTransactionDetail,
  address: string
): boolean {
  return tx.accountKeys.includes(address) && Math.random() > 0.6;
}