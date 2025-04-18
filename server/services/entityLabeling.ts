import { Connection, PublicKey } from '@solana/web3.js';
import { storage } from '../storage';
import { getSolanaConnection } from '../solana';
import { Entity, InsertEntity, InsertWalletEntityRelation, Transaction, Wallet } from '@shared/schema';

/**
 * Service for entity and exchange labeling
 * Features:
 * - Known address lookup
 * - Deposit/withdrawal pattern detection
 * - Entity label management
 */
export class EntityLabelingService {
  private connection: Connection;
  
  // Patterns for different exchange behaviors
  private exchangePatterns = {
    deposit: {
      // Multiple users deposit small amounts to a single address
      manyToOne: { weight: 0.5 },
      // Consistent amounts of deposits (e.g., round numbers)
      consistentAmounts: { weight: 0.3 },
      // High transaction volume in short time
      highVolume: { weight: 0.2 },
    },
    withdrawal: {
      // Single address sending to many different addresses
      oneToMany: { weight: 0.5 },
      // Withdrawals often immediately follow deposits (hot wallet)
      timeProximity: { weight: 0.2 },
      // Similar amounts leaving as entering (minus fees)
      amountCorrelation: { weight: 0.3 }
    },
    hotWallet: {
      // High transaction count
      highActivity: { weight: 0.4 },
      // Balance tends to stay consistent (frequent in/out)
      balancePattern: { weight: 0.3 },
      // Many connections to other known exchange wallets
      knownConnections: { weight: 0.3 }
    },
    coldStorage: {
      // Low transaction count
      lowActivity: { weight: 0.3 },
      // Large balance that changes infrequently
      largeBalance: { weight: 0.4 },
      // Periodic large movements to hot wallets
      periodicMovements: { weight: 0.3 }
    }
  };
  
  // Reference data for known entities (will be moved to database in production)
  private knownEntities: Record<string, { 
    type: string; 
    name: string; 
    confidence: number;
    wallets: string[];
  }> = {
    "binance": {
      type: "exchange",
      name: "Binance",
      confidence: 1.0,
      wallets: [
        "3h1zGmCwsRJnVk5BuRNMLsPaQu1y2aqXqXDWYCgrp5UG", // Example Binance hot wallet
        "BSvGoFYVvBGWaEgzuZRGPYWxUsi9AVYPRzw8kYhdQU9R" // Example Binance cold storage
      ]
    },
    "solend": {
      type: "defi",
      name: "Solend",
      confidence: 1.0,
      wallets: [
        "7mhcgF1Z3XUNdV8Vni4xJgDBB48TJ4XWpGjS7uQ1hKfo", // Example Solend wallet
      ]
    },
    "magiceden": {
      type: "nft",
      name: "Magic Eden",
      confidence: 1.0,
      wallets: [
        "1BWutmTvYPwDtmw9abTkS4Ssr8no61spGAvW1X6NDix", // Example Magic Eden escrow
      ]
    }
  };
  
  constructor() {
    this.connection = getSolanaConnection();
    this.initializeKnownEntities();
  }
  
  /**
   * Initialize known entities in the database
   */
  private async initializeKnownEntities() {
    try {
      for (const [key, entityData] of Object.entries(this.knownEntities)) {
        // Check if entity already exists
        const entities = await storage.getEntitiesByType(entityData.type);
        const existingEntity = entities.find(e => e.name.toLowerCase() === entityData.name.toLowerCase());
        
        if (!existingEntity) {
          // Create new entity
          const newEntity: InsertEntity = {
            name: entityData.name,
            type: entityData.type,
            description: `${entityData.name} ${entityData.type}`,
            icon: null,
            color: null,
            userId: null, // System created
            isPublic: true,
            website: `https://${key}.com`, // Example website
            riskLevel: "low",
            verificationStatus: "verified",
            metadata: { source: "system" }
          };
          
          const entity = await storage.createEntity(newEntity);
          
          // Add wallets to entity
          for (const address of entityData.wallets) {
            // Check if wallet exists
            let wallet = await storage.getWalletByAddress(address);
            
            if (!wallet) {
              // Create wallet
              wallet = await storage.createWallet({
                address,
                label: `${entityData.name} Wallet`,
                type: entityData.type,
                userId: null, // System wallet
                metadata: { source: "system" }
              });
            }
            
            // Associate wallet with entity
            await storage.addWalletToEntity({
              walletId: wallet.id,
              entityId: entity.id,
              confidence: entityData.confidence
            });
          }
        }
      }
    } catch (error) {
      console.error("Error initializing known entities:", error);
    }
  }
  
  /**
   * Look up entity information for a known address
   * @param address The Solana wallet address
   * @returns Entity information if found, null otherwise
   */
  async lookupKnownEntity(address: string): Promise<Entity | null> {
    try {
      // Check if this address belongs to a known entity
      return storage.getEntityByAddress(address) || null;
    } catch (error) {
      console.error("Error looking up entity:", error);
      return null;
    }
  }
  
  /**
   * Detect deposit/withdrawal patterns for exchange identification
   * @param address The wallet address to analyze
   * @returns Analysis result with confidence scores
   */
  async detectExchangePatterns(address: string): Promise<{
    isExchange: boolean;
    confidence: number;
    patterns: {
      deposit: {
        score: number;
        indicators: Record<string, number>;
      };
      withdrawal: {
        score: number;
        indicators: Record<string, number>;
      };
      hotWallet: {
        score: number;
        indicators: Record<string, number>;
      };
      coldStorage: {
        score: number;
        indicators: Record<string, number>;
      };
    };
    recommendedType: string;
  }> {
    try {
      // Get wallet transactions
      let wallet = await storage.getWalletByAddress(address);
      
      if (!wallet) {
        // Create a temporary wallet object for analysis if it doesn't exist in the database
        wallet = {
          id: 0, // Temporary ID
          address,
          label: null,
          balance: null,
          executable: null,
          owner: null,
          type: null,
          userId: null,
          lastFetched: null,
          firstSeen: new Date(),
          lastActivity: new Date(),
          tags: null,
          notes: null,
          bookmarked: false,
          verified: false,
          risk: null,
          category: null,
          metadata: null
        };
      }
      
      // Get recent transactions for this wallet (limit to 100 for performance)
      const transactions = await storage.getWalletTransactions(address, 100);
      
      // Analyze for deposit patterns
      const depositAnalysis = await this.analyzeDepositPattern(transactions, address);
      
      // Analyze for withdrawal patterns
      const withdrawalAnalysis = await this.analyzeWithdrawalPattern(transactions, address);
      
      // Analyze for hot wallet patterns
      const hotWalletAnalysis = await this.analyzeHotWalletPattern(wallet, transactions);
      
      // Analyze for cold storage patterns
      const coldStorageAnalysis = await this.analyzeColdStoragePattern(wallet, transactions);
      
      // Calculate total confidence
      const depositWeight = 0.3;
      const withdrawalWeight = 0.3;
      const hotWalletWeight = 0.3;
      const coldStorageWeight = 0.1;
      
      const totalConfidence = (
        depositAnalysis.score * depositWeight +
        withdrawalAnalysis.score * withdrawalWeight +
        hotWalletAnalysis.score * hotWalletWeight +
        coldStorageAnalysis.score * coldStorageWeight
      );
      
      // Determine if this is likely an exchange wallet
      const isExchange = totalConfidence > 0.6;
      
      // Determine recommended type based on highest pattern score
      const patternScores = {
        "exchange_hot": hotWalletAnalysis.score,
        "exchange_cold": coldStorageAnalysis.score,
        "exchange_deposit": depositAnalysis.score,
        "exchange_withdrawal": withdrawalAnalysis.score
      };
      
      const recommendedType = Object.entries(patternScores)
        .sort((a, b) => b[1] - a[1])[0][0];
      
      return {
        isExchange,
        confidence: totalConfidence,
        patterns: {
          deposit: {
            score: depositAnalysis.score,
            indicators: depositAnalysis.indicators
          },
          withdrawal: {
            score: withdrawalAnalysis.score,
            indicators: withdrawalAnalysis.indicators
          },
          hotWallet: {
            score: hotWalletAnalysis.score,
            indicators: hotWalletAnalysis.indicators
          },
          coldStorage: {
            score: coldStorageAnalysis.score,
            indicators: coldStorageAnalysis.indicators
          }
        },
        recommendedType
      };
    } catch (error) {
      console.error("Error detecting exchange patterns:", error);
      return {
        isExchange: false,
        confidence: 0,
        patterns: {
          deposit: { score: 0, indicators: {} },
          withdrawal: { score: 0, indicators: {} },
          hotWallet: { score: 0, indicators: {} },
          coldStorage: { score: 0, indicators: {} }
        },
        recommendedType: "unknown"
      };
    }
  }
  
  /**
   * Analyze deposit pattern indicators
   */
  private async analyzeDepositPattern(transactions: Transaction[], address: string): Promise<{
    score: number;
    indicators: Record<string, number>;
  }> {
    // Count unique sender addresses
    const senders = new Set<string>();
    let consistentAmountsCount = 0;
    let roundAmountsCount = 0;
    
    // Collect deposit transactions (where wallet is the destination)
    const depositTxs = transactions.filter(tx => 
      tx.destinationAddress === address && tx.sourceAddress !== address
    );
    
    // Analyze deposit transactions
    depositTxs.forEach(tx => {
      senders.add(tx.sourceAddress);
      
      // Check for round amounts (divisible by 0.1, 1, 10, 100, etc.)
      if (tx.amount && (tx.amount * 10) % 1 === 0) {
        roundAmountsCount++;
      }
    });
    
    // Calculate metrics
    const uniqueSendersRatio = depositTxs.length > 0 ? senders.size / depositTxs.length : 0;
    const roundAmountsRatio = depositTxs.length > 0 ? roundAmountsCount / depositTxs.length : 0;
    const highVolumeScore = Math.min(1, depositTxs.length / 50); // Scale up to 50 transactions
    
    // Calculate indicator scores
    const indicators = {
      manyToOne: Math.min(1, uniqueSendersRatio),
      consistentAmounts: roundAmountsRatio,
      highVolume: highVolumeScore
    };
    
    // Calculate weighted score
    const weights = this.exchangePatterns.deposit;
    const weightedScore = (
      indicators.manyToOne * weights.manyToOne.weight +
      indicators.consistentAmounts * weights.consistentAmounts.weight +
      indicators.highVolume * weights.highVolume.weight
    );
    
    return {
      score: weightedScore,
      indicators
    };
  }
  
  /**
   * Analyze withdrawal pattern indicators
   */
  private async analyzeWithdrawalPattern(transactions: Transaction[], address: string): Promise<{
    score: number;
    indicators: Record<string, number>;
  }> {
    // Count unique recipient addresses
    const recipients = new Set<string>();
    let timeProximityCount = 0;
    let amountCorrelationCount = 0;
    
    // Collect withdrawal transactions (where wallet is the source)
    const withdrawalTxs = transactions.filter(tx => 
      tx.sourceAddress === address && tx.destinationAddress !== address
    );
    
    // Create a map of deposit timestamps for time proximity analysis
    const depositTimestamps = new Map<number, number>();
    transactions.filter(tx => tx.destinationAddress === address)
      .forEach(tx => {
        if (tx.blockTime) {
          depositTimestamps.set(tx.id, new Date(tx.blockTime).getTime());
        }
      });
    
    // Analyze withdrawal transactions
    withdrawalTxs.forEach(tx => {
      recipients.add(tx.destinationAddress);
      
      // Check time proximity to deposits (within 10 minutes)
      if (tx.blockTime) {
        const txTime = new Date(tx.blockTime).getTime();
        let hasNearbyDeposit = false;
        
        depositTimestamps.forEach(depositTime => {
          const timeDiff = Math.abs(txTime - depositTime);
          if (timeDiff < 10 * 60 * 1000) { // 10 minutes
            hasNearbyDeposit = true;
          }
        });
        
        if (hasNearbyDeposit) {
          timeProximityCount++;
        }
      }
      
      // For amount correlation, we would need more detailed transaction data
      // This is a placeholder implementation
      amountCorrelationCount++;
    });
    
    // Calculate metrics
    const uniqueRecipientsRatio = withdrawalTxs.length > 0 ? recipients.size / withdrawalTxs.length : 0;
    const timeProximityRatio = withdrawalTxs.length > 0 ? timeProximityCount / withdrawalTxs.length : 0;
    const amountCorrelationRatio = 0.5; // Placeholder
    
    // Calculate indicator scores
    const indicators = {
      oneToMany: Math.min(1, uniqueRecipientsRatio),
      timeProximity: timeProximityRatio,
      amountCorrelation: amountCorrelationRatio
    };
    
    // Calculate weighted score
    const weights = this.exchangePatterns.withdrawal;
    const weightedScore = (
      indicators.oneToMany * weights.oneToMany.weight +
      indicators.timeProximity * weights.timeProximity.weight +
      indicators.amountCorrelation * weights.amountCorrelation.weight
    );
    
    return {
      score: weightedScore,
      indicators
    };
  }
  
  /**
   * Analyze hot wallet pattern indicators
   */
  private async analyzeHotWalletPattern(
    wallet: Wallet, 
    transactions: Transaction[]
  ): Promise<{
    score: number;
    indicators: Record<string, number>;
  }> {
    // Calculate activity level
    const activityScore = Math.min(1, transactions.length / 100); // Scale up to 100 transactions
    
    // Calculate balance pattern by looking at variance in balances
    // This would require historical balance data, so using a placeholder
    const balancePatternScore = 0.5;
    
    // Check for connections to other known exchange wallets
    const connectedAddresses = new Set<string>();
    transactions.forEach(tx => {
      if (tx.sourceAddress !== wallet.address) {
        connectedAddresses.add(tx.sourceAddress);
      }
      if (tx.destinationAddress !== wallet.address) {
        connectedAddresses.add(tx.destinationAddress);
      }
    });
    
    // Count how many connected addresses are known exchange wallets
    // This would require checking against a known exchange wallet database
    // Using a placeholder implementation
    const knownConnectionsScore = 0.3;
    
    // Calculate indicator scores
    const indicators = {
      highActivity: activityScore,
      balancePattern: balancePatternScore,
      knownConnections: knownConnectionsScore
    };
    
    // Calculate weighted score
    const weights = this.exchangePatterns.hotWallet;
    const weightedScore = (
      indicators.highActivity * weights.highActivity.weight +
      indicators.balancePattern * weights.balancePattern.weight +
      indicators.knownConnections * weights.knownConnections.weight
    );
    
    return {
      score: weightedScore,
      indicators
    };
  }
  
  /**
   * Analyze cold storage pattern indicators
   */
  private async analyzeColdStoragePattern(
    wallet: Wallet, 
    transactions: Transaction[]
  ): Promise<{
    score: number;
    indicators: Record<string, number>;
  }> {
    // Calculate activity level (low activity = high cold storage score)
    const activityScore = Math.max(0, 1 - (transactions.length / 20));
    
    // Check for large balance
    // This would require current balance data, using placeholder
    const largeBalanceScore = wallet.balance ? Math.min(1, wallet.balance / 1000) : 0.5;
    
    // Check for periodic large movements
    // This would require analyzing transaction amounts and timing
    // Using a placeholder implementation
    const periodicMovementsScore = 0.3;
    
    // Calculate indicator scores
    const indicators = {
      lowActivity: activityScore,
      largeBalance: largeBalanceScore,
      periodicMovements: periodicMovementsScore
    };
    
    // Calculate weighted score
    const weights = this.exchangePatterns.coldStorage;
    const weightedScore = (
      indicators.lowActivity * weights.lowActivity.weight +
      indicators.largeBalance * weights.largeBalance.weight +
      indicators.periodicMovements * weights.periodicMovements.weight
    );
    
    return {
      score: weightedScore,
      indicators
    };
  }
  
  /**
   * Create or update an entity
   */
  async createOrUpdateEntity(entityData: InsertEntity, walletAddresses?: string[]): Promise<Entity> {
    try {
      // Create new entity
      const entity = await storage.createEntity(entityData);
      
      // Add wallet addresses if provided
      if (walletAddresses && walletAddresses.length > 0) {
        for (const address of walletAddresses) {
          // Check if wallet exists
          let wallet = await storage.getWalletByAddress(address);
          
          if (!wallet) {
            // Create wallet
            wallet = await storage.createWallet({
              address,
              label: entityData.name ? `${entityData.name} Wallet` : null,
              type: entityData.type,
              userId: entityData.userId,
              metadata: { source: "user" }
            });
          }
          
          // Associate wallet with entity
          await storage.addWalletToEntity({
            walletId: wallet.id,
            entityId: entity.id,
            confidence: 1.0
          });
        }
      }
      
      return entity;
    } catch (error) {
      console.error("Error creating/updating entity:", error);
      throw error;
    }
  }
  
  /**
   * Get entities by type
   */
  async getEntitiesByType(type: string): Promise<Entity[]> {
    try {
      return storage.getEntitiesByType(type);
    } catch (error) {
      console.error(`Error getting entities by type ${type}:`, error);
      return [];
    }
  }
  
  /**
   * Get entity details with associated wallets
   */
  async getEntityDetails(entityId: number): Promise<{
    entity: Entity;
    wallets: Wallet[];
  } | null> {
    try {
      const entity = await storage.getEntity(entityId);
      if (!entity) {
        return null;
      }
      
      const wallets = await storage.getEntityWallets(entityId);
      
      // Process wallets to add additional information if needed
      const enhancedWallets = wallets.map(wallet => {
        return {
          ...wallet,
          // Add derived properties if needed
        };
      });
      
      return {
        entity,
        wallets: enhancedWallets
      };
    } catch (error) {
      console.error(`Error getting entity details for ID ${entityId}:`, error);
      return null;
    }
  }
}

export const entityLabelingService = new EntityLabelingService();