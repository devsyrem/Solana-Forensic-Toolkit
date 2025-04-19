# SolFlow: Technical Documentation

This document provides in-depth technical information about the SolFlow application architecture, implementation details, and codebase organization. It serves as a reference for developers working on the project.

## Codebase Structure

The SolFlow codebase follows a client-server architecture with clear separation of concerns:

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions and services
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service functions
│   │   ├── types/          # TypeScript type definitions
│   │   ├── App.tsx         # Main application component
│   │   └── main.tsx        # Application entry point
│   └── index.html          # HTML template
├── server/                 # Backend Express application
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic services
│   ├── db.ts               # Database connection setup
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # Main route registration
│   ├── storage.ts          # Data storage interface
│   ├── solana.ts           # Solana blockchain connection
│   └── vite.ts             # Vite server integration
├── shared/                 # Shared code between client and server
│   └── schema.ts           # Database schema and types
└── drizzle.config.ts       # Drizzle ORM configuration
```

## Architecture Overview

SolFlow implements a modern web application architecture with these key components:

### Frontend Architecture

The frontend follows a component-based architecture using React. It's organized into:

1. **Presentation Components**: UI components that render data and handle user interactions
2. **Container Components**: Connect presentation components to data sources and services
3. **Custom Hooks**: Encapsulate and share stateful logic between components
4. **Services**: Handle API communication and data transformation

Key design patterns used:
- **Container/Presentational Pattern**: Separation of data and presentation concerns
- **Custom Hook Pattern**: Reusable stateful logic
- **Context API**: Global state management for authentication and theme
- **Render Props**: Component composition for complex UI elements

### Backend Architecture

The backend follows a route-controller-service architecture:

1. **Routes**: Define API endpoints and handle HTTP requests
2. **Services**: Contain business logic and data manipulation
3. **Storage Interface**: Abstracts database operations
4. **Database Layer**: Handles data persistence

Key design patterns used:
- **Repository Pattern**: Abstraction for data access
- **Dependency Injection**: Services receive dependencies through constructors
- **Middleware Pattern**: Request processing pipeline
- **Adapter Pattern**: Integration with external systems (Solana RPC)

### Data Flow

1. User interacts with the UI
2. React components update state and trigger hooks
3. Hooks make API calls through services
4. Server routes receive requests
5. Server services process requests
6. Storage interface interacts with the database
7. Response flows back to the client
8. React updates the UI

## Database Schema

The database schema consists of several core entities:

### Users and Authentication

```typescript
// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").defaultNow(),
  lastLogin: timestamp("last_login"),
});

// User sessions
export const sessions = pgTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});
```

### Wallets and Transactions

```typescript
// Wallets table
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  address: text("address").notNull().unique(),
  label: text("label"),
  type: text("type").default("wallet"),
  firstSeen: timestamp("first_seen").defaultNow(),
  lastActivity: timestamp("last_activity"),
  lastFetched: timestamp("last_fetched"),
  riskScore: integer("risk_score"),
  isMonitored: boolean("is_monitored").default(false),
  userId: integer("user_id").references(() => users.id),
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  signature: text("signature").notNull().unique(),
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address").notNull(),
  amount: numeric("amount"),
  timestamp: timestamp("timestamp").notNull(),
  transactionType: text("transaction_type"),
  program: text("program"),
  status: text("status").default("confirmed"),
  blockNumber: bigint("block_number", { mode: "number" }),
  slot: bigint("slot", { mode: "number" }),
  memo: text("memo"),
  raw: jsonb("raw"),
});
```

### Visualizations and Collaboration

```typescript
// Visualizations table
export const visualizations = pgTable("visualizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  walletAddress: text("wallet_address").notNull(),
  config: jsonb("config").notNull(),
  description: text("description"),
  userId: integer("user_id").references(() => users.id),
  dateRange: jsonb("date_range"),
  amountRange: jsonb("amount_range"),
  transactionTypes: jsonb("transaction_types"),
  programs: jsonb("programs"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isPublic: boolean("is_public").default(false),
  shareToken: text("share_token").unique(),
  lastViewed: timestamp("last_viewed"),
});

// Teams table
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Team members
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").default("member").notNull(),
  addedAt: timestamp("added_at").defaultNow(),
  lastActive: timestamp("last_active"),
});

// Team visualizations
export const teamVisualizations = pgTable("team_visualizations", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  visualizationId: integer("visualization_id").references(() => visualizations.id).notNull(),
  addedAt: timestamp("added_at").defaultNow(),
});

// Comments/Annotations
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  visualizationId: integer("visualization_id").references(() => visualizations.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  referencedNodeAddress: text("referenced_node_address"),
  referencedTransactionSignature: text("referenced_transaction_signature"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
  parentId: integer("parent_id").references(() => comments.id),
});
```

### Entity Analysis Tables

```typescript
// Entity labels
export const entities = pgTable("entities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  logo: text("logo"),
  website: text("website"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
  isVerified: boolean("is_verified").default(false),
});

// Wallet-entity relationships
export const walletEntityRelations = pgTable("wallet_entity_relations", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").references(() => wallets.id).notNull(),
  entityId: integer("entity_id").references(() => entities.id).notNull(),
  confidence: numeric("confidence"),
  source: text("source"),
  addedAt: timestamp("added_at").defaultNow(),
  addedById: integer("added_by_id").references(() => users.id),
});

// Activity patterns
export const activityPatterns = pgTable("activity_patterns", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").references(() => wallets.id).notNull(),
  patternType: text("pattern_type").notNull(),
  description: text("description"),
  confidence: numeric("confidence"),
  detectedAt: timestamp("detected_at").defaultNow(),
  lastSeen: timestamp("last_seen"),
  occurrences: integer("occurrences").default(1),
  metadata: jsonb("metadata"),
});
```

## Key Components

### Visualization Components

The visualization system centers around a few core components:

1. **FlowVisualization**: Main graph visualization component using D3.js
2. **useVisualization**: Custom hook that encapsulates D3 logic for the visualization
3. **FilterSidebar**: Controls for filtering the visualization
4. **TransactionTimeline**: Chronological view of transactions
5. **EntityClustering**: Visual representation of related wallet clusters

#### FlowVisualization Component

```typescript
// Core visualization component props
interface FlowVisualizationProps {
  graph: VisualizationGraph;
  onNodeClick?: (node: WalletNode) => void;
  onEdgeClick?: (edge: TransactionEdge) => void;
  selectedNode?: WalletNode | null;
  selectedEdge?: TransactionEdge | null;
  filteredWalletAddress?: string | null;
  svgRef?: RefObject<SVGSVGElement>;
}
```

The FlowVisualization component renders an SVG container and delegates the D3 rendering logic to the useVisualization hook. It handles:
- Layout selection (force-directed, radial, hierarchical)
- Zoom and pan controls
- Node and edge selection
- Export and sharing functionality

#### useVisualization Hook

This custom hook handles the D3.js integration:
- Creates and updates the force-directed graph
- Implements different layout algorithms
- Handles zoom and pan behavior
- Manages node and edge styling
- Implements interactive behaviors (click, double-click)

### Collaboration Components

The collaboration system consists of:

1. **TeamCollaboration**: Team management interface
2. **VisualizationAnnotation**: Annotation and commenting system
3. **WebSocket Integration**: Real-time updates and presence tracking

#### WebSocket Architecture

The WebSocket system enables real-time collaboration through:
1. **Server-side WebSocket Hub**: Manages connections and broadcasts updates
2. **Client-side WebSocket Consumer**: Connects to the server and handles updates
3. **Visualization-specific Channels**: Group users by visualization ID

Key WebSocket message types:
- `join-visualization`: User joins a visualization session
- `leave-visualization`: User leaves a visualization session
- `cursor-update`: User cursor position updates
- `active-users`: List of active users in a visualization
- `new-annotation`: Notification of new annotation
- `annotation-update`: Notification of updated annotation

## Data Fetching and State Management

### API Integration

The application uses TanStack Query (React Query) for data fetching and caching:

1. **QueryClient Configuration**: Set up in `client/src/lib/queryClient.ts`
2. **API Request Utility**: Standardized fetch wrapper with error handling
3. **Custom Query Hooks**: Component-specific data fetching hooks

Example query hook:
```typescript
function useWallet({ address }: { address: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/wallets', address],
    enabled: !!address,
  });
  
  return {
    wallet: data?.wallet,
    transactions: data?.transactions,
    isLoading,
    error,
    isValidAddress: !!data
  };
}
```

### State Management

The application uses a combination of state management approaches:

1. **Local Component State**: For UI-specific state
2. **TanStack Query Cache**: For server data
3. **Context API**: For application-wide state (authentication, theme)
4. **URL State**: For shareable application state (current wallet, filters)

## Authentication and Authorization

### Authentication Flow

1. **Login Process**:
   - Client submits credentials to `/api/auth/login`
   - Server validates credentials with Passport.js
   - On success, user session is established
   - User data is returned to client

2. **Session Management**:
   - Express-session with PostgreSQL session store
   - Session data stored in database
   - Session cookie sent with each request

3. **Authorization Checks**:
   - Route middleware validates user authentication
   - Role-based checks for team access
   - Ownership validation for resources

```typescript
// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
};

// Resource ownership middleware
const isVisualizationOwner = async (req: Request, res: Response, next: Function) => {
  const visualizationId = parseInt(req.params.id);
  const visualization = await storage.getVisualization(visualizationId);
  
  if (!visualization) {
    return res.status(404).json({ message: "Visualization not found" });
  }
  
  if (visualization.userId !== req.user.id) {
    return res.status(403).json({ message: "Not authorized" });
  }
  
  next();
};
```

## Blockchain Integration

### Solana API Integration

The application integrates with the Solana blockchain through:

1. **Connection Setup**:
   ```typescript
   import { Connection } from '@solana/web3.js';
   
   export function getSolanaConnection(): Connection {
     const endpoint = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
     return new Connection(endpoint);
   }
   ```

2. **Transaction Fetching**:
   ```typescript
   async function fetchTransactionsForWallet(address: string): Promise<Transaction[]> {
     const connection = getSolanaConnection();
     const publicKey = new PublicKey(address);
     
     // Fetch signatures
     const signatures = await connection.getSignaturesForAddress(
       publicKey,
       { limit: 100 }
     );
     
     // Fetch transaction details
     const transactionDetails = await connection.getParsedTransactions(
       signatures.map(sig => sig.signature)
     );
     
     // Transform and store transactions
     // ...
   }
   ```

3. **Data Processing**:
   - Parse raw transaction data
   - Extract sender, receiver, amounts
   - Identify transaction types
   - Calculate relationships between wallets

## Performance Optimizations

The application implements several performance optimizations:

1. **Data Pagination**: Limit transaction fetching to manageable chunks
2. **Lazy Loading**: Defer loading of visualization data until needed
3. **Memoization**: Cache expensive computations using useMemo and useCallback
4. **Virtualization**: Render only visible elements in large lists
5. **Code Splitting**: Dynamically import components when needed
6. **Progressive Rendering**: Show core UI quickly and load details progressively

## Error Handling

The application implements a comprehensive error handling strategy:

1. **Client-side Error Boundaries**: Catch and display React rendering errors
2. **API Error Handling**: Standardized error responses with appropriate status codes
3. **Form Validation**: Client-side validation using Zod schemas
4. **Graceful Degradation**: Fallback UI when components fail
5. **Error Logging**: Track and report errors for debugging

## Testing Strategy

The application follows a multi-layered testing approach:

1. **Unit Tests**: Test individual functions and hooks
2. **Component Tests**: Test UI components in isolation
3. **Integration Tests**: Test components working together
4. **API Tests**: Test backend endpoints
5. **End-to-End Tests**: Test complete application flows

## Deployment

The application is configured for deployment on Replit:

1. **Build Process**:
   - Vite builds optimized client assets
   - Server compiled with TypeScript
   - Static assets served from server/public directory

2. **Environment Configuration**:
   - Environment variables for sensitive configuration
   - Database connection parameters
   - Solana RPC endpoint configuration

3. **Database Migrations**:
   - Schema changes managed through Drizzle ORM
   - Push-based migration strategy

## Development Workflow

### Setting Up the Development Environment

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables:
   ```
   DATABASE_URL=postgresql://user:password@host:port/database
   SOLANA_RPC_URL=https://your-solana-rpc-endpoint
   ```
4. Start the development server: `npm run dev`

### Development Practices

1. **Type Safety**: Use TypeScript for all code
2. **Code Formatting**: Follow consistent formatting with Prettier
3. **Linting**: Enforce code quality with ESLint
4. **Commit Conventions**: Use conventional commits
5. **Pull Request Process**: Code reviews for all changes

## Appendix

### API Endpoints

The API provides these main endpoint groups:

1. **Authentication**:
   - `POST /api/auth/login`: Log in a user
   - `POST /api/auth/logout`: Log out the current user
   - `GET /api/auth/user`: Get the current user

2. **Wallets**:
   - `GET /api/wallets/:address`: Get wallet details
   - `GET /api/wallets/:address/transactions`: Get wallet transactions

3. **Visualizations**:
   - `GET /api/visualizations`: List user visualizations
   - `GET /api/visualizations/:id`: Get visualization details
   - `POST /api/visualizations`: Create a visualization
   - `PATCH /api/visualizations/:id`: Update a visualization
   - `DELETE /api/visualizations/:id`: Delete a visualization

4. **Teams**:
   - `GET /api/teams`: List user teams
   - `POST /api/teams`: Create a team
   - `GET /api/teams/:id`: Get team details
   - `PATCH /api/teams/:id`: Update a team
   - `DELETE /api/teams/:id`: Delete a team
   - `GET /api/teams/:id/members`: List team members
   - `POST /api/teams/:id/members/invite`: Invite a team member
   - `PATCH /api/teams/:id/members/:memberId`: Update member role
   - `DELETE /api/teams/:id/members/:memberId`: Remove a member

5. **Annotations**:
   - `GET /api/visualizations/:id/annotations`: List annotations
   - `POST /api/visualizations/:id/annotations`: Create an annotation
   - `PATCH /api/annotations/:id`: Update an annotation
   - `DELETE /api/annotations/:id`: Delete an annotation
   - `POST /api/annotations/:id/replies`: Reply to an annotation

### Solana Transaction Processing

The application processes Solana transactions in several steps:

1. **Fetch Transaction Signatures**: Get recent transaction signatures for a wallet
2. **Fetch Transaction Details**: Get parsed transaction data for each signature
3. **Extract Relevant Information**:
   - Sender and receiver addresses
   - Transaction amount and token type
   - Program ID to determine transaction type
   - Timestamp and block information

4. **Process Instruction Data**: Different instructions require specific parsing:
   - System Program transfers
   - Token Program transfers
   - Swap operations
   - NFT transactions
   - DeFi interactions

5. **Build Transaction Graph**:
   - Create nodes for wallets
   - Create edges for transactions
   - Calculate edge weights based on amounts
   - Apply layout algorithms

### WebSocket Protocol

The WebSocket implementation uses a simple message protocol:

```typescript
interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

// Example message types
interface JoinVisualizationMessage extends WebSocketMessage {
  type: 'join-visualization';
  visualizationId: number;
  userId: number;
  username: string;
}

interface CursorUpdateMessage extends WebSocketMessage {
  type: 'cursor-update';
  visualizationId: number;
  userId: number;
  position: { x: number; y: number };
}

interface NewAnnotationMessage extends WebSocketMessage {
  type: 'new-annotation';
  visualizationId: number;
  annotationId: number;
  userId: number;
  username: string;
}
```

These messages are serialized as JSON for transmission over the WebSocket connection.