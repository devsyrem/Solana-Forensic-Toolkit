import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertWalletSchema, insertVisualizationSchema } from "@shared/schema";
import { Connection, PublicKey } from "@solana/web3.js";
import { z } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";
import bcrypt from "bcryptjs";
import WebSocket from "ws";
import path from "path";
import fs from "fs";
import { getSolanaConnection, getSignaturesForAddress, getTransactionsInBatches } from "./solana";

// Import wallet analysis, transaction clustering, and entity labeling routes
import walletAnalysisRoutes from './routes/walletAnalysis';
import transactionClusteringRoutes from './routes/transactionClustering';
import entityLabelingRoutes from './routes/entityLabeling';
import teamRoutes from './routes/teamRoutes';
import annotationRoutes from './routes/annotationRoutes';

const SessionStore = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Add global cache control middleware for all API routes
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });

  // Set up WebSocket server for real-time updates
  const wss = new WebSocket.Server({ 
    server: httpServer,
    perMessageDeflate: false, // Disable per-message deflate to avoid compression issues
    maxPayload: 100 * 1024 * 1024 // Set a reasonable max payload size (100MB)
  });
  
  console.log("WebSocket server initialized");
  
  wss.on("connection", (ws) => {
    console.log("New WebSocket connection established");
    
    // Add typings for our custom WebSocket properties
    interface ExtendedWebSocket extends WebSocket {
      userData?: {
        visualizationId?: string;
        userId?: number;
        username?: string;
      };
    }
    
    const extWs = ws as ExtendedWebSocket;
    
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle general subscription
        if (data.type === "subscribe") {
          ws.send(JSON.stringify({ type: "subscribed", data: data.data }));
        }
        
        // Handle visualization presence - user joining a visualization
        if (data.type === "join-visualization") {
          // Store user data with this connection
          extWs.userData = { 
            visualizationId: data.visualizationId,
            userId: data.userId,
            username: data.username
          };
          
          console.log(`User ${data.username} (${data.userId}) joined visualization ${data.visualizationId}`);
          
          // Broadcast to others that someone joined
          wss.clients.forEach(client => {
            const extClient = client as ExtendedWebSocket;
            if (client !== ws && 
                client.readyState === WebSocket.OPEN && 
                extClient.userData?.visualizationId === data.visualizationId) {
              client.send(JSON.stringify({
                type: 'user-joined',
                user: {
                  id: data.userId,
                  username: data.username,
                  timestamp: new Date().toISOString()
                }
              }));
            }
          });
          
          // Send current active users to the new user
          const activeUsers = Array.from(wss.clients)
            .filter(client => {
              const extClient = client as ExtendedWebSocket;
              return client !== ws && 
                     client.readyState === WebSocket.OPEN && 
                     extClient.userData?.visualizationId === data.visualizationId;
            })
            .map(client => {
              const extClient = client as ExtendedWebSocket;
              return {
                id: extClient.userData?.userId,
                username: extClient.userData?.username
              };
            });
          
          ws.send(JSON.stringify({
            type: 'active-users',
            users: activeUsers
          }));
        }
        
        // Handle annotations and comments
        if (data.type === "annotation") {
          // Broadcast annotation to all clients viewing the same visualization
          wss.clients.forEach(client => {
            const extClient = client as ExtendedWebSocket;
            if (client !== ws && 
                client.readyState === WebSocket.OPEN && 
                extClient.userData?.visualizationId === data.visualizationId) {
              client.send(JSON.stringify({
                type: 'new-annotation',
                annotation: data.annotation
              }));
            }
          });
        }
        
        // Handle cursor position updates for real-time collaboration
        if (data.type === "cursor-position") {
          // Broadcast cursor position to all clients viewing the same visualization
          wss.clients.forEach(client => {
            const extClient = client as ExtendedWebSocket;
            if (client !== ws && 
                client.readyState === WebSocket.OPEN && 
                extClient.userData?.visualizationId === data.visualizationId) {
              client.send(JSON.stringify({
                type: 'cursor-update',
                userId: data.userId,
                username: data.username,
                position: data.position
              }));
            }
          });
        }
      } catch (error) {
        console.error("WebSocket error:", error);
      }
    });
    
    ws.on("error", (error) => {
      console.error("WebSocket connection error:", error);
    });
    
    // Send a heartbeat message every 30 seconds to keep the connection alive
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "heartbeat" }));
      }
    }, 30000);
    
    ws.on("close", () => {
      console.log("WebSocket connection closed");
      
      // Notify others if this user was in a visualization
      const extWs = ws as ExtendedWebSocket;
      if (extWs.userData?.visualizationId && extWs.userData?.userId) {
        // Broadcast to others that this user left
        wss.clients.forEach(client => {
          const extClient = client as ExtendedWebSocket;
          if (client !== ws && 
              client.readyState === WebSocket.OPEN && 
              extClient.userData?.visualizationId === extWs.userData?.visualizationId) {
            client.send(JSON.stringify({
              type: 'user-left',
              userId: extWs.userData.userId,
              username: extWs.userData.username,
              timestamp: new Date().toISOString()
            }));
          }
        });
      }
      
      clearInterval(interval);
    });
  });

  // Set up session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "solflow-secret",
      resave: false,
      saveUninitialized: false,
      store: new SessionStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      cookie: {
        maxAge: 604800000, // 1 week
      },
    })
  );

  // Set up passport for authentication
  app.use(passport.initialize());
  app.use(passport.session());

  // Set up local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username" });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password" });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Initialize Solana connection
  const solanaConnection = new Connection(
    process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
    "confirmed"
  );
  
  console.log("Initialized Solana connection to RPC endpoint");

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(validatedData.password, salt);
      
      // Create user
      const user = await storage.createUser({
        username: validatedData.username,
        password: hashedPassword,
      });
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      return res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message });
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error logging out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { password, ...userWithoutPassword } = req.user as any;
    res.json(userWithoutPassword);
  });

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Not authenticated" });
  };

  // Wallet routes
  app.post("/api/wallets", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertWalletSchema.parse({
        ...req.body,
        userId: (req.user as any).id,
      });
      
      // Check if wallet already exists
      const existingWallet = await storage.getWalletByAddress(validatedData.address);
      if (existingWallet) {
        return res.status(400).json({ message: "Wallet already exists" });
      }
      
      // Validate address is a valid Solana public key
      try {
        new PublicKey(validatedData.address);
      } catch (error) {
        return res.status(400).json({ message: "Invalid Solana address" });
      }
      
      // Create wallet
      const wallet = await storage.createWallet(validatedData);
      return res.status(201).json(wallet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/wallets", isAuthenticated, async (req, res) => {
    try {
      const wallets = await storage.getUserWallets((req.user as any).id);
      return res.json(wallets);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Solana data routes using direct RPC endpoint
  app.get("/api/solana/account/:address", async (req, res) => {
    try {
      const { address } = req.params;
      
      // Validate address is a valid Solana public key
      let publicKey: PublicKey;
      try {
        publicKey = new PublicKey(address);
      } catch (error) {
        return res.status(400).json({ message: "Invalid Solana address" });
      }
      
      try {
        // Get account info directly from Solana RPC
        const accountInfo = await solanaConnection.getAccountInfo(publicKey);
        const balance = await solanaConnection.getBalance(publicKey);
        
        // Format account info
        const account = {
          address,
          balance: balance / 10**9, // Convert lamports to SOL
          executable: accountInfo?.executable || false,
          owner: accountInfo?.owner?.toBase58() || null,
          type: 'account',
          programData: accountInfo?.data ? Buffer.from(accountInfo.data).toString('base64') : null
        };
        
        // Check if this is a token account
        if (accountInfo?.owner?.toBase58() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
          account.type = 'tokenAccount';
        }
        
        return res.json(account);
      } catch (error) {
        console.error("Error fetching account from Solana RPC:", error);
        return res.status(500).json({ 
          message: "Error fetching account info", 
          error: error.message 
        });
      }
    } catch (error) {
      console.error("Error fetching Solana account:", error);
      return res.status(500).json({ message: "Error fetching Solana account" });
    }
  });

  app.get("/api/solana/transactions/:address", async (req, res) => {
    try {
      const { address } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const before = req.query.before as string;
      
      // Validate address is a valid Solana public key
      let publicKey: PublicKey;
      try {
        publicKey = new PublicKey(address);
      } catch (error) {
        return res.status(400).json({ message: "Invalid Solana address" });
      }
      
      // Use our new helper function with retry logic
      try {
        // Get transaction signatures with built-in retry
        const signatures = await getSignaturesForAddress(
          publicKey, 
          { limit, before }
        );
        
        // Simple case: if only fetching limited basic info, just return signatures
        if (limit <= 20) {
          const transactions = signatures.map(sig => ({
            signature: sig.signature,
            blockTime: sig.blockTime,
            slot: sig.slot,
            err: sig.err,
            memo: sig.memo,
            status: sig.err ? 'failed' : 'success',
          }));
          
          return res.json(transactions);
        }
        
        // If need more details, use batching with retries for larger requests
        const txSignatures = signatures.map(sig => sig.signature);
        const txDetails = await getTransactionsInBatches(txSignatures);
        
        // Map to consistent format
        const transactions = txDetails.map(({ signature, transaction, error }) => {
          // Find the original signature info
          const sigInfo = signatures.find(s => s.signature === signature);
          
          if (!transaction || error) {
            return {
              signature,
              blockTime: sigInfo?.blockTime,
              slot: sigInfo?.slot,
              err: sigInfo?.err || error,
              memo: sigInfo?.memo,
              status: 'unknown',
            };
          }
          
          return {
            signature,
            blockTime: sigInfo?.blockTime,
            slot: sigInfo?.slot,
            err: sigInfo?.err,
            memo: sigInfo?.memo,
            fee: transaction.meta?.fee || 0,
            status: transaction.meta?.err ? 'failed' : 'success',
          };
        });
        
        return res.json(transactions);
      } catch (fetchError: any) {
        console.error(`Error fetching transaction data for ${address}:`, fetchError.message);
        return res.status(500).json({ 
          message: "Error fetching Solana transactions", 
          error: fetchError.message
        });
      }
    } catch (error: any) {
      console.error("Unhandled error in transaction fetch:", error);
      return res.status(500).json({ 
        message: "Error fetching Solana transactions", 
        error: error.message 
      });
    }
  });

  app.get("/api/solana/transaction/:signature", async (req, res) => {
    try {
      const { signature } = req.params;
      
      // Use our new batching function to get transaction with retry logic
      const [txResult] = await getTransactionsInBatches([signature]);
      
      if (!txResult || !txResult.transaction) {
        const errorMsg = txResult?.error || "Transaction not found";
        console.log(`Transaction not found or error: ${errorMsg}`);
        return res.status(404).json({ message: errorMsg });
      }
      
      const transaction = txResult.transaction;
      
      // Use getAccountKeys() for versioned transactions
      const accountKeys = transaction.transaction.message.staticAccountKeys || 
                          transaction.transaction.message.getAccountKeys?.().keySegments().flat() || [];
      
      // Handle instructions for both legacy and versioned transactions
      const instructions = 'instructions' in transaction.transaction.message ?
        transaction.transaction.message.instructions :
        [];
        
      return res.json({
        signature,
        blockTime: transaction.blockTime,
        slot: transaction.slot,
        fee: transaction.meta?.fee || 0,
        status: transaction.meta?.err ? 'failed' : 'success',
        instructions: instructions.map((ix: any) => ({
          programId: accountKeys[ix.programIdIndex]?.toBase58() || '',
          accounts: ix.accounts.map((acc: number) => 
            accountKeys[acc]?.toBase58() || ''
          ),
          data: ix.data,
        })),
        accountKeys: accountKeys.map((key: any) => 
          key.toBase58()
        ),
      });
    } catch (error: any) {
      console.error("Error fetching transaction details:", error.message || error);
      return res.status(500).json({ 
        message: "Error fetching transaction details",
        error: error.message || "Unknown error"
      });
    }
  });

  // New endpoint: Get transaction details for a specific address using direct Solana RPC
  app.get("/api/solana/address-transactions/:address", async (req, res) => {
    try {
      const { address } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Validate address is a valid Solana public key
      let publicKey: PublicKey;
      try {
        publicKey = new PublicKey(address);
      } catch (error) {
        return res.status(400).json({ message: "Invalid Solana address" });
      }

      try {
        // Get transaction signatures for this address
        const signatures = await solanaConnection.getSignaturesForAddress(publicKey, { limit });
        
        if (!signatures || signatures.length === 0) {
          console.log(`No signatures found for address: ${address}`);
          // We need to return real data, not fallback mock data
          return res.json([]);
        }
        
        // Get transaction details for each signature
        const transactionDetails = await Promise.all(
          signatures.map(async (sig) => {
            try {
              const tx = await solanaConnection.getTransaction(sig.signature, {
                maxSupportedTransactionVersion: 0,
              });
              
              if (!tx) return null;
              
              // Use getAccountKeys() for versioned transactions
              const accountKeys = tx.transaction.message.staticAccountKeys || 
                             tx.transaction.message.getAccountKeys?.().keySegments().flat() || [];
              
              // Handle instructions for both legacy and versioned transactions
              const instructions = 'instructions' in tx.transaction.message ?
                tx.transaction.message.instructions :
                [];
                
              return {
                signature: sig.signature,
                blockTime: tx.blockTime,
                slot: tx.slot,
                fee: tx.meta?.fee || 0,
                status: tx.meta?.err ? 'failed' : 'success',
                instructions: instructions.map((ix: any) => ({
                  programId: accountKeys[ix.programIdIndex]?.toBase58() || '',
                  accounts: ix.accounts.map((acc: number) => 
                    accountKeys[acc]?.toBase58() || ''
                  ),
                  data: ix.data
                })),
                accountKeys: accountKeys.map(key => key?.toBase58() || '')
              };
            } catch (error) {
              console.error(`Error fetching transaction details for signature ${sig.signature}:`, error);
              return null;
            }
          })
        );
        
        // Filter out null values (failed transactions)
        const validTransactions = transactionDetails.filter(tx => tx !== null);
        
        if (validTransactions.length === 0) {
          console.log(`No valid transactions found for address: ${address}`);
          return res.json([]);
        }
        
        console.log(`Successfully fetched ${validTransactions.length} transactions using Solana RPC`);
        return res.json(validTransactions);
      } catch (error) {
        console.error("Error fetching transaction data:", error);
        
        if (error.message?.includes('Failed to query long-term storage')) {
          console.warn("Long-term storage error, but returning empty array instead of mock data");
          return res.json([]);
        }
        
        return res.status(500).json({ 
          message: "Error fetching transaction details", 
          error: error.message
        });
      }
    } catch (error) {
      console.error("Error in address-transactions route:", error);
      return res.status(500).json({ message: "Error fetching transaction details" });
    }
  });
  
  // Function to generate sample transaction data for visualization
  function generateSampleTransactionData(mainAddress: string) {
    const demoAddresses = [
      "FvM2xj3Yo9eWBTiyeDrNffY5FzJvEJy76KyrWEWoAzZG",
      "NTYeYJ1wr4bpM5xo6zx5En44SvJFAd35zTxxNoERYqd",
      "B1aLzaNMiFqEQDJfwE4fQbLBg1NCHbeQHypxUJxWpgp3",
      "So11111111111111111111111111111111111111112",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    ];
    
    // Generate 5 sample transactions
    return Array.from({ length: 5 }, (_, i) => {
      const timestamp = new Date();
      timestamp.setDate(timestamp.getDate() - i);
      
      // Generate 1-3 random additional addresses for each transaction
      const randomAddressCount = Math.floor(Math.random() * 3) + 1;
      const transactionAddresses = [];
      for (let j = 0; j < randomAddressCount; j++) {
        transactionAddresses.push(demoAddresses[Math.floor(Math.random() * demoAddresses.length)]);
      }
      
      // Ensure the list of addresses is unique
      const uniqueAddresses = [...new Set(transactionAddresses)];
      
      return {
        signature: `demo${i}${Math.random().toString(36).substring(2, 10)}`,
        blockTime: Math.floor(timestamp.getTime() / 1000),
        slot: 1000000 + i * 100,
        fee: Math.floor(Math.random() * 5000) + 1000,
        status: Math.random() > 0.1 ? 'success' : 'failed',
        instructions: [
          {
            programId: "11111111111111111111111111111111",
            accounts: uniqueAddresses,
            data: "demo"
          }
        ],
        accountKeys: [mainAddress, ...uniqueAddresses]
      };
    });
  }
  
  // Visualization routes
  app.post("/api/visualizations", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertVisualizationSchema.parse({
        ...req.body,
        userId: (req.user as any).id,
      });
      
      // Create visualization
      const visualization = await storage.createVisualization(validatedData);
      return res.status(201).json(visualization);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/visualizations", isAuthenticated, async (req, res) => {
    try {
      const visualizations = await storage.getUserVisualizations((req.user as any).id);
      return res.json(visualizations);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/visualizations/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const visualization = await storage.getVisualization(parseInt(id));
      
      if (!visualization) {
        return res.status(404).json({ message: "Visualization not found" });
      }
      
      if (visualization.userId !== (req.user as any).id && !visualization.shared) {
        return res.status(403).json({ message: "Not authorized to view this visualization" });
      }
      
      return res.json(visualization);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/visualizations/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const visualization = await storage.getVisualization(parseInt(id));
      
      if (!visualization) {
        return res.status(404).json({ message: "Visualization not found" });
      }
      
      if (visualization.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Not authorized to update this visualization" });
      }
      
      const validatedData = insertVisualizationSchema.partial().parse(req.body);
      const updatedVisualization = await storage.updateVisualization(parseInt(id), validatedData);
      
      return res.json(updatedVisualization);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/visualizations/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const visualization = await storage.getVisualization(parseInt(id));
      
      if (!visualization) {
        return res.status(404).json({ message: "Visualization not found" });
      }
      
      if (visualization.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Not authorized to delete this visualization" });
      }
      
      await storage.deleteVisualization(parseInt(id));
      return res.json({ message: "Visualization deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/visualizations/:id/share", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { shared } = req.body;
      const visualization = await storage.getVisualization(parseInt(id));
      
      if (!visualization) {
        return res.status(404).json({ message: "Visualization not found" });
      }
      
      if (visualization.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Not authorized to share this visualization" });
      }
      
      const updatedVisualization = await storage.shareVisualization(parseInt(id), shared);
      return res.json(updatedVisualization);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/shared/visualizations/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const visualization = await storage.getVisualizationByShareToken(token);
      
      if (!visualization || !visualization.shared) {
        return res.status(404).json({ message: "Shared visualization not found" });
      }
      
      return res.json(visualization);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add a heartbeat endpoint to check server status
  app.get("/api/health", async (req, res) => {
    try {
      // Check Solana RPC status
      let solanaStatus = "disconnected";
      let blockHeight = 0;
      
      try {
        const slot = await solanaConnection.getSlot();
        if (slot) {
          solanaStatus = "connected";
          blockHeight = slot;
        }
      } catch (rpcError: any) {
        console.error("Error checking Solana RPC status:", rpcError.message);
      }
      
      // Check Solscan API status as well
      const { checkSolscanApiStatus } = await import('./services/solscanAPI');
      const solscanStatus = await checkSolscanApiStatus();
      
      return res.json({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        solana: {
          status: solanaStatus,
          blockHeight,
          rpc: process.env.SOLANA_RPC_URL ? "custom" : "default"
        },
        solscan: solscanStatus
      });
    } catch (error: any) {
      return res.json({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        solana: {
          status: "error",
          message: error?.message || "Unknown error checking Solana connection"
        },
        solscan: { 
          status: "error", 
          message: "Failed to check Solscan API status" 
        }
      });
    }
  });
  
  // Serve static HTML file for direct access - Multiple entry points for better accessibility
  app.get(["/static", "/static-app", "/solflow-static", "/solana-flow"], (req, res) => {
    const staticHtmlPath = path.resolve(process.cwd(), "static", "index.html");
    
    // Add cache control headers to prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    try {
      if (fs.existsSync(staticHtmlPath)) {
        console.log(`Serving static HTML file from: ${staticHtmlPath} for path: ${req.path}`);
        return res.sendFile(staticHtmlPath);
      } else {
        console.error(`Static HTML file not found at: ${staticHtmlPath}`);
        return res.status(404).send("Static file not found");
      }
    } catch (error) {
      console.error("Error serving static file:", error);
      return res.status(500).send("Error serving static file");
    }
  });
  
  // Special direct access HTML that bypasses Vite completely
  app.get(["/direct", "/direct-access", "/bypass"], (req, res) => {
    const directHtmlPath = path.resolve(process.cwd(), "direct.html");
    
    try {
      if (fs.existsSync(directHtmlPath)) {
        console.log(`Serving direct HTML file from: ${directHtmlPath} for path: ${req.path}`);
        return res.sendFile(directHtmlPath);
      } else {
        console.error(`Direct HTML file not found at: ${directHtmlPath}`);
        return res.status(404).send("Direct HTML file not found");
      }
    } catch (error) {
      console.error("Error serving direct file:", error);
      return res.status(500).send("Error serving direct HTML file");
    }
  });
  
  // Redirect old visualization routes to new RPC-based visualization
  app.get(["/visualization", "/visualization/:address"], (req, res) => {
    // Extract any address parameter
    const address = req.params.address || '';
    
    // Redirect to the new RPC visualization with the address if provided
    if (address) {
      console.log(`Redirecting visualization request for ${address} to RPC-based visualization`);
      return res.redirect(`/rpc-visualization/${address}`);
    } else {
      console.log(`Redirecting visualization request to RPC-based visualization`);
      return res.redirect('/rpc-visualization');
    }
  });
  
  // New route for direct RPC-based visualization 
  app.get(["/rpc-visualization", "/rpc-visualization/:address"], (req, res) => {
    const vizHtmlPath = path.resolve(process.cwd(), "static", "visualization.html");
    
    // Add cache control headers to prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    // Also add a random query parameter to the HTML to bust cache
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    
    try {
      if (fs.existsSync(vizHtmlPath)) {
        console.log(`Serving RPC visualization HTML from: ${vizHtmlPath} for path: ${req.path}`);
        
        // Read the HTML file content
        const htmlContent = fs.readFileSync(vizHtmlPath, 'utf8');
        
        // Add cache busting timestamp and force to use our new endpoint
        const modifiedHtml = htmlContent
          .replace('</head>', `<meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate, proxy-revalidate">
          <meta http-equiv="Pragma" content="no-cache">
          <meta http-equiv="Expires" content="0">
          <script>window.USE_DIRECT_RPC = true;</script>
          <script>window.CACHE_TIMESTAMP = "${Date.now()}";</script>
          </head>`);
        
        return res.send(modifiedHtml);
      } else {
        console.error(`Visualization HTML file not found at: ${vizHtmlPath}`);
        return res.status(404).send("Visualization HTML file not found");
      }
    } catch (error) {
      console.error("Error serving visualization file:", error);
      return res.status(500).send("Error serving visualization HTML file");
    }
  });
  
  // Add a direct root path for the static file as fallback
  app.get("/", (req, res, next) => {
    // Only serve static HTML if requested with query param ?static=true
    if (req.query.static === 'true') {
      const staticHtmlPath = path.resolve(process.cwd(), "static", "index.html");
      
      try {
        if (fs.existsSync(staticHtmlPath)) {
          console.log(`Serving static HTML file from root path with static param`);
          return res.sendFile(staticHtmlPath);
        }
      } catch (error) {
        console.error("Error serving static file from root:", error);
      }
    }
    
    // Otherwise continue to next handler (likely Vite)
    next();
  });

  // Register wallet analysis routes
  app.use('/api/wallet-analysis', walletAnalysisRoutes);
  
  // Register transaction clustering routes
  app.use('/api/transaction-clustering', transactionClusteringRoutes);
  
  // Register entity labeling routes
  app.use('/api/entity-labeling', entityLabelingRoutes);
  app.use('/api/teams', teamRoutes);
  app.use('/api/annotations', annotationRoutes);

  return httpServer;
}
